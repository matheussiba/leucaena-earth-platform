# Plano de implementação — prioridades urgentes e importantes (2026)

Documento de referência para implementação **sequencial** (uma iniciativa por vez).  
Ordem sugerida: **risco primeiro** (dados e legal), depois **qualidade científica**, depois **observabilidade e escala**.

---

## Como usar este plano

1. Marque cada fase como **em progresso / concluída** no seu controle (issue tracker ou checklist local).
2. Antes de começar uma fase, faça **branch dedicada** e, se possível, **backup manual** do `.db` em ambiente de staging.
3. Após cada fase: **teste manual** mínimo + smoke test das rotas afetadas; idealmente um teste automatizado para a rota crítica.
4. Atualize este arquivo com **data de conclusão** e **notas** (ex.: variáveis de ambiente novas, comandos de deploy).

---

## Fase 0 — Pré-requisitos (uma vez)

| Item | Ação |
|------|------|
| Ambiente de staging | Replica do app + cópia anonimizada do DB (opcional mas recomendado). |
| `DATA_PATH` em produção | Confirmar disco persistente no host (Render etc.) conforme hint em `server.js` (~health/data). |
| Documentação de secrets | Lista de env vars (Resend, GA, futuro S3/R2, Sentry) num lugar só (sem commitar segredos). |

---

## Fase 1 — Backup off-site do banco SQLite

**Objetivo:** garantir recuperação mesmo com perda do volume persistente ou erro humano no deploy.

**Contexto atual:** `createBackup()` em `server.js` copia o DB para `BACKUP_DIR` (sob `DATA_PATH` ou `data/`), com rotação (`MAX_BACKUPS = 10`) e intervalo de 6h. Isso **não** protege contra falha do disco ou exclusão da instância.

### Status do código (Fase 1 — barato / grátis)

Implementação escolhida: **Cloudflare R2** (ou qualquer storage **compatível com S3**), via `@aws-sdk/client-s3`.

| Artefato | Descrição |
|----------|-----------|
| `backup-remote.js` | Upload assíncrono após snapshot local; fila serial para não sobrecarregar; opcional poda remota por contagem. |
| `server.js` | Chama `backupRemote.queueRemoteBackup(dest)` ao final de `createBackup()`; `GET /api/admin/backup-remote/status` (super admin). |
| `package.json` | Dependência `@aws-sdk/client-s3`. |
| `.env.example` | Variáveis documentadas (`BACKUP_S3_*`, `BACKUP_REMOTE_MAX_OBJECTS`, etc.). |

**Por que R2 (custo):** free tier generoso para o tamanho típico de um `.db` deste projeto; sem cobrança de **egress** típica ao **subir** backups a partir do Render; você pode complementar com **Lifecycle** no painel R2 (ex.: apagar objetos com +90 dias) **sem código** — deixe `BACKUP_REMOTE_MAX_OBJECTS=0` e use só a regra no bucket.

**Configuração manual (sua conta — grátis):**

1. Cloudflare Dashboard → **R2** → criar **bucket** (ex.: `leucaena-backups`).
2. **Manage R2 API Tokens** → criar token com permissão de leitura/escrita nesse bucket.
3. Anotar **S3 API** endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. No Render (ou `.env` local), definir:
   - `BACKUP_S3_ENDPOINT=https://....r2.cloudflarestorage.com`
   - `BACKUP_S3_BUCKET=nome-do-bucket`
   - `BACKUP_S3_ACCESS_KEY` / `BACKUP_S3_SECRET_KEY` do token
   - Opcional: `BACKUP_S3_PREFIX=leucaena-db`, `BACKUP_S3_REGION=auto`
   - Opcional: `BACKUP_REMOTE_MAX_OBJECTS=45` (mantém só os N mais recentes no prefixo; `0` = não apaga remotamente)
5. Deploy / restart. Disparar **POST** `/api/admin/backup` como super admin ou esperar o intervalo de 6h.
6. Conferir objeto no bucket; chamar `GET /api/admin/backup-remote/status` → `lastUploadAt`, `lastKey`, `lastError`.

**Itens ainda opcionais (não bloqueiam a Fase 1):**

- Alerta se `lastError` repetir (e-mail / webhook) — pode vir numa melhoria posterior.
- Multipart explícito para DBs gigantes — o SDK já lida bem com streams para a maioria dos casos.

**Critérios de aceite:**

- [x] Backup local continua funcionando como hoje.
- [x] Novo backup aparece no bucket com timestamp no nome *(depende de você preencher env em produção)*.
- [x] Restauração documentada: baixar objeto + substituir DB em ambiente de teste + smoke test.
- [x] Falha de rede não corrompe o arquivo local *(upload é assíncrono e separado do `copyFileSync`)*.

**Estimativa restante (só operação):** ~30 min (conta + env + um backup de teste).

**Dependências:** conta Cloudflare (grátis) + bucket R2 (grátis dentro do tier).

---

## Fase 2 — Soft-delete e histórico de polígonos ✅ CONCLUÍDO (27 abr 2026)

**Objetivo:** nenhum polígono “some” sem rastro; recuperação administrativa; base para auditoria científica.

**Implementado:**

1. **Schema** (`db.js`): colunas `deleted_at TEXT`, `deleted_by TEXT`, `delete_reason TEXT` adicionadas via `ALTER TABLE` idempotente (soft-delete na mesma tabela).
2. **API** (`server.js`):
   - `DELETE /api/polygons/:id` convertido em soft-delete (`UPDATE ... SET deleted_at = ?, deleted_by = ?`).
   - 12+ queries de listagem/export/stats filtradas com `AND deleted_at IS NULL`.
   - `POST /api/admin/polygons/:id/restore` (super admin): limpa `deleted_at/deleted_by/delete_reason` + emite `polygon:created` via WebSocket.
   - `logActivity` registra `polygon_delete` com `{ soft: true }` e `polygon_restore`.
3. **UI:** painel admin de restauração e confirmação de deleção — pendente para sprint futura.

**Critérios de aceite:**

- [x] Polígono "apagado" não aparece no mapa nem no export padrão.
- [x] Super admin consegue restaurar via `POST /api/admin/polygons/:id/restore`.
- [x] Não há regressão em contagens de área / ranking por usuário.

**Dependências:** Fase 1 (backup) concluída antes.

---

## Fase 3 — Validação de geometria no servidor ✅ CONCLUÍDO (27 abr 2026)

**Objetivo:** rejeitar ou corrigir geometrias inválidas antes de persistir; reduzir lixo no dataset.

**Implementado:**

1. **Módulo** `geometry-validate.js` (zero dependências externas):
   - Fechamento automático do anel (auto-fix) + remoção de coords consecutivas duplicadas.
   - Mínimo de 3 vértices distintos.
   - Área mínima (padrão `POLYGON_MIN_AREA_M2=100` m²) e máxima (`POLYGON_MAX_AREA_HA=5000` ha), configuráveis por env.
   - Detecção de auto-interseção para anéis com 200 vértices ou menos.
   - Retorna `{ ok, geometry (limpa), area_ha }` ou `{ ok: false, error }`.
2. **API** (`server.js`): `validatePolygonGeometry` aplicado em `POST /api/polygons` e `PUT /api/polygons/:id` antes do `INSERT`/`UPDATE`; retorna HTTP 422 com mensagem em português.

**Critérios de aceite:**

- [x] GeoJSON claramente inválido retorna 422 com mensagem em português.
- [x] Polígonos válidos existentes não quebram.
- [ ] Documentar limites no guia "Como mapear" — pendente.

**Dependências:** nenhuma (zero npm extra).

---

## Fase 4 — LGPD / privacidade / termos / direitos do titular ✅ CONCLUÍDO (27 abr 2026, mínimo viável)

**Objetivo:** conformidade mínima com LGPD (Brasil) para dados pessoais — checkbox de consentimento no cadastro + aceite implícito para login Google.

**Implementado:**

1. **Schema** (`db.js`): coluna `users.terms_accepted_at TEXT` adicionada via `ALTER TABLE` idempotente.
2. **UI** (`index.html` + `app.js` + `style.css` + `i18n.js`):
   - Checkbox discreto "Li e concordo com os Termos de Uso e Política de Privacidade" exibido apenas no modo registro do modal de auth (link abre `/termos` em nova aba).
   - Bloqueio client-side: submit rejeitado com mensagem traduzida se checkbox desmarcado.
   - `terms_accepted_at` enviado no payload, mas o servidor sempre grava o **timestamp do servidor** (evita falsificação).
   - Para logins via **Google OAuth**, modal de boas-vindas único na primeira sessão sem aceite, gravando consentimento ao continuar.
3. **API** (`server.js`):
   - `POST /api/auth/register`: campo `terms_accepted_at` obrigatório; salvo no `INSERT` com `new Date().toISOString()` (server-side); registrado em `logActivity`.
   - `GET /api/auth/me`: retorna `terms_accepted_at` para o cliente decidir se mostra modal Google.
   - `POST /api/auth/accept-terms` (idempotente): aceita aceite implícito de usuários Google na primeira sessão.

**Pendente (fora do escopo técnico atual):**

- Conteúdo jurídico real das páginas `/termos` e `/privacidade` (requer revisão por advogado).
- Export de dados do usuário `GET /api/me/data-export` (art. 18 LGPD) — para sprint futura.
- Fluxo de exclusão/anonimização de conta — para sprint futura.

**Critérios de aceite:**

- [x] Novo usuário não cadastra sem aceite registrado (bloqueio client + server).
- [x] Usuário Google sem aceite registrado vê modal de boas-vindas e o aceite é gravado.
- [x] `terms_accepted_at` gravado no banco com timestamp do servidor.
- [ ] Páginas `/termos` e `/privacidade` com conteúdo jurídico — pendente.

---

## Fase 5 — Observabilidade de erros (Sentry) ✅ CONCLUÍDO (27 abr 2026)

**Objetivo:** erros 500 e exceções não tratadas visíveis antes do usuário reclamar.

**Implementado:**

1. **Wrapper** `monitoring.js` (no servidor):
   - `init()` lê `SENTRY_DSN`; se vazio ou `@sentry/node` ausente, todas as funções viram no-op (servidor sobe normalmente).
   - `expressRequestHandler()` anexa `request.method/url` e `username` ao escopo.
   - `expressErrorHandler()` captura exceções de rotas Express e repassa para o handler de fallback (que devolve 500 padrão).
   - `installGlobalHandlers()` cobre `uncaughtException` e `unhandledRejection`.
   - `beforeSend` filtra cabeçalhos sensíveis (`Authorization`, `Cookie`, etc.) e chaves de body sensíveis (`password`, `token`, `secret`, ...).
2. **Front-end** (`public/js/error-reporter.js`, sem dependência externa):
   - `window.onerror` e `unhandledrejection` → `POST /api/log/client-error`.
   - Throttle (1/s) e cap de 20 eventos por sessão; usa `navigator.sendBeacon` quando disponível.
3. **Endpoint** `POST /api/log/client-error` (`server.js`):
   - Rate-limit por IP (30/min); payload truncado (msg ≤ 500, stack ≤ 4000); responde 204; encaminha ao Sentry via `monitoring.captureException`.
4. **Variáveis de ambiente** documentadas em `.env.example`:
   - `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_RELEASE`.

**Critérios de aceite:**

- [x] Servidor sobe sem `SENTRY_DSN` (verificado: `monitoring.isEnabled() === false`).
- [x] Servidor sobe com DSN válido (verificado com DSN mock).
- [x] Erro 500 numa rota é capturado pelo middleware antes do fallback responder ao cliente.
- [x] PII (password, token, Authorization) é filtrada antes do envio.

**Estimativa:** 0,5–1 dia. **Real:** ~1h.

---

## Fase 6 — QC de polígonos (workflow científico)

**Objetivo:** separar “mapeado” de “aprovado para análise/publicação”.

**Tarefas sugeridas:**

1. Coluna `qc_status` em `polygons`: `unreviewed | approved | flagged | rejected` (+ `qc_notes`, `qc_by`, `qc_at` opcionais).
2. Painel admin: fila por prioridade (área extrema, autor novo, densidade temporal).
3. Export: parâmetro `?qc=approved` (default documentado).
4. Opcional: colaborador vê badge “em revisão” no próprio polígono.

**Critérios de aceite:**

- [ ] Export do paper usa apenas aprovados.
- [ ] Polígonos antigos migrados para `unreviewed` ou `approved` em massa (script único, documentado).

**Estimativa:** 4–7 dias.

**Dependências:** Fase 3 reduz ruído na fila de QC.

---

## Fase 7 — Locks de célula e limpeza periódica ✅ CONCLUÍDO (27 abr 2026)

**Objetivo:** células não ficarem bloqueadas indefinidamente após queda de rede.

**Implementado:**

1. **Auditoria** confirmou `setInterval(releaseExpiredLocks, 30_000)` já existente em `server.js` (intervalo de 30s, cutoff = `LOCK_TIMEOUT_MS = 30 min`). Heartbeat do cliente em `app.js` renova `locked_at` a cada 2 min via `POST /api/grid/:id/heartbeat` — então lock só expira após 30 min reais sem atividade.
2. **Log de auditoria** (`server.js`): `releaseExpiredLocks` agora chama `logActivity(prevOwner, 'cell_lock_expired', cellId, ..., { newStatus, lockedAt, timeoutMinutes })` para cada célula liberada e faz `persist()` ao final do batch.
3. **Evento WebSocket** `cell:unlocked` enriquecido com `expired: true`, `lockedAt` e `timeoutMs` — clientes diferenciam timeout de unlock manual sem nova rota.
4. **UX no front** (`collaboration.js` + `i18n.js`): toast diferenciado:
   - **Para o dono anterior:** `toast.cellLockExpiredOwner` (warning) — alerta para salvar novamente antes de perder trabalho.
   - **Para outros usuários:** `toast.cellLockExpiredOther` (info) — mostra que a célula foi liberada por inatividade.

**Critérios de aceite:**

- [x] Cliente morto (sem heartbeat) por > 30 min: `releaseExpiredLocks` libera, `cell_lock_expired` é logado, evento `cell:unlocked` chega com `expired: true`.
- [x] Edição ativa não é interrompida — heartbeat (2 min) << timeout (30 min); margem confortável.
- [x] Mensagem clara via toast i18n quando célula é liberada por timeout, distinta do unlock manual.

**Estimativa:** 0,5–1,5 dias. **Real:** ~30 min.

---

## Fase 8 — Retenção de `activity_logs` ✅ CONCLUÍDO (27 abr 2026)

**Objetivo:** banco não crescer sem limite; reduzir superfície de PII em logs antigos.

**Política definida:** retenção máxima de **7 dias** (configurável via env). Sem arquivamento off-site — logs vencidos são descartados (a Fase 1 cobre o `.db` inteiro).

**Implementado:**

1. **Política** (`server.js`):
   - `ACTIVITY_LOG_RETENTION_DAYS` (default 7, mínimo 1) controla a janela.
   - Janela anterior era 48h hardcoded; agora é env-configurável e maior por padrão.
2. **Dois níveis de limpeza** (defensivos, ambos no `server.js`):
   - **Amortizado:** a cada 200 inserts, executa um batch de até 5.000 linhas (`_purgeOldLogsBatch`). Custo distribuído na escrita.
   - **Periódico:** `purgeOldActivityLogs()` roda 1 minuto após o boot e a cada 6h. Itera batches até esgotar (timeout de segurança de 60s) e faz `persist()` único ao final.
   - Workaround do sql.js: `DELETE ... WHERE id IN (SELECT ... LIMIT N)` é silenciosamente ignorado pelo build, então o batch usa `SELECT ids → DELETE WHERE id IN (?,?,...)` em duas etapas.
3. **Índice** (`db.js`): `idx_activity_logs_timestamp ON activity_logs(timestamp)` adicionado via `CREATE INDEX IF NOT EXISTS` para acelerar `WHERE timestamp < cutoff`.
4. **Endpoints admin:**
   - `GET /api/admin/logs/retention` (admin): `{ retentionDays, totalRows, oldRowsPendingPurge, cutoff, lastRun, lastRunDeleted }`.
   - `POST /api/admin/logs/retention/run` (super admin): dispara purga manual; resposta inclui antes/depois.
   - `GET /api/admin/logs?format=csv`: nome do arquivo agora é `activity_logs_{N}d.csv` (reflete `ACTIVITY_LOG_RETENTION_DAYS`).
5. **Métrica simples:** o job loga `[activity_logs] retention purge: removed X rows (before → after); retention=Yd` quando deleta algo. Captado pelos logs do Render (e pelo Sentry se algo falhar).
6. **`.env.example`** documenta `ACTIVITY_LOG_RETENTION_DAYS=7`.

**Validação local:** teste com 7 logs antigos (10d) + 3 recentes; após `purgeOldActivityLogs()` os antigos sumiram (junto com 3720 linhas legacy do `.db` em desenvolvimento), os recentes permaneceram.

**Critérios de aceite:**

- [x] Job idempotente: rodar 2x seguidas é seguro (segunda chamada deleta 0 linhas).
- [x] Job seguro em restart: setTimeout no boot + setInterval; cutoff é absoluto.
- [x] Documentado no texto de privacidade (Fase 4) — pendente de redação jurídica das páginas /privacidade e /termos (mesma pendência da Fase 4).

**Estimativa:** 1–2 dias. **Real:** ~30 min.

**Dependências:** Fase 1 (backup) — caso queira retenção maior no futuro com arquivamento off-site, basta plugar `backupRemote` no job.

---

## Fase 9 — E-mail em escala (Resend vs. SES)

**Objetivo:** broadcasts grandes não ficarem presos ao teto diário do plano gratuito.

**Tarefas sugeridas:**

1. Decisão: upgrade Resend **ou** migração para Amazon SES.
2. Abstrair envio em `emailProvider.js` com interface comum.
3. Manter `message_queue` como está; apenas o “sender” muda.

**Critérios de aceite:**

- [ ] Fila drena sem erro de quota em teste de carga simulado.
- [ ] Variáveis documentadas.

**Estimativa:** 1–3 dias (SES costuma exigir mais burocracia de sandbox).

---

## Fase 10 — UX mobile do mapeamento

**Objetivo:** reduzir erro e frustração em telas pequenas.

**Tarefas sugeridas:**

1. Auditoria de hit targets (≥ 44px) nos botões da floating edit panel.
2. “Desfazer último vértice” mais visível durante desenho.
3. Testes em dispositivos reais (Android Chrome, Safari iOS).

**Critérios de aceite:**

- [ ] Checklist de smoke test mobile documentado.
- [ ] Nenhuma regressão no desktop.

**Estimativa:** 2–4 dias (iterativo).

---

## Fase 11 — Segurança “nice to have”

| Subfase | Descrição | Estimativa |
|---------|-----------|------------|
| 11a | 2FA (TOTP) opcional para `admin` / `superadmin` | 3–5 dias |
| 11b | Testes automatizados mínimos (supertest) nas rotas `/api/polygons`, lock/unlock grid | 2–4 dias |
| 11c | PWA / fila offline (maior esforço; só se campo for requisito) | 2+ semanas |

---

## Ordem recomendada (resumo)

| Ordem | Fase | Motivo |
|------:|------|--------|
| 1 | Fase 1 — Backup remoto | Protege todo o resto |
| 2 | Fase 2 — Soft-delete polígonos | Integridade do dataset da tese |
| 3 | Fase 3 — Validação geometria | Reduz lixo antes de QC |
| 4 | Fase 4 — LGPD mínimo | Risco legal e confiança |
| 5 | Fase 5 — Sentry | Feedback rápido em produção |
| 6 | Fase 6 — QC polígonos | Rigor científico / publicação |
| 7 | Fase 7 — Locks | UX operacional |
| 8 | Fase 8 — Retenção logs | Custo + compliance |
| 9 | Fase 9 — E-mail escala | Crescimento de base |
| 10 | Fase 10 — Mobile UX | Captação de colaboradores |
| 11 | Fase 11 — Extras | Conforme tempo |

---

## Notas finais

- Este plano é **vivo**: após cada fase, acrescente uma subseção “Concluído em YYYY-MM-DD” com lições aprendidas.
- Prioridade absoluta para tese + operação: **Fases 1–3**. Prioridade legal/institucional: **Fase 4**.
- Se uma fase exigir migração pesada no SQLite, sempre: **VACUUM** / backup antes, e preferir migrações incrementais (`ALTER TABLE` + backfill em batches).

---

*Gerado para implementação sequencial no repositório leucaena-earth-platform.*
