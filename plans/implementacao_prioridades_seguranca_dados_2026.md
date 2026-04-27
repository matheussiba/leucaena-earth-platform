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

**Tarefas sugeridas:**

1. Escolher destino: **Cloudflare R2**, **Backblaze B2** ou **AWS S3** (compatível com SDK S3).
2. Adicionar variáveis de ambiente (exemplos, nomes ajustáveis):
   - `BACKUP_REMOTE_ENABLED=1`
   - `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY`, `BACKUP_S3_PREFIX=leucaena-db/`
3. Após `fs.copyFileSync` bem-sucedido em `createBackup()`, enviar o mesmo arquivo para o bucket (multipart se > 5MB).
4. Política de lifecycle no bucket: retenção N dias (ex.: 90) + opcionalmente Glacier para arquivo mensal.
5. Alerta: se upload falhar 3x seguidas, log + email opcional ao super admin (ou webhook Slack/Discord).
6. Documentar em `README.md` ou `.env.example` apenas os **nomes** das variáveis (sem valores).

**Critérios de aceite:**

- [ ] Backup local continua funcionando como hoje.
- [ ] Novo backup aparece no bucket com timestamp no nome.
- [ ] Restauração documentada: baixar objeto + substituir DB em ambiente de teste + smoke test.
- [ ] Falha de rede não corrompe o arquivo local.

**Estimativa:** 1–2 dias (inclui configuração de conta e testes).

**Dependências:** conta cloud + credenciais.

---

## Fase 2 — Soft-delete e histórico de polígonos

**Objetivo:** nenhum polígono “some” sem rastro; recuperação administrativa; base para auditoria científica.

**Contexto atual:** `DELETE /api/polygons/:id` remove linha de `polygons` (hard delete). Já existe padrão análogo com `point_deletions` para pontos — replicar conceito.

**Tarefas sugeridas:**

1. **Schema** (`db.js`):
   - Tabela `polygon_deletions` (espelho dos campos relevantes de `polygons` + `deleted_by`, `deleted_at`, `delete_reason` opcional).
   - Opcional: tabela `polygon_history` com `polygon_id`, `version`, `geometry_json`, `updated_by`, `updated_at` (preenchida em `PUT` de geometria).
2. **API:**
   - Trocar `DELETE` por soft-delete (`deleted_at` em `polygons`) **ou** mover linha para `polygon_deletions` e remover de `polygons` (escolha uma; soft-delete na mesma tabela simplifica queries com `WHERE deleted_at IS NULL`).
   - Ajustar **todas** as queries de listagem/export para filtrar `deleted_at IS NULL`.
   - `POST /api/admin/polygons/:id/restore` (super admin): limpar `deleted_at` ou recriar a partir de `polygon_deletions`.
3. **UI:** confirmação antes de apagar; toast “movido para lixeira” se aplicável; painel admin “Polígonos apagados (últimos N)” com restaurar.
4. **Logs:** `logActivity` em delete/restore com `req`.

**Critérios de aceite:**

- [ ] Polígono “apagado” não aparece no mapa nem no export padrão.
- [ ] Super admin consegue restaurar dentro de janela definida (ou indefinida, documentada).
- [ ] Não há regressão em contagens de área / ranking por usuário.

**Estimativa:** 2–4 dias (depende do número de endpoints que leem `polygons`).

**Dependências:** Fase 1 recomendada antes (backup) para rollback rápido se algo der errado.

---

## Fase 3 — Validação de geometria no servidor

**Objetivo:** rejeitar ou corrigir geometrias inválidas antes de persistir; reduzir lixo no dataset.

**Contexto atual:** validação geométrica robusta no servidor não foi localizada de forma centralizada; o cliente pode ser contornado.

**Tarefas sugeridas:**

1. Adicionar dependência **Turf.js** (ou equivalente) no servidor: `@turf/boolean-valid`, `@turf/area`, `@turf/boolean-point-in-polygon`, `@turf/unkink-polygon` (se desejar auto-correção de self-intersection).
2. Criar módulo `geometryValidate.js` (ou funções em `server.js` se preferir mínimo de arquivos) com:
   - Polígono fechado, mínimo de vértices, remoção de vértices duplicados consecutivos.
   - `booleanValid` → se false, tentar `unkink` ou retornar 400 com mensagem clara.
   - Área em ha: limites configuráveis por env (`POLYGON_MIN_AREA_HA`, `POLYGON_MAX_AREA_HA`) com defaults sensatos.
   - Opcional: vértice deve estar **dentro** ou **tocando** o bbox da célula em edição (exige passar `grid_cell_id` no payload ou inferir do contexto).
3. Invocar em `POST/PUT` de polígono **antes** do `INSERT`/`UPDATE`.
4. Testes unitários com fixtures (polígono válido, bow-tie, buraco mal formado se suportado).

**Critérios de aceite:**

- [ ] GeoJSON claramente inválido retorna 400 com mensagem i18n-friendly.
- [ ] Polígonos válidos existentes não quebram (testar amostra do DB real em staging).
- [ ] Documentar limites no guia “Como mapear”.

**Estimativa:** 2–3 dias.

**Dependências:** nenhuma obrigatória; combina bem com Fase 2 (histórico guarda tentativas rejeitadas se quiser logar em `activity_logs`).

---

## Fase 4 — LGPD / privacidade / termos / direitos do titular

**Objetivo:** conformidade mínima com LGPD (Brasil) para dados pessoais e localização.

**Contexto atual:** coleta de nome, e-mail, logs com contexto de dispositivo/IP mascarado etc. Falta fluxo explícito de consentimento e políticas acessíveis.

**Tarefas sugeridas:**

1. Páginas estáticas ou rotas: `/privacidade`, `/termos` (conteúdo jurídico — pode ser rascunho revisado por advogado).
2. No **registro**: checkbox obrigatório “Li e aceito a Política de Privacidade e os Termos” + gravar `terms_accepted_at`, `terms_version` na tabela `users`.
3. **Export de dados** (art. 18 LGPD): `GET /api/me/data-export` → JSON com perfil, polígonos, pontos, mensagens visíveis ao usuário.
4. **Exclusão de conta:** fluxo autenticado (com confirmação) + anonimização ou remoção em cascata conforme política definida.
5. **Registro de atividades:** documentar no rodapé o que é logado e por quanto tempo (alinhado à Fase 8).

**Critérios de aceite:**

- [ ] Novo usuário não cadastra sem aceite registrado.
- [ ] Links de privacidade/termos visíveis no login/registro e no rodapé.
- [ ] Export funciona e arquivo não vaza dados de terceiros.

**Estimativa:** 3–5 dias (+ revisão jurídica externa, fora do escopo técnico).

**Dependências:** definição de política de retenção (articula com Fase 8).

---

## Fase 5 — Observabilidade de erros (Sentry ou similar)

**Objetivo:** erros 500 e exceções não tratadas visíveis antes do usuário reclamar.

**Tarefas sugeridas:**

1. Conta Sentry (ou GlitchTip self-hosted).
2. `@sentry/node` no `server.js` (inicialização cedo, `tracesSampleRate` baixo no free tier).
3. `@sentry/browser` no front (opcional) ou apenas `window.onerror` → `/api/log` se já existir pipeline.
4. Filtrar PII: não enviar `Authorization` header, sanitizar body de login.

**Critérios de aceite:**

- [ ] Erro forçado em staging aparece no painel.
- [ ] Deploy em produção não quebra se `SENTRY_DSN` estiver vazio.

**Estimativa:** 0,5–1 dia.

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

## Fase 7 — Locks de célula e limpeza periódica

**Objetivo:** células não ficarem bloqueadas indefinidamente após queda de rede.

**Contexto atual:** `LOCK_TIMEOUT_MS` e lógica de expiração existem em `server.js`; validar se a limpeza roda em **intervalo** confiável (não só sob uma rota raramente chamada).

**Tarefas sugeridas:**

1. Auditar onde `locked_at` é comparado ao cutoff e garantir `setInterval` ou cron interno (ex.: a cada 5 min).
2. Log de `logActivity` quando lock expira automaticamente (opcional: `cell_lock_expired`).
3. UI: mensagem clara quando célula foi liberada por timeout.

**Critérios de aceite:**

- [ ] Simular cliente morto: após timeout, outro usuário consegue lock.
- [ ] Não libera célula com edição ativa (se houver heartbeat — definir regra).

**Estimativa:** 0,5–1,5 dias.

---

## Fase 8 — Retenção e arquivamento de `activity_logs`

**Objetivo:** banco não crescer sem limite; compliance com política de retenção.

**Tarefas sugeridas:**

1. Definir política (ex.: 90 dias online, depois gzip para objeto S3 ou descarte).
2. Job periódico: `SELECT` em lotes → gzip → upload → `DELETE` com limite de linhas por execução.
3. Métrica simples: contagem de linhas antes/depois logada.

**Critérios de aceite:**

- [ ] Job idempotente e seguro em restart.
- [ ] Documentado no texto de privacidade (Fase 4).

**Estimativa:** 1–2 dias.

**Dependências:** Fase 1 útil para guardar arquivo de arquivo morto.

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
