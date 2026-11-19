/**
 * ALS / GeoTrees shared tile registry API.
 *
 * Machine clients (lab PCs) authenticate with ALS_MACHINE_TOKEN.
 * Status codes (lidar_proc / rgbnir_proc):
 *   0 = not processed
 *   1 = success (terminal)
 *   2 = failure (retryable)
 *   3 = in progress / claim
 *   4 = not applicable / skipped
 *
 * Tracks stay separate: never mix lidar and rgbnir in one status field.
 */

const { queryAll, queryOne, getDB, persist } = require('./db');

const STATUS = {
  PENDING: 0,
  OK: 1,
  FAIL: 2,
  CLAIMED: 3,
  SKIPPED: 4,
};

const TRACKS = new Set(['lidar', 'rgbnir']);
const DEFAULT_LEASE_SECONDS = 7200;
const MAX_CLAIM_BATCH = 200;
const MAX_REPORT_BATCH = 200;
const MAX_UPSERT_BATCH = 2000;

const REGISTRY_CSV_COLS = [
  'tile_id', 'laz_nome', 'laz_path', 'bloco', 'layer_artic',
  'nomenc_2k', 'nomenc_5k', 'nomenc_10k', 'periodvoo',
  'epsg_artic', 'epsg_proc',
  'status', 'status_code', 'hostname', 'usuario', 'pasta_saida',
  'minutos', 'tamanho_mb', 'erro', 'iniciado_utc', 'finalizado_utc',
  'rodada_id', 'pipeline', 'out_dir', 'origem', 'updated_at',
];

function nowIso() {
  return new Date().toISOString();
}

function normalizeTileId(raw) {
  return String(raw || '').trim().toUpperCase();
}

function normalizeTrack(raw) {
  const t = String(raw || 'lidar').trim().toLowerCase();
  return TRACKS.has(t) ? t : null;
}

function statusLabel(code) {
  switch (Number(code)) {
    case STATUS.OK: return 'processed';
    case STATUS.FAIL: return 'erro';
    case STATUS.CLAIMED: return 'em_andamento';
    case STATUS.SKIPPED: return 'pulado';
    default: return 'pendente';
  }
}

function trackCols(track) {
  const p = track === 'rgbnir' ? 'rgbnir' : 'lidar';
  return {
    proc: `${p}_proc`,
    hostname: `${p}_hostname`,
    usuario: `${p}_usuario`,
    pasta: `${p}_pasta_saida`,
    minutos: `${p}_minutos`,
    tamanho: `${p}_tamanho_mb`,
    erro: `${p}_erro`,
    iniciado: `${p}_iniciado_utc`,
    finalizado: `${p}_finalizado_utc`,
    rodada: `${p}_rodada_id`,
    pipeline: `${p}_pipeline`,
    outDir: `${p}_out_dir`,
    lease: `${p}_lease_until`,
  };
}

function leaseExpired(leaseUntil, now = Date.now()) {
  if (!leaseUntil) return true;
  const t = Date.parse(leaseUntil);
  return !Number.isFinite(t) || t <= now;
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToRegistryExport(row, track = 'lidar') {
  const c = trackCols(track);
  return {
    tile_id: row.tile_id,
    laz_nome: row.laz_nome || '',
    laz_path: row.laz_path || '',
    bloco: row.bloco || '',
    layer_artic: row.layer_artic || '',
    nomenc_2k: row.nomenc_2k || '',
    nomenc_5k: row.nomenc_5k || '',
    nomenc_10k: row.nomenc_10k || '',
    periodvoo: row.periodvoo || '',
    epsg_artic: row.epsg_artic ?? '',
    epsg_proc: row.epsg_proc ?? '',
    status: statusLabel(row[c.proc]),
    status_code: row[c.proc],
    hostname: row[c.hostname] || '',
    usuario: row[c.usuario] || '',
    pasta_saida: row[c.pasta] || '',
    minutos: row[c.minutos] ?? '',
    tamanho_mb: row[c.tamanho] ?? '',
    erro: row[c.erro] || '',
    iniciado_utc: row[c.iniciado] || '',
    finalizado_utc: row[c.finalizado] || '',
    rodada_id: row[c.rodada] || '',
    pipeline: row[c.pipeline] || '',
    out_dir: row[c.outDir] || '',
    origem: 'api',
    updated_at: row.updated_at || '',
  };
}

function ensureTileStub(database, tileId, now) {
  database.run(
    `INSERT OR IGNORE INTO als_tiles (tile_id, nomenc_2k, updated_at) VALUES (?, ?, ?)`,
    [tileId, tileId, now]
  );
}

function insertAttempt(database, {
  tileId, track, statusCode, hostname, usuario, pipeline,
  minutos, tamanhoMb, erro, iniciadoUtc, finalizadoUtc,
  rodadaId, outDir, pastaSaida, createdAt,
}) {
  database.run(
    `INSERT INTO als_tile_attempts (
      tile_id, track, status_code, hostname, usuario, pipeline,
      minutos, tamanho_mb, erro, iniciado_utc, finalizado_utc,
      rodada_id, out_dir, pasta_saida, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tileId, track, statusCode,
      hostname || null, usuario || null, pipeline || null,
      minutos != null ? Number(minutos) : null,
      tamanhoMb != null ? Number(tamanhoMb) : null,
      erro || null,
      iniciadoUtc || null, finalizadoUtc || null,
      rodadaId || null, outDir || null, pastaSaida || null,
      createdAt,
    ]
  );
}

/**
 * Claim tiles for processing. Creates missing stubs so PCs can register
 * tile_ids discovered from local articulacao without a separate seed.
 */
function claimTiles(opts) {
  const track = normalizeTrack(opts.track || 'lidar');
  if (!track) return { error: 'track must be lidar or rgbnir', status: 400 };

  const hostname = String(opts.hostname || '').trim();
  if (!hostname) return { error: 'hostname is required', status: 400 };

  const usuario = String(opts.usuario || '').trim() || null;
  const pipeline = String(opts.pipeline || '').trim() || null;
  const allowRetry = Boolean(opts.allow_retry ?? opts.allowRetry);
  let leaseSeconds = Number(opts.lease_seconds ?? opts.leaseSeconds ?? DEFAULT_LEASE_SECONDS);
  if (!Number.isFinite(leaseSeconds) || leaseSeconds < 60) leaseSeconds = DEFAULT_LEASE_SECONDS;
  if (leaseSeconds > 86400) leaseSeconds = 86400;

  const rawIds = Array.isArray(opts.tile_ids) ? opts.tile_ids : [];
  if (!rawIds.length) return { error: 'tile_ids array is required', status: 400 };
  if (rawIds.length > MAX_CLAIM_BATCH) {
    return { error: `tile_ids max ${MAX_CLAIM_BATCH}`, status: 400 };
  }

  const tileIds = [...new Set(rawIds.map(normalizeTileId).filter(Boolean))];
  const c = trackCols(track);
  const now = Date.now();
  const nowStr = new Date(now).toISOString();
  const leaseUntil = new Date(now + leaseSeconds * 1000).toISOString();
  const claimed = [];
  const skipped = [];

  const database = getDB();
  database.run('BEGIN');
  try {
    for (const tileId of tileIds) {
      ensureTileStub(database, tileId, nowStr);
      const row = queryOne(`SELECT * FROM als_tiles WHERE tile_id = ?`, [tileId]);
      const code = Number(row[c.proc] ?? 0);
      const holder = row[c.hostname] || '';
      const lease = row[c.lease];

      if (code === STATUS.OK) {
        skipped.push({ tile_id: tileId, reason: 'already_done' });
        continue;
      }
      if (code === STATUS.SKIPPED) {
        skipped.push({ tile_id: tileId, reason: 'skipped' });
        continue;
      }
      if (code === STATUS.FAIL && !allowRetry) {
        skipped.push({ tile_id: tileId, reason: 'failed_use_allow_retry' });
        continue;
      }
      if (code === STATUS.CLAIMED && !leaseExpired(lease, now)) {
        if (holder && holder !== hostname) {
          skipped.push({ tile_id: tileId, reason: 'claimed_by_other', hostname: holder, lease_until: lease });
          continue;
        }
        // Same host refresh — re-claim / extend lease
      } else if (code === STATUS.CLAIMED && leaseExpired(lease, now)) {
        // reclaim allowed
      } else if (code !== STATUS.PENDING && code !== STATUS.FAIL && code !== STATUS.CLAIMED) {
        skipped.push({ tile_id: tileId, reason: `status_${code}` });
        continue;
      }

      database.run(
        `UPDATE als_tiles SET
          ${c.proc} = ?,
          ${c.hostname} = ?,
          ${c.usuario} = ?,
          ${c.pipeline} = COALESCE(?, ${c.pipeline}),
          ${c.iniciado} = ?,
          ${c.finalizado} = NULL,
          ${c.erro} = NULL,
          ${c.lease} = ?,
          updated_at = ?
         WHERE tile_id = ?`,
        [STATUS.CLAIMED, hostname, usuario, pipeline, nowStr, leaseUntil, nowStr, tileId]
      );

      insertAttempt(database, {
        tileId,
        track,
        statusCode: STATUS.CLAIMED,
        hostname,
        usuario,
        pipeline,
        iniciadoUtc: nowStr,
        createdAt: nowStr,
      });

      claimed.push({
        tile_id: tileId,
        status_code: STATUS.CLAIMED,
        hostname,
        lease_until: leaseUntil,
        track,
      });
    }
    database.run('COMMIT');
  } catch (e) {
    try { database.run('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  }
  persist();
  return { claimed, skipped, track };
}

function reportResults(opts) {
  const track = normalizeTrack(opts.track || 'lidar');
  if (!track) return { error: 'track must be lidar or rgbnir', status: 400 };

  const results = Array.isArray(opts.results) ? opts.results : null;
  if (!results) return { error: 'results array is required', status: 400 };
  if (results.length > MAX_REPORT_BATCH) {
    return { error: `results max ${MAX_REPORT_BATCH}`, status: 400 };
  }

  const c = trackCols(track);
  const nowStr = nowIso();
  const updated = [];
  const skipped = [];
  const database = getDB();

  database.run('BEGIN');
  try {
    for (const item of results) {
      const tileId = normalizeTileId(item.tile_id || item.tileId);
      if (!tileId) {
        skipped.push({ tile_id: null, reason: 'missing_tile_id' });
        continue;
      }

      let statusCode = Number(item.status_code ?? item.statusCode);
      if (!Number.isFinite(statusCode)) {
        // Accept local CSV labels
        const label = String(item.status || '').toLowerCase();
        if (label === 'processed' || label === 'ok' || label === 'sucesso') statusCode = STATUS.OK;
        else if (label === 'erro' || label === 'error' || label === 'fail' || label === 'failed') statusCode = STATUS.FAIL;
        else if (label === 'pulado' || label === 'skipped' || label === 'na') statusCode = STATUS.SKIPPED;
        else {
          skipped.push({ tile_id: tileId, reason: 'invalid_status_code' });
          continue;
        }
      }

      if (![STATUS.OK, STATUS.FAIL, STATUS.SKIPPED, STATUS.CLAIMED].includes(statusCode)) {
        skipped.push({ tile_id: tileId, reason: 'invalid_status_code' });
        continue;
      }

      ensureTileStub(database, tileId, nowStr);
      const row = queryOne(`SELECT * FROM als_tiles WHERE tile_id = ?`, [tileId]);
      const current = Number(row[c.proc] ?? 0);

      // Idempotent success
      if (current === STATUS.OK && statusCode === STATUS.OK) {
        skipped.push({ tile_id: tileId, reason: 'already_ok_noop' });
        continue;
      }
      // Do not downgrade terminal success
      if (current === STATUS.OK && statusCode !== STATUS.OK) {
        skipped.push({ tile_id: tileId, reason: 'already_ok' });
        continue;
      }

      const hostname = item.hostname != null ? String(item.hostname).trim() : row[c.hostname];
      const usuario = item.usuario != null ? String(item.usuario).trim() : row[c.usuario];
      const pipeline = item.pipeline != null ? String(item.pipeline).trim() : row[c.pipeline];
      const pasta = item.pasta_saida != null ? String(item.pasta_saida) : (item.pastaSaida != null ? String(item.pastaSaida) : row[c.pasta]);
      const outDir = item.out_dir != null ? String(item.out_dir) : (item.outDir != null ? String(item.outDir) : row[c.outDir]);
      const minutos = item.minutos != null ? Number(item.minutos) : row[c.minutos];
      const tamanho = item.tamanho_mb != null ? Number(item.tamanho_mb) : (item.tamanhoMb != null ? Number(item.tamanhoMb) : row[c.tamanho]);
      const erro = item.erro != null ? String(item.erro) : (statusCode === STATUS.OK ? null : row[c.erro]);
      const iniciado = item.iniciado_utc || item.iniciadoUtc || row[c.iniciado] || null;
      const finalizado = item.finalizado_utc || item.finalizadoUtc || ((statusCode === STATUS.OK || statusCode === STATUS.FAIL || statusCode === STATUS.SKIPPED) ? nowStr : null);
      const rodada = item.rodada_id || item.rodadaId || row[c.rodada] || null;

      // Optional metadata fill
      const meta = {
        laz_nome: item.laz_nome ?? item.lazNome,
        laz_path: item.laz_path ?? item.lazPath,
        bloco: item.bloco,
        layer_artic: item.layer_artic ?? item.layerArtic,
        nomenc_2k: item.nomenc_2k ?? item.nomenc2k,
        nomenc_5k: item.nomenc_5k ?? item.nomenc5k,
        nomenc_10k: item.nomenc_10k ?? item.nomenc10k,
        periodvoo: item.periodvoo,
        epsg_artic: item.epsg_artic ?? item.epsgArtic,
        epsg_proc: item.epsg_proc ?? item.epsgProc,
      };

      const leaseClear = (statusCode === STATUS.OK || statusCode === STATUS.FAIL || statusCode === STATUS.SKIPPED)
        ? null
        : row[c.lease];

      database.run(
        `UPDATE als_tiles SET
          laz_nome = COALESCE(?, laz_nome),
          laz_path = COALESCE(?, laz_path),
          bloco = COALESCE(?, bloco),
          layer_artic = COALESCE(?, layer_artic),
          nomenc_2k = COALESCE(?, nomenc_2k),
          nomenc_5k = COALESCE(?, nomenc_5k),
          nomenc_10k = COALESCE(?, nomenc_10k),
          periodvoo = COALESCE(?, periodvoo),
          epsg_artic = COALESCE(?, epsg_artic),
          epsg_proc = COALESCE(?, epsg_proc),
          ${c.proc} = ?,
          ${c.hostname} = ?,
          ${c.usuario} = ?,
          ${c.pasta} = ?,
          ${c.minutos} = ?,
          ${c.tamanho} = ?,
          ${c.erro} = ?,
          ${c.iniciado} = ?,
          ${c.finalizado} = ?,
          ${c.rodada} = ?,
          ${c.pipeline} = ?,
          ${c.outDir} = ?,
          ${c.lease} = ?,
          updated_at = ?
         WHERE tile_id = ?`,
        [
          meta.laz_nome != null ? String(meta.laz_nome) : null,
          meta.laz_path != null ? String(meta.laz_path) : null,
          meta.bloco != null ? String(meta.bloco) : null,
          meta.layer_artic != null ? String(meta.layer_artic) : null,
          meta.nomenc_2k != null ? String(meta.nomenc_2k) : null,
          meta.nomenc_5k != null ? String(meta.nomenc_5k) : null,
          meta.nomenc_10k != null ? String(meta.nomenc_10k) : null,
          meta.periodvoo != null ? String(meta.periodvoo) : null,
          meta.epsg_artic != null ? Number(meta.epsg_artic) : null,
          meta.epsg_proc != null ? Number(meta.epsg_proc) : null,
          statusCode,
          hostname || null,
          usuario || null,
          pasta || null,
          Number.isFinite(minutos) ? minutos : null,
          Number.isFinite(tamanho) ? tamanho : null,
          erro || null,
          iniciado,
          finalizado,
          rodada,
          pipeline || null,
          outDir || null,
          leaseClear,
          nowStr,
          tileId,
        ]
      );

      insertAttempt(database, {
        tileId,
        track,
        statusCode,
        hostname,
        usuario,
        pipeline,
        minutos: Number.isFinite(minutos) ? minutos : null,
        tamanhoMb: Number.isFinite(tamanho) ? tamanho : null,
        erro,
        iniciadoUtc: iniciado,
        finalizadoUtc: finalizado,
        rodadaId: rodada,
        outDir,
        pastaSaida: pasta,
        createdAt: nowStr,
      });

      updated.push({ tile_id: tileId, status_code: statusCode, track });
    }
    database.run('COMMIT');
  } catch (e) {
    try { database.run('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  }
  persist();
  return { updated, skipped, track };
}

function upsertTiles(opts) {
  const tiles = Array.isArray(opts.tiles) ? opts.tiles : null;
  if (!tiles) return { error: 'tiles array is required', status: 400 };
  if (tiles.length > MAX_UPSERT_BATCH) {
    return { error: `tiles max ${MAX_UPSERT_BATCH}`, status: 400 };
  }

  const nowStr = nowIso();
  let upserted = 0;
  const database = getDB();
  database.run('BEGIN');
  try {
    for (const item of tiles) {
      const tileId = normalizeTileId(item.tile_id || item.tileId || item.nomenc_2k || item.NOMENC_2K);
      if (!tileId) continue;

      ensureTileStub(database, tileId, nowStr);
      database.run(
        `UPDATE als_tiles SET
          laz_nome = COALESCE(?, laz_nome),
          laz_path = COALESCE(?, laz_path),
          bloco = COALESCE(?, bloco),
          layer_artic = COALESCE(?, layer_artic),
          nomenc_2k = COALESCE(?, nomenc_2k),
          nomenc_5k = COALESCE(?, nomenc_5k),
          nomenc_10k = COALESCE(?, nomenc_10k),
          periodvoo = COALESCE(?, periodvoo),
          epsg_artic = COALESCE(?, epsg_artic),
          epsg_proc = COALESCE(?, epsg_proc),
          updated_at = ?
         WHERE tile_id = ?`,
        [
          item.laz_nome != null ? String(item.laz_nome) : null,
          item.laz_path != null ? String(item.laz_path) : null,
          item.bloco != null ? String(item.bloco) : (item.BLOCO != null ? String(item.BLOCO) : null),
          item.layer_artic != null ? String(item.layer_artic) : (item.layer != null ? String(item.layer) : null),
          item.nomenc_2k != null ? String(item.nomenc_2k) : tileId,
          item.nomenc_5k != null ? String(item.nomenc_5k) : (item.NOMENC_5K != null ? String(item.NOMENC_5K) : null),
          item.nomenc_10k != null ? String(item.nomenc_10k) : (item.NOMENC_10K != null ? String(item.NOMENC_10K) : null),
          item.periodvoo != null ? String(item.periodvoo) : null,
          item.epsg_artic != null ? Number(item.epsg_artic) : null,
          item.epsg_proc != null ? Number(item.epsg_proc) : null,
          nowStr,
          tileId,
        ]
      );
      upserted += 1;
    }
    database.run('COMMIT');
  } catch (e) {
    try { database.run('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  }
  persist();
  return { upserted };
}

function listTiles(query = {}) {
  const track = normalizeTrack(query.track || 'lidar') || 'lidar';
  const c = trackCols(track);
  const where = [];
  const params = [];

  if (query.status !== undefined && query.status !== null && String(query.status).length) {
    where.push(`${c.proc} = ?`);
    params.push(Number(query.status));
  }
  if (query.bloco) {
    where.push('UPPER(bloco) = UPPER(?)');
    params.push(String(query.bloco).trim());
  }
  if (query.hostname) {
    where.push(`${c.hostname} = ?`);
    params.push(String(query.hostname).trim());
  }

  let limit = Number(query.limit ?? 500);
  if (!Number.isFinite(limit) || limit < 1) limit = 500;
  if (limit > 5000) limit = 5000;

  const sql = `SELECT * FROM als_tiles
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY tile_id
    LIMIT ?`;
  params.push(limit);

  const rows = queryAll(sql, params);
  return {
    track,
    count: rows.length,
    tiles: rows.map((r) => ({
      ...rowToRegistryExport(r, track),
      lidar_proc: r.lidar_proc,
      rgbnir_proc: r.rgbnir_proc,
      lidar_lease_until: r.lidar_lease_until,
      rgbnir_lease_until: r.rgbnir_lease_until,
    })),
  };
}

function getTileDetail(tileIdRaw) {
  const tileId = normalizeTileId(tileIdRaw);
  if (!tileId) return { error: 'tile_id required', status: 400 };
  const row = queryOne('SELECT * FROM als_tiles WHERE tile_id = ?', [tileId]);
  if (!row) return { error: 'not found', status: 404 };
  const history = queryAll(
    `SELECT * FROM als_tile_attempts WHERE tile_id = ? ORDER BY id DESC LIMIT 100`,
    [tileId]
  );
  return {
    tile: {
      ...row,
      lidar_status: statusLabel(row.lidar_proc),
      rgbnir_status: statusLabel(row.rgbnir_proc),
    },
    history,
  };
}

function exportRegistryCsv(trackRaw = 'lidar') {
  const track = normalizeTrack(trackRaw) || 'lidar';
  const rows = queryAll('SELECT * FROM als_tiles ORDER BY tile_id');
  const lines = [REGISTRY_CSV_COLS.join(',')];
  for (const row of rows) {
    const exp = rowToRegistryExport(row, track);
    lines.push(REGISTRY_CSV_COLS.map((col) => csvEscape(exp[col])).join(','));
  }
  return { track, csv: `${lines.join('\n')}\n` };
}

function summary(trackRaw = 'lidar') {
  const track = normalizeTrack(trackRaw) || 'lidar';
  const c = trackCols(track);
  const byStatus = queryAll(
    `SELECT ${c.proc} AS status_code, COUNT(*) AS n FROM als_tiles GROUP BY ${c.proc}`
  );
  const byBloco = queryAll(
    `SELECT COALESCE(bloco, '') AS bloco, ${c.proc} AS status_code, COUNT(*) AS n
     FROM als_tiles GROUP BY bloco, ${c.proc} ORDER BY bloco, status_code`
  );
  const byHost = queryAll(
    `SELECT COALESCE(${c.hostname}, '') AS hostname, ${c.proc} AS status_code, COUNT(*) AS n
     FROM als_tiles
     WHERE ${c.hostname} IS NOT NULL AND TRIM(${c.hostname}) != ''
     GROUP BY ${c.hostname}, ${c.proc}
     ORDER BY hostname, status_code`
  );
  const total = queryOne('SELECT COUNT(*) AS n FROM als_tiles');
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of byStatus) counts[String(r.status_code)] = r.n;

  return {
    track,
    total: total ? total.n : 0,
    by_status: counts,
    by_bloco: byBloco,
    by_hostname: byHost,
  };
}

function createAlsMachineAuth(tokenEnvValue) {
  return function alsMachineAuth(req, res, next) {
    if (!tokenEnvValue) {
      return res.status(503).json({ error: 'ALS_MACHINE_TOKEN not configured on server' });
    }
    const headerToken = String(
      req.headers['x-als-token'] || req.headers['x-als-machine-token'] || ''
    ).trim();
    const auth = String(req.headers.authorization || '');
    const bearer = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : '';
    if (headerToken === tokenEnvValue || bearer === tokenEnvValue) return next();
    return res.status(401).json({ error: 'invalid ALS machine token' });
  };
}

function mountAlsRoutes(app, { rateLimitFn } = {}) {
  const token = process.env.ALS_MACHINE_TOKEN || '';
  const auth = createAlsMachineAuth(token);
  const writeLimiter = typeof rateLimitFn === 'function'
    ? rateLimitFn('alsWrite', 180, 15 * 60 * 1000)
    : (_req, _res, next) => next();
  const readLimiter = typeof rateLimitFn === 'function'
    ? rateLimitFn('alsRead', 300, 15 * 60 * 1000)
    : (_req, _res, next) => next();

  const wrap = (fn) => (req, res) => {
    try {
      const out = fn(req, res);
      if (out && out.error && out.status) {
        return res.status(out.status).json({ error: out.error });
      }
      return out;
    } catch (e) {
      console.error('ALS registry error:', e);
      return res.status(500).json({ error: e.message || 'internal error' });
    }
  };

  app.post('/api/v1/als/tiles/claim', auth, writeLimiter, wrap((req, res) => {
    const body = req.body || {};
    const out = claimTiles({
      tile_ids: body.tile_ids || body.tileIds,
      hostname: body.hostname,
      usuario: body.usuario,
      pipeline: body.pipeline,
      lease_seconds: body.lease_seconds ?? body.leaseSeconds,
      allow_retry: body.allow_retry ?? body.allowRetry,
      track: body.track,
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json(out);
  }));

  app.post('/api/v1/als/tiles/report', auth, writeLimiter, wrap((req, res) => {
    const body = req.body || {};
    const out = reportResults({
      results: body.results,
      track: body.track,
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json(out);
  }));

  app.post('/api/v1/als/tiles/upsert', auth, writeLimiter, wrap((req, res) => {
    const body = req.body || {};
    const out = upsertTiles({ tiles: body.tiles });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json(out);
  }));

  app.get('/api/v1/als/tiles', auth, readLimiter, wrap((req, res) => {
    return res.json(listTiles(req.query || {}));
  }));

  app.get('/api/v1/als/tiles/:tile_id', auth, readLimiter, wrap((req, res) => {
    const out = getTileDetail(req.params.tile_id);
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json(out);
  }));

  app.get('/api/v1/als/export/registry.csv', auth, readLimiter, wrap((req, res) => {
    const track = (req.query && req.query.track) || 'lidar';
    const out = exportRegistryCsv(track);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="geotrees_als_registry_${out.track}.csv"`);
    return res.send(out.csv);
  }));

  app.get('/api/v1/als/summary', auth, readLimiter, wrap((req, res) => {
    const track = (req.query && req.query.track) || 'lidar';
    return res.json(summary(track));
  }));
}

module.exports = {
  STATUS,
  mountAlsRoutes,
  claimTiles,
  reportResults,
  upsertTiles,
  listTiles,
  getTileDetail,
  exportRegistryCsv,
  summary,
  statusLabel,
  createAlsMachineAuth,
};
