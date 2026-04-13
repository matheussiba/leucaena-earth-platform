# Sistema de Grid Hierárquico — leucaena.earth

## Visão geral

O grid do leucaena.earth cobre o território brasileiro com células de diferentes
resoluções. Cada célula recebe um **grid_id hierárquico** que codifica sua
posição geográfica e nível de subdivisão.

## Hierarquia de resoluções

O grid é organizado em 4 níveis, do mais grosseiro ao mais fino:

| Nível | Nome | Tamanho da célula | Subdivisões |
|-------|------|-------------------|-------------|
| 1 | **4dd** | 4 × 4 graus decimais | Nível raiz — cada célula 4dd contém até 4 células 2dd |
| 2 | **2dd** | 2 × 2 graus decimais | Cada célula 2dd contém até 4 células 1dd |
| 3 | **1dd** | 1 × 1 grau decimal | Cada célula 1dd contém até 4 células 05dd |
| 4 | **05dd** | 0.5 × 0.5 grau decimal | Nível mais fino |

Cada nível divide a célula-pai em **4 quadrantes**, numerados de **1 a 4**.

```
          Célula 4dd
      ┌────────┬────────┐
      │   3    │   4    │
      │ (NW)   │ (NE)   │
      ├────────┼────────┤
      │   1    │   2    │
      │ (SW)   │ (SE)   │
      └────────┴────────┘
```

## Campos no GeoJSON

Cada feature do GeoJSON de grid possui os seguintes atributos de hierarquia:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sub_4dd` | TEXT | Identificador da célula 4dd (ex.: `KV-334`). Sempre presente. |
| `sub_2dd` | INT ou NULL | Quadrante 2dd dentro da célula 4dd (1–4). NULL se a célula é do nível 4dd. |
| `sub_1dd` | INT ou NULL | Quadrante 1dd dentro da célula 2dd (1–4). NULL se a célula é 2dd ou maior. |
| `sub_05dd` | INT ou NULL | Quadrante 05dd dentro da célula 1dd (1–4). NULL se a célula é 1dd ou maior. |

## Construção do grid_id

O `grid_id` é construído concatenando os níveis disponíveis, ignorando NULLs:

### Caso 1 — Apenas 4dd (sem subdivisões)

```
grid_id = sub_4dd
Exemplo: KV-334
```

### Caso 2 — 4dd + 2dd

```
grid_id = sub_4dd + "-" + sub_2dd
Exemplo: KV-334-2
```

### Caso 3 — 4dd + 2dd + 1dd

```
grid_id = sub_4dd + "-" + sub_2dd + sub_1dd
Exemplo: KX-334-43
```

O sub_1dd é concatenado **sem separador** ao sub_2dd.

### Caso 4 — Hierarquia completa (4dd + 2dd + 1dd + 05dd)

```
grid_id = sub_4dd + "-" + sub_2dd + sub_1dd + sub_05dd
Exemplo: KW-329-233
```

## Exemplos de grid_id

| grid_id antigo | grid_id novo | sub_4dd | sub_2dd | sub_1dd | sub_05dd |
|---|---|---|---|---|---|
| 971 | KV-334-2 | KV-334 | 2 | NULL | NULL |
| 976-1 | KX-334-43 | KX-334 | 4 | 3 | NULL |
| 683-1-1 | KW-329-233 | KW-329 | 2 | 3 | 3 |

## Regras importantes

- **Nunca** concatenar valores NULL.
- **Nunca** adicionar separadores extras (`-`) entre sub_2dd, sub_1dd e sub_05dd.
  O separador `-` aparece **apenas** entre sub_4dd e sub_2dd.
- O grid_id resultante deve ser **único** para cada célula.

## Distribuição das células de SP

| Nível | Quantidade de células |
|-------|----------------------|
| 4dd + 2dd (sem 1dd) | 618 |
| 4dd + 2dd + 1dd (sem 05dd) | 81 |
| 4dd + 2dd + 1dd + 05dd | 76 |
| **Total SP** | **775** |

## Migração no servidor

A renomeação dos grid_ids é feita automaticamente por uma **migração idempotente**
no `initDB()` do `db.js`:

- Contém o mapeamento completo de 775 entradas (antigo → novo).
- Executa `UPDATE grid_cells SET grid_id = ? WHERE grid_id = ?` para cada entrada.
- Se o grid_id antigo não existe no banco (já renomeado), pula.
- Loga quantas células foram renomeadas.
- Roda em todo startup do servidor, mas só altera dados na primeira execução.

## Arquivo de referência

O mapeamento completo está salvo em:

```
scripts/data/grid_id_mapping.json
```

Formato: `{ "grid_id_antigo": "grid_id_novo", ... }` com 775 entradas.

## GeoJSON fonte

```
H:\My Drive\PHD\02-Tese\02-data\adote-uma-leucena\v1-LEUCENA MAPPING\grid_leucaenaearth_br.geojson
```

Filtro para SP: `"states" LIKE '%sp%'` → 775 features.

## Impacto no código

| Arquivo | O que mudou |
|---------|-------------|
| `db.js` | Migração de renomeação adicionada em `initDB()` |
| `public/js/app.js` | `displayCellId()` simplificado — sem prefixo `SP-` |
| `scripts/data/grid_id_mapping.json` | Arquivo de referência com o mapeamento |

| Arquivo | Sem alteração (usa grid_id genérico) |
|---------|------|
| `server.js` | Retorna `grid_id` do DB como está |
| `public/js/map.js` | Busca por `grid_id` dinamicamente |
| `public/js/collaboration.js` | Exibe `grid_id` do grid data |
| `scripts/delete_grid_cells_from_geojson.js` | Lê `GRID_ID` do GeoJSON |
