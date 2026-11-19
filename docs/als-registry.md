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
| `0` | not processed / reset to pending |
| `1` | success (**terminal** — never downgraded) |
| `2` | failure (retry with `allow_retry`) |
| `3` | in progress / claim |
| `4` | skipped / N/A |

Tracks **`lidar`** and **`rgbnir`** are independent columns on the same tile.

### Rigid success rule

`status_code=1` is accepted **only** when `pasta_saida` is non-empty. The R batch must
promote products into `processed/<utm>/<tile>/` (with `_INFO_summary_processing.csv`
and no `_ERROR.txt`) **before** reporting `1`. Partial / staging folders must not be
reported as success.

Reporting `0` resets `2`/`3`/`4` back to pending for reprocessing. It **never** clears
a tile that already has `1` (protects the O:\\ALS_IGC sync and any finished PC run).

## Claims, timestamps, and stale locks

Every claim stores and returns:

- `iniciado_utc` — when the lock started (preserved on same-host refresh)
- `lease_until` — soft expiry (default 2h, max 24h)
- Hard rule: **max 1 day** from `iniciado_utc`. After that the tile returns to `0` even if someone keeps refreshing.

Stale release happens:

1. Automatically every ~15 min on the server
2. On `claim` / `list` / `summary` / `GET tile`
3. Manually via `POST /api/v1/als/tiles/release-stale`

Crashed batches that leave `status=3` free up after lease expiry (default 2h) or at latest after 1 day.

## Create a machine token

1. Generate a long random secret (e.g. `openssl rand -hex 32`).
2. Set `ALS_MACHINE_TOKEN=<secret>` on the server (Render env / `.env`).
3. On each lab PC, set the same value as env var `ALS_MACHINE_TOKEN`.
4. Clients send `X-ALS-Token: <secret>` or `Authorization: Bearer <secret>`.

There is no public write endpoint. Without the token → `401`. If the env
var is unset → `503`.

## Client flush policy (batch R)

- **Claim** when starting a tile → immediate `POST .../claim` (→ `3`)
- **Report `1`** only after products are promoted and verified → flush immediately
- **Report `2`/`4`** → flush immediately (free the queue)
- End of run → flush any remaining buffer

Wiring the R batch lives in `leucaena-earth-utils`.

### Reset failed / stuck tiles (keep sync OK)

```bash
# List non-zero that are NOT success (inspect first)
curl -sS "$ALS_URL/api/v1/als/tiles?status=2&limit=500" -H "X-ALS-Token: $ALS_TOKEN"
curl -sS "$ALS_URL/api/v1/als/tiles?status=3&limit=500" -H "X-ALS-Token: $ALS_TOKEN"

# Reset one failed/stuck tile to 0 (will be skipped if already status 1)
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/report" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{"track":"lidar","results":[{"tile_id":"SF-22-Z-B-VI-3-NO-E-IV","status_code":0,"hostname":"","pasta_saida":"","erro":"reset_old_script"}]}'
```

## curl examples

```bash
export ALS_URL=https://leucaena.earth
export ALS_TOKEN=your-secret

# Optional: preload catalog metadata
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/upsert" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{"tiles":[{"tile_id":"SF-22-V-B-III-3-SE-A-I","bloco":"EF","laz_nome":"tile.laz"}]}'

# Claim (response includes iniciado_utc + lease_until)
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/claim" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tile_ids":["SF-22-V-B-III-3-SE-A-I"],
    "hostname":"LAB-PC-01",
    "usuario":"matheus",
    "pipeline":"lastools",
    "lease_seconds":7200
  }'

# Free stuck "processing" tiles (lease expired or >1 day)
curl -sS -X POST "$ALS_URL/api/v1/als/tiles/release-stale" \
  -H "X-ALS-Token: $ALS_TOKEN" -H "Content-Type: application/json" \
  -d '{"track":"lidar"}'

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
