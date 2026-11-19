# ALS tile registry API

Shared processing status for GeoTrees / ALS tiles across lab Windows PCs.
The site DB is the **source of truth**. The articulacao GPKG in
[leucaena-earth-utils](https://github.com/matheussiba/leucaena-earth-utils)
(`lidar_proc` / `rgbnir_proc`) is only a visual mirror — never claim there
from multiple machines.

OpenAPI: [`als-registry-openapi.yaml`](./als-registry-openapi.yaml)

## Status codes

| Code | Meaning |
|------|---------|
| `0` | not processed |
| `1` | success (terminal) |
| `2` | failure (retry with `allow_retry`) |
| `3` | in progress / claim |
| `4` | skipped / N/A |

Tracks **`lidar`** and **`rgbnir`** are independent columns on the same tile.

## Create a machine token

1. Generate a long random secret (e.g. `openssl rand -hex 32`).
2. Set `ALS_MACHINE_TOKEN=<secret>` on the server (Render env / `.env`).
3. On each lab PC, set the same value as env var `ALS_MACHINE_TOKEN`.
4. Clients send `X-ALS-Token: <secret>` or `Authorization: Bearer <secret>`.

There is no public write endpoint. Without the token → `401`. If the env
var is unset → `503`.

## Client flush policy (batch R)

- **Claim** when starting a tile → immediate `POST .../claim`
- **Report** every 5 finished tiles (ok or fail) → `POST .../report`
- **Report** again at end of the run (flush remaining)

Wiring the R batch lives in `leucaena-earth-utils` (out of scope here).

## curl examples

```bash
export ALS_URL=https://leucaena.earth
export ALS_TOKEN=your-secret

# Optional: preload catalog metadata
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/upsert" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{"tiles":[{"tile_id":"SF-22-V-B-III-3-SE-A-I","bloco":"EF","laz_nome":"tile.laz"}]}'

# Claim
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/claim" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tile_ids":["SF-22-V-B-III-3-SE-A-I"],
    "hostname":"LAB-PC-01",
    "usuario":"matheus",
    "pipeline":"lastools",
    "lease_seconds":7200
  }'

# Report (batch of up to 5+)
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/report" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "results":[{
      "tile_id":"SF-22-V-B-III-3-SE-A-I",
      "status_code":1,
      "minutos":18.2,
      "tamanho_mb":42.5,
      "hostname":"LAB-PC-01",
      "pasta_saida":"D:/geotrees_als/processed/SF-22-...",
      "rodada_id":"2026-03-19_LAB-PC-01"
    }]
  }'

# Queue: still pending in bloco EF
curl -sS "$ALS_URL/api/v1/als/tiles?status=0&bloco=EF&limit=500" \
  -H "X-ALS-Token: $ALS_TOKEN"

# Summary
curl -sS "$ALS_URL/api/v1/als/summary" -H "X-ALS-Token: $ALS_TOKEN"

# Export CSV (local registry shape)
curl -sS "$ALS_URL/api/v1/als/export/registry.csv" \
  -H "X-ALS-Token: $ALS_TOKEN" -o geotrees_als_registry.csv
```

## Out of scope (later)

- R batch in `leucaena-earth-utils` calling claim/report
- RGBNIR processing (track column is ready; pipeline not wired)
- Pushing status back into the articulacao GPKG
