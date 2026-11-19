/**
 * ALS registry unit tests (no HTTP server).
 * Usage: node scripts/test-als-registry.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'als-registry-'));
process.env.DATA_PATH = tmpDir;

const { initDB, queryOne, queryAll } = require('../db');
const {
  claimTiles,
  reportResults,
  upsertTiles,
  listTiles,
  getTileDetail,
  exportRegistryCsv,
  summary,
  releaseStaleClaims,
  STATUS,
} = require('../als-registry');

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

async function main() {
  await initDB();

  const tileA = 'SF-22-V-B-III-3-SE-A-I';
  const tileB = 'SF-22-V-B-III-3-SE-A-II';
  const tileC = 'SF-22-V-B-III-3-SE-A-III';

  // Upsert metadata
  const up = upsertTiles({
    tiles: [
      { tile_id: tileA, bloco: 'EF', nomenc_5k: 'X', laz_nome: 'a.laz' },
      { tile_id: tileB, bloco: 'EF', laz_nome: 'b.laz' },
      { tile_id: tileC, bloco: 'ES', laz_nome: 'c.laz' },
    ],
  });
  assert(up.upserted === 3, 'upsert 3 tiles');

  // Claim from PC1
  const c1 = claimTiles({
    tile_ids: [tileA, tileB],
    hostname: 'PC1',
    usuario: 'lab',
    pipeline: 'lastools',
    lease_seconds: 3600,
  });
  assert(c1.claimed.length === 2, 'PC1 claims 2');
  assert(c1.skipped.length === 0, 'PC1 skip none');

  // PC2 cannot steal active claim
  const c2 = claimTiles({
    tile_ids: [tileA],
    hostname: 'PC2',
    usuario: 'lab',
    pipeline: 'lastools',
  });
  assert(c2.claimed.length === 0, 'PC2 cannot claim active');
  assert(c2.skipped[0] && c2.skipped[0].reason === 'claimed_by_other', 'PC2 skipped claimed_by_other');

  // Same host can refresh claim
  const c1b = claimTiles({
    tile_ids: [tileA],
    hostname: 'PC1',
    usuario: 'lab',
  });
  assert(c1b.claimed.length === 1, 'PC1 re-claims own tile');

  // Report success for A
  const r1 = reportResults({
    results: [{
      tile_id: tileA,
      status_code: STATUS.OK,
      minutos: 12.5,
      tamanho_mb: 40,
      hostname: 'PC1',
      pasta_saida: 'D:/out/A',
      rodada_id: 'rod-1',
    }],
  });
  assert(r1.updated.length === 1 && r1.updated[0].status_code === 1, 'report OK for A');

  // Idempotent second OK
  const r1b = reportResults({
    results: [{ tile_id: tileA, status_code: 1 }],
  });
  assert(r1b.skipped[0] && r1b.skipped[0].reason === 'already_ok_noop', 'second OK is noop');

  // Cannot claim done tile
  const cDone = claimTiles({ tile_ids: [tileA], hostname: 'PC2' });
  assert(cDone.skipped[0] && cDone.skipped[0].reason === 'already_done', 'cannot claim done');

  // Success without pasta_saida is rejected
  const rNoPasta = reportResults({
    results: [{ tile_id: tileB, status_code: 1, hostname: 'PC1' }],
  });
  assert(rNoPasta.skipped[0] && rNoPasta.skipped[0].reason === 'success_requires_pasta_saida', 'OK needs pasta_saida');

  // Report failure for B
  const rFail = reportResults({
    results: [{ tile_id: tileB, status_code: 2, erro: 'lasinfo failed', hostname: 'PC1' }],
  });
  assert(rFail.updated[0].status_code === 2, 'report FAIL for B');

  // Reset FAIL -> 0 (pending) without touching OK tiles
  const rReset = reportResults({
    results: [{ tile_id: tileB, status_code: 0, hostname: '', pasta_saida: '', erro: 'reset_for_reprocess' }],
  });
  assert(rReset.updated[0].status_code === 0, 'reset FAIL to pending');
  const rowB = queryOne('SELECT lidar_proc FROM als_tiles WHERE tile_id = ?', [tileB]);
  assert(rowB.lidar_proc === 0, 'B is pending after reset');

  // Cannot reset terminal OK
  const rResetOk = reportResults({
    results: [{ tile_id: tileA, status_code: 0 }],
  });
  assert(rResetOk.skipped[0] && rResetOk.skipped[0].reason === 'already_ok', 'cannot reset OK tile');

  // Re-fail B for allow_retry path below
  reportResults({
    results: [{ tile_id: tileB, status_code: 2, erro: 'lasinfo failed', hostname: 'PC1' }],
  });

  // Retry claim needs allow_retry
  const cRetryNo = claimTiles({ tile_ids: [tileB], hostname: 'PC2' });
  assert(cRetryNo.skipped[0].reason === 'failed_use_allow_retry', 'fail blocks claim without retry');
  const cRetry = claimTiles({ tile_ids: [tileB], hostname: 'PC2', allow_retry: true });
  assert(cRetry.claimed.length === 1, 'allow_retry claims failed tile');

  // Expired lease reclaim
  const { getDB, persist } = require('../db');
  const past = new Date(Date.now() - 60_000).toISOString();
  getDB().run(
    `UPDATE als_tiles SET lidar_proc = 3, lidar_hostname = 'PC_OLD', lidar_lease_until = ? WHERE tile_id = ?`,
    [past, tileC]
  );
  persist();
  // ensure stub exists
  upsertTiles({ tiles: [{ tile_id: tileC, bloco: 'ES' }] });
  getDB().run(
    `UPDATE als_tiles SET lidar_proc = 3, lidar_hostname = 'PC_OLD', lidar_lease_until = ? WHERE tile_id = ?`,
    [past, tileC]
  );
  persist();

  const cReclaim = claimTiles({ tile_ids: [tileC], hostname: 'PC3' });
  assert(cReclaim.claimed.length === 1, 'expired lease can be reclaimed');
  assert(cReclaim.claimed[0].iniciado_utc, 'claim returns iniciado_utc');
  assert(cReclaim.claimed[0].lease_until, 'claim returns lease_until');

  // Same-host refresh keeps original iniciado_utc
  const started = cReclaim.claimed[0].iniciado_utc;
  const cRefresh = claimTiles({ tile_ids: [tileC], hostname: 'PC3', lease_seconds: 3600 });
  assert(cRefresh.claimed[0].refreshed === true, 'same host refresh flagged');
  assert(cRefresh.claimed[0].iniciado_utc === started, 'refresh preserves iniciado_utc');

  // Stale >1d claim is auto-released to pending
  const tileD = 'SF-22-V-B-III-3-SE-A-IV';
  upsertTiles({ tiles: [{ tile_id: tileD, bloco: 'ES' }] });
  const oldStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const futureLease = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  getDB().run(
    `UPDATE als_tiles SET lidar_proc = 3, lidar_hostname = 'PC_STUCK',
     lidar_iniciado_utc = ?, lidar_lease_until = ? WHERE tile_id = ?`,
    [oldStart, futureLease, tileD]
  );
  persist();
  const released = releaseStaleClaims({ track: 'lidar' });
  assert(released.count >= 1 && released.released.some((r) => r.tile_id === tileD), 'release stale >1d');
  const rowD = queryOne('SELECT lidar_proc FROM als_tiles WHERE tile_id = ?', [tileD]);
  assert(rowD.lidar_proc === 0, 'stale claim becomes pending');

  // List pending
  const listed = listTiles({ status: 0, limit: 100 });
  assert(listed.tiles.every((t) => t.status_code === 0), 'list status=0 only pending');

  const detail = getTileDetail(tileA);
  assert(detail.tile.lidar_proc === 1, 'detail shows OK');
  assert(detail.history.length >= 2, 'history has attempts');

  const sum = summary('lidar');
  assert(sum.by_status['1'] >= 1, 'summary counts OK');
  assert(sum.total >= 3, 'summary total');

  const csv = exportRegistryCsv('lidar');
  assert(csv.csv.includes('tile_id,laz_nome'), 'csv has header');
  assert(csv.csv.includes(tileA), 'csv has tile A');
  assert(csv.csv.includes('processed'), 'csv maps status label');

  // rgbnir track is independent
  const rgb = claimTiles({
    tile_ids: [tileA],
    hostname: 'PC1',
    track: 'rgbnir',
  });
  assert(rgb.claimed.length === 1, 'rgbnir claim independent of lidar OK');
  const row = queryOne('SELECT lidar_proc, rgbnir_proc FROM als_tiles WHERE tile_id = ?', [tileA]);
  assert(row.lidar_proc === 1 && row.rgbnir_proc === 3, 'tracks not mixed');

  const attempts = queryAll('SELECT track, status_code FROM als_tile_attempts WHERE tile_id = ?', [tileA]);
  assert(attempts.some((a) => a.track === 'rgbnir' && a.status_code === 3), 'rgbnir attempt logged');

  console.log('\n' + (failed ? `${failed} failed` : 'All tests passed'));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
