---
name: Renomear e excluir células
overview: Trocar só o `grid_id` é em geral seguro. Células `no_points` sem máscaras Leucaena nem pontos no recorte são o caso mais tranquilo para apagar, desde que se remova `grid_cell_states` (e locks) na ordem certa. O app usa o `id` numérico, não o nome.
todos: []
isProject: false
---

# Renomear células e apagar células `no_points`

## Como o sistema usa os dados

- **`grid_cells.id`** (inteiro): chave primária usada no mapa (GeoJSON `properties.id`), em URLs `/api/grid/:id/...`, em `polygons.grid_cell_id`, em `grid_cell_states.grid_cell_id`, em logs (`activity_logs.cell_id`). **Não altere o `id` a menos que saiba exatamente o que está fazendo** (quebraria máscaras, locks e colaboração).
- **`grid_cells.grid_id`** (texto, ex.: `828-1-3`): rótulo para UI, busca na sidebar e mensagens. **Renomear só `grid_id` não invalida FKs**; o mapa continua funcionando com o mesmo `id`.

Esquema relevante em [`db.js`](../db.js): `polygons` e `grid_cell_states` têm `FOREIGN KEY (grid_cell_id) REFERENCES grid_cells(id)`. `occurrence_points` **não** tem coluna de célula — pontos são associados às células por **geometria** no servidor.

## Renomear células (`UPDATE grid_id`)

- **Risco baixo** se você mantiver convenções (ex.: não duplicar o mesmo `grid_id` em duas linhas, a menos que queira esse comportamento na busca: hoje a busca pode retornar várias células com o mesmo prefixo).
- Após mudar o nome, usuários que memorizaram o código antigo verão o novo rótulo; caches do browser recarregam com o próximo load do grid (`GET /api/grid`).

## Caso que você descreveu: `no_points`, sem máscaras e sem pontos

Se na prática **não há linhas em `polygons` com aquele `grid_cell_id`** e **nenhum ponto de ocorrência cai dentro da geometria da célula** (o app associa pontos por posição dentro do polígono da célula, não por coluna de FK), então:

- **Risco de dados “presos” na célula** é baixo: não há máscaras a apagar antes do `DELETE`.
- **Ainda é obrigatório** apagar as linhas correspondentes em **`grid_cell_states`** para esse `grid_cell_id`; caso contrário o filtro por UF (`/api/grid?state=...`) pode continuar a incluir um `id` que já não existe em `grid_cells`, ou deixar lixo inconsistente.
- Confirme **`locked_by` e `locked_at` nulos** (ninguém com a célula aberta em edição).
- **Pontos fora do cenário “zero”**: se existir *qualquer* `occurrence_points` cuja coordenada caia dentro do polígono da célula (mesmo camada crowdmapping), apagar a célula não apaga o ponto; ele continua no banco. Só é “sem pontos” no sentido de status/UI se realmente não houver geometria sobreposta — vale uma checagem SQL ou visual antes do delete em massa.

Nesse cenário ideal (zero polígonos, zero pontos na área, sem lock), a sequência reduz-se a: **`DELETE FROM grid_cell_states WHERE grid_cell_id = ?`** → **`DELETE FROM grid_cells WHERE id = ?`** (e nenhuma linha em `polygons` para esse id).

## Excluir células (`DELETE` em `grid_cells`) — caso geral

Aqui **pode dar erro** ou deixar lixo se a ordem estiver errada:

1. **`polygons`**: se existir máscara com `grid_cell_id` apontando para a célula, o SQLite pode **falhar ao apagar a célula** (FK) ou, se FK estiver desligada, ficam **polígonos órfãos** que não aparecem em nenhuma célula no mapa mas ainda ocupam o banco.
2. **`grid_cell_states`**: deve remover as linhas dessa `grid_cell_id`; senão fica estado sem célula (e o filtro por UF usa essa tabela em [`server.js`](../server.js) ~2117–2128).
3. **Locks**: se `locked_by` estiver preenchido, trate como em manutenção (ideal: ninguém editando; ou liberar lock antes).
4. **`activity_logs`**: referências antigas a `cell_id` podem ficar apontando para id inexistente — em geral **não quebra** a app, só histórico.
5. **Pontos**: não são apagados automaticamente ao sumir a célula; continuam no banco. Lógicas que testam “ponto dentro do anel da célula” podem passar a classificar esses pontos em **outra** célula ou em nenhuma, conforme geometria.

**Ordem segura sugerida (transação):** apagar (ou reatribuir) `polygons` da célula → apagar linhas em `grid_cell_states` → `DELETE FROM grid_cells WHERE id = ?`.

## Só mudar status em vez de apagar

Se o objetivo é “não preciso mais de `no_points`” nessa área: **atualizar `grid_status`** (ou remover a célula do recorte exportado e re-seed) costuma ser mais previsível do que apagar linhas em produção, a menos que você queira mesmo reduzir o número de feições no GeoJSON/banco.

## Resposta direta

- **Renomear (`grid_id`)**: pouco risco; cuide de unicidade e de comunicar o novo código.
- **Apagar células `no_points` sem máscaras e sem pontos na geometria**: em geral **não deve dar erro de FK** em `polygons`; o passo crítico é **`grid_cell_states` + lock**. Confirme ausência de pontos por geometria antes de apagar em lote.
- **Apagar células no caso geral** (pode haver máscaras): **pode dar erro de FK** se não apagar `polygons` antes, e **inconsistência** se esquecer `grid_cell_states`. Não há endpoint pronto para cascata; seria SQL/script/manual.

## Como executar remoções ou renomeações em produção (Render)

### Contexto técnico: sql.js e memória

O projeto usa **sql.js**, que carrega o `.db` inteiro para memória no `initDB()`. Qualquer alteração feita **fora** do processo do servidor (ex.: rodar um script no Shell do Render) **será sobrescrita** na próxima vez que o servidor chamar `persist()` — porque a cópia em memória ainda tem os dados antigos. Por isso, alterações na base de produção devem ser feitas **dentro do `initDB()`** (como uma migração de startup).

### Fluxo para remover células

1. **Preparar o GeoJSON** com as features a remover (propriedade `GRID_ID`). Salvar em [`scripts/data/`](../scripts/data/).

2. **Testar localmente** (só no `.db` local):
   ```bash
   node scripts/delete_grid_cells_from_geojson.js scripts/data/<ficheiro>.geojson --dry-run
   node scripts/delete_grid_cells_from_geojson.js scripts/data/<ficheiro>.geojson
   ```

3. **Adicionar migração no `initDB()`** em [`db.js`](../db.js):
   ```js
   // Migration: <descrição curta>
   try {
     const ids = ['grid_id_1', 'grid_id_2', ...];
     const ph = ids.map(() => '?').join(',');
     const hits = db.exec(`SELECT id FROM grid_cells WHERE grid_id IN (${ph})`, ids);
     if (hits.length > 0 && hits[0].values.length > 0) {
       const cellIds = hits[0].values.map(r => r[0]);
       const idPh = cellIds.map(() => '?').join(',');
       db.run(`DELETE FROM polygons WHERE grid_cell_id IN (${idPh})`, cellIds);
       db.run(`DELETE FROM grid_cell_states WHERE grid_cell_id IN (${idPh})`, cellIds);
       db.run(`DELETE FROM grid_cells WHERE id IN (${idPh})`, cellIds);
       console.log(`Migration: removed ${cellIds.length} cells`);
     }
   } catch (e) { console.error('Migration error:', e.message); }
   ```
   A migração é **idempotente**: se as células já não existirem, não faz nada.

4. **Commit + push** para `main` — o Render faz deploy automático e a migração corre no startup.

5. **Verificar** no Shell do Render (opcional):
   ```bash
   node -e "const {initDB,queryAll}=require('./db'); initDB().then(()=>console.log('total:', queryAll('SELECT COUNT(*) as c FROM grid_cells')[0].c))"
   ```

### Fluxo para renomear `grid_id`

Mesma lógica de migração em `initDB()`, mas com `UPDATE`:
```js
// Migration: rename grid_id 'OLD' → 'NEW'
try {
  db.run("UPDATE grid_cells SET grid_id = ? WHERE grid_id = ?", ['NEW', 'OLD']);
} catch (e) { /* ignore */ }
```

### Checklist antes de apagar células com máscaras

Se a célula **tem** linhas em `polygons`:
- [ ] Apagar `polygons` primeiro (ou o DELETE em `grid_cells` falha por FK)
- [ ] Apagar `grid_cell_states`
- [ ] Confirmar `locked_by IS NULL`
- [ ] Verificar `activity_logs` (referências a `cell_id` ficam órfãs mas não quebram a app)
- [ ] `occurrence_points` por geometria — pontos não são apagados; podem migrar para outra célula adjacente

### Histórico de migrações

| Data       | Descrição                              | Células | Commit   |
|------------|----------------------------------------|---------|----------|
| 2026-04-11 | Remover 42 sea tiles `no_points` em SP | 42      | `735a062`|

### Ferramentas disponíveis

- **Script genérico:** [`scripts/delete_grid_cells_from_geojson.js`](../scripts/delete_grid_cells_from_geojson.js) — para testes locais e dry-run.
- **GeoJSON versionado:** [`scripts/data/tiles_to_remove_in_sp.geojson`](../scripts/data/tiles_to_remove_in_sp.geojson) — lista das 42 tiles do mar removidas.

### Versionamento (Git)

A pasta **`plans/`** permanece listada no [`.gitignore`](../.gitignore) para não versionar ficheiros locais gerados aí. Para **incluir só este documento** no repositório sem alterar o ignore, use força no add:

```bash
git add -f plans/renomear_e_excluir_celulas.md
```

Depois faça o commit normalmente. Não é necessário remover `plans/` do `.gitignore`.
