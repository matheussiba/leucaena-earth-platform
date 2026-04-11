/**
 * Remove células do SQLite cujos grid_id aparecem num GeoJSON (propriedade GRID_ID).
 *
 * Uso:
 *   node scripts/delete_grid_cells_from_geojson.js [--dry-run] [--force-non-no-points]
 *   node scripts/delete_grid_cells_from_geojson.js <caminho.geojson> [--dry-run] [--force-non-no-points]
 *
 * Sem argumento de caminho, usa scripts/data/tiles_to_remove_in_sp.geojson (lista versionada para deploy).
 *
 * Por omissão só apaga se grid_status = 'no_points', locked_by IS NULL e sem linhas em polygons.
 * --force-non-no-points ignora a verificação de status (perigoso).
 */

const fs = require('fs');
const path = require('path');
const { initDB, getDB, persist, queryAll } = require('../db');

function loadGridIds(geojsonPath) {
  const raw = fs.readFileSync(geojsonPath, 'utf8');
  const gj = JSON.parse(raw);
  const set = new Set();
  for (const f of gj.features || []) {
    const p = f.properties || {};
    const gid = p.GRID_ID ?? p.grid_id;
    if (gid != null && String(gid).trim() !== '') set.add(String(gid).trim());
  }
  return [...set].sort();
}

function placeholders(n) {
  return Array(n).fill('?').join(',');
}

const BUNDLED_GEOJSON = path.join(__dirname, 'data', 'tiles_to_remove_in_sp.geojson');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--dry-run' && a !== '--force-non-no-points');
  const dryRun = process.argv.includes('--dry-run');
  const forceStatus = process.argv.includes('--force-non-no-points');

  const geoPath = path.resolve(args.length >= 1 ? args[0] : BUNDLED_GEOJSON);
  if (!fs.existsSync(geoPath)) {
    console.error('Ficheiro não encontrado:', geoPath);
    process.exit(1);
  }

  const gridIds = loadGridIds(geoPath);
  if (gridIds.length === 0) {
    console.error('Nenhum GRID_ID encontrado no GeoJSON.');
    process.exit(1);
  }

  await initDB();
  const db = getDB();

  const ph = placeholders(gridIds.length);
  const rows = queryAll(
    `SELECT id, grid_id, grid_status, locked_by, locked_at FROM grid_cells WHERE grid_id IN (${ph})`,
    gridIds
  );

  const byGrid = new Map();
  for (const r of rows) {
    if (!byGrid.has(r.grid_id)) byGrid.set(r.grid_id, []);
    byGrid.get(r.grid_id).push(r);
  }

  const missing = gridIds.filter(gid => !byGrid.has(gid));
  const toDelete = [];
  const skipped = [];

  for (const gid of gridIds) {
    const list = byGrid.get(gid);
    if (!list) {
      skipped.push({ grid_id: gid, reason: 'não existe no banco local' });
      continue;
    }
    for (const cell of list) {
      if (!forceStatus && cell.grid_status !== 'no_points') {
        skipped.push({
          grid_id: gid,
          id: cell.id,
          reason: `status é '${cell.grid_status}' (esperado no_points); use --force-non-no-points para ignorar`
        });
        continue;
      }
      if (cell.locked_by) {
        skipped.push({ grid_id: gid, id: cell.id, reason: `locked_by=${cell.locked_by}` });
        continue;
      }
      const polys = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? LIMIT 1', [cell.id]);
      if (polys.length > 0) {
        skipped.push({ grid_id: gid, id: cell.id, reason: 'tem máscara(s) em polygons' });
        continue;
      }
      toDelete.push(cell);
    }
  }

  console.log('GeoJSON:', geoPath);
  console.log('GRID_ID únicos no ficheiro:', gridIds.length);
  console.log('Células no DB com esses grid_id:', rows.length);
  console.log('A apagar:', toDelete.length);
  console.log('Ignoradas / em falta:', skipped.length);
  if (skipped.length) console.log('Detalhe ignorados:', JSON.stringify(skipped, null, 2));
  if (dryRun) {
    console.log('\n[--dry-run] Nada foi escrito.');
    if (toDelete.length) console.log('IDs que seriam apagados:', toDelete.map(c => c.id).join(', '));
    return;
  }

  if (toDelete.length === 0) {
    console.log('Nada a fazer.');
    return;
  }

  const ids = toDelete.map(c => c.id);
  const idPh = placeholders(ids.length);

  db.run('BEGIN');
  try {
    db.run(`DELETE FROM polygons WHERE grid_cell_id IN (${idPh})`, ids);
    db.run(`DELETE FROM grid_cell_states WHERE grid_cell_id IN (${idPh})`, ids);
    db.run(`DELETE FROM grid_cells WHERE id IN (${idPh})`, ids);
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
  persist();
  console.log('Concluído. Removidos', ids.length, 'registo(s) em grid_cells (e estados/polígonos associados).');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
