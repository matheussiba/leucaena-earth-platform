const fs = require('fs');
const path = require('path');
const { initDB, runSQL, queryOne, persist } = require('./db');

const STATUS_MAP = {
  'leucena': 'not_yet_finished',
  'sem ponto': 'no_points'
};

async function seed() {
  console.log('Initializing database...');
  await initDB();

  const existing = queryOne('SELECT COUNT(*) as count FROM grid_cells');
  if (existing && existing.count > 0) {
    console.log(`Database already seeded (${existing.count} grid cells). Skipping.`);
    console.log('Delete data/leucena.db to re-seed.');
    return;
  }

  console.log('Loading grid-sp.geojson...');
  const gridData = JSON.parse(fs.readFileSync(path.join(__dirname, 'grid-sp.geojson'), 'utf8'));

  console.log(`Inserting ${gridData.features.length} grid cells...`);
  for (const feature of gridData.features) {
    const { id, fid, grid_status } = feature.properties;
    const mappedStatus = STATUS_MAP[grid_status] || 'not_yet_finished';
    const geometry = JSON.stringify(feature.geometry);
    const now = new Date().toISOString();

    runSQL(
      'INSERT INTO grid_cells (id, fid, geometry, grid_status, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, fid, geometry, mappedStatus, now]
    );
  }
  console.log(`Inserted ${gridData.features.length} grid cells.`);

  console.log('Loading pontos_leucena.geojson...');
  const pointsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'pontos_leucena.geojson'), 'utf8'));

  console.log(`Inserting ${pointsData.features.length} occurrence points...`);
  for (const feature of pointsData.features) {
    const { fid, not_valid } = feature.properties;
    const geometry = JSON.stringify(feature.geometry);

    runSQL(
      'INSERT INTO occurrence_points (id, fid, geometry, not_valid) VALUES (?, ?, ?, ?)',
      [fid, fid, geometry, not_valid]
    );
  }
  console.log(`Inserted ${pointsData.features.length} occurrence points.`);

  persist();
  console.log('Seed complete! Database saved to data/leucena.db');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
