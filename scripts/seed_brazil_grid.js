const fs = require('fs');
const path = require('path');
const { initDB, getDB, queryAll, queryOne, persist } = require('../db');

const DEFAULT_GEOJSON = path.resolve(
  'H:/My Drive/PHD/02-Tese/02-data/adote-uma-leucena/v1-LEUCENA MAPPING/grid_leucaenaearth_br.geojson'
);

function buildGridId(p) {
  let id = p.sub_4dd;
  if (p.sub_2dd == null) return id;
  id += '-' + p.sub_2dd;
  if (p.sub_1dd == null) return id;
  id += p.sub_1dd;
  if (p.sub_05dd == null) return id;
  id += p.sub_05dd;
  return id;
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--dry-run');
  const dryRun = process.argv.includes('--dry-run');
  const geoPath = args[0] || DEFAULT_GEOJSON;
  if (!fs.existsSync(geoPath)) {
    console.error('GeoJSON not found:', geoPath);
    process.exit(1);
  }

  console.log('GeoJSON:', geoPath);
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  console.log('Total features in GeoJSON:', geo.features.length);

  const newCells = geo.features.filter(f => f.properties.grid_id == null);
  console.log('New cells (grid_id = NULL):', newCells.length);

  if (newCells.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  const newIds = new Set();
  let dupes = 0;
  newCells.forEach(f => {
    const gid = buildGridId(f.properties);
    if (newIds.has(gid)) dupes++;
    newIds.add(gid);
  });
  if (dupes > 0) {
    console.error('ABORT: Found', dupes, 'duplicate hierarchical grid_ids. Fix the GeoJSON first.');
    process.exit(1);
  }

  await initDB();
  const db = getDB();

  const existingIds = new Set(
    queryAll('SELECT grid_id FROM grid_cells').map(r => r.grid_id)
  );
  const overlap = newCells.filter(f => existingIds.has(buildGridId(f.properties)));
  if (overlap.length > 0) {
    console.error('ABORT:', overlap.length, 'new cells would collide with existing grid_ids.');
    overlap.slice(0, 5).forEach(f => console.error('  ', buildGridId(f.properties)));
    process.exit(1);
  }

  if (dryRun) {
    console.log('[--dry-run] Would insert', newCells.length, 'cells. No changes written.');
    const stateCounts = {};
    newCells.forEach(f => {
      (f.properties.states || '').split(';').forEach(s => {
        const uf = s.trim().toUpperCase();
        if (uf) stateCounts[uf] = (stateCounts[uf] || 0) + 1;
      });
    });
    console.log('Cells per state:', stateCounts);
    return;
  }

  const maxId = queryOne('SELECT COALESCE(MAX(id), 0) as m FROM grid_cells').m;
  let nextId = maxId + 1;
  let inserted = 0;
  let stateRows = 0;

  db.run('BEGIN');
  try {
    for (const f of newCells) {
      const p = f.properties;
      const gridId = buildGridId(p);
      const geom = f.geometry;
      if (geom.type === 'MultiPolygon' && geom.coordinates.length === 1) {
        geom.type = 'Polygon';
        geom.coordinates = geom.coordinates[0];
      }
      const geometry = JSON.stringify(geom);
      const now = new Date().toISOString();
      const states = (p.states || '').split(';').map(s => s.trim().toUpperCase()).filter(Boolean);
      const primaryState = states[0] || null;

      db.run(
        'INSERT INTO grid_cells (id, fid, grid_id, geometry, grid_status, numpoints, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nextId, nextId, gridId, geometry, 'no_points', 0, primaryState, now]
      );

      for (const uf of states) {
        db.run(
          'INSERT OR IGNORE INTO grid_cell_states (grid_cell_id, state) VALUES (?, ?)',
          [nextId, uf]
        );
        stateRows++;
      }

      nextId++;
      inserted++;
    }
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('Error during insert:', e.message);
    process.exit(1);
  }

  persist();
  console.log('Inserted', inserted, 'grid cells (' + stateRows + ' state junction rows).');
  console.log('Total grid cells now:', queryOne('SELECT COUNT(*) as c FROM grid_cells').c);

  const byState = queryAll('SELECT state, COUNT(*) as c FROM grid_cell_states GROUP BY state ORDER BY state');
  console.log('Cells per state (junction):');
  byState.forEach(r => console.log(' ', r.state, ':', r.c));
}

main().catch(e => { console.error(e); process.exit(1); });
