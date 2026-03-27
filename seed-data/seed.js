const fs = require('fs');
const path = require('path');
const { initDB, runSQL, queryOne, persist } = require('../db');

const STATUS_MAP = {
  'no point': 'no_points',
  'not finished yet': 'not_yet_finished',
  'leucena': 'not_yet_finished',
  'sem ponto': 'no_points'
};

function getFeatureExtent(f) {
  const coords = f.geometry.type === 'MultiPolygon'
    ? f.geometry.coordinates[0][0]
    : f.geometry.coordinates[0];
  const xs = coords.map(c => c[0]);
  const ys = coords.map(c => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return {
    minX, maxX, minY, maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: +(maxX - minX).toFixed(6)
  };
}

function getQuadrant(cx, cy, midX, midY) {
  if (cx < midX && cy < midY) return 1;
  if (cx >= midX && cy < midY) return 2;
  if (cx < midX && cy >= midY) return 3;
  return 4;
}

function assignUniqueGridIds(features) {
  const groups = {};
  features.forEach(f => {
    const gid = f.properties.GRID_ID;
    if (!groups[gid]) groups[gid] = [];
    groups[gid].push(f);
  });

  for (const [gid, feats] of Object.entries(groups)) {
    if (feats.length === 1) continue;

    const parentId = gid.split('-')[0];

    feats.forEach(f => {
      const ext = getFeatureExtent(f);
      f._cx = ext.cx;
      f._cy = ext.cy;
      f._w = ext.w;
    });

    const allCoords = feats.flatMap(f => {
      return f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates[0][0]
        : f.geometry.coordinates[0];
    });
    const parentMinX = Math.min(...allCoords.map(c => c[0]));
    const parentMaxX = Math.max(...allCoords.map(c => c[0]));
    const parentMinY = Math.min(...allCoords.map(c => c[1]));
    const parentMaxY = Math.max(...allCoords.map(c => c[1]));
    const parentMidX = (parentMinX + parentMaxX) / 2;
    const parentMidY = (parentMinY + parentMaxY) / 2;

    const sizes = [...new Set(feats.map(f => Math.round(f._w * 10000)))];
    sizes.sort((a, b) => b - a);

    if (sizes.length === 1) {
      feats.forEach(f => {
        const q = getQuadrant(f._cx, f._cy, parentMidX, parentMidY);
        f.properties.GRID_ID = `${parentId}-${q}`;
      });
    } else {
      const subtileSize = sizes[0];
      const subtiles = feats.filter(f => Math.round(f._w * 10000) === subtileSize);
      const subSubtiles = feats.filter(f => Math.round(f._w * 10000) !== subtileSize);

      subtiles.forEach(f => {
        const q = getQuadrant(f._cx, f._cy, parentMidX, parentMidY);
        f.properties.GRID_ID = `${parentId}-${q}`;
      });

      const ssGroups = {};
      subSubtiles.forEach(f => {
        const q = getQuadrant(f._cx, f._cy, parentMidX, parentMidY);
        if (!ssGroups[q]) ssGroups[q] = [];
        ssGroups[q].push(f);
      });

      for (const [subtileQ, ssFeats] of Object.entries(ssGroups)) {
        const ssCxs = ssFeats.map(f => f._cx);
        const ssCys = ssFeats.map(f => f._cy);
        const ssMidX = (Math.min(...ssCxs) + Math.max(...ssCxs)) / 2;
        const ssMidY = (Math.min(...ssCys) + Math.max(...ssCys)) / 2;

        ssFeats.forEach(f => {
          const sq = getQuadrant(f._cx, f._cy, ssMidX, ssMidY);
          f.properties.GRID_ID = `${parentId}-${subtileQ}-${sq}`;
        });
      }
    }
  }

  const finalIds = features.map(f => f.properties.GRID_ID);
  const dupes = finalIds.filter((v, i, a) => a.indexOf(v) !== i);
  if (dupes.length > 0) {
    console.warn('WARNING: Still have duplicate GRID_IDs after assignment:', [...new Set(dupes)]);
  }
}

async function seed() {
  console.log('Initializing database...');
  await initDB();

  const existing = queryOne('SELECT COUNT(*) as count FROM grid_cells');
  if (existing && existing.count > 0) {
    console.log(`Database already seeded (${existing.count} grid cells). Skipping.`);
    console.log('Delete data/leucena.db to re-seed.');
    return;
  }

  console.log('Loading grid-aoi.geojson...');
  const gridData = JSON.parse(fs.readFileSync(path.join(__dirname, 'grid-aoi.geojson'), 'utf8'));

  console.log('Assigning unique GRID_IDs...');
  assignUniqueGridIds(gridData.features);

  console.log(`Inserting ${gridData.features.length} grid cells...`);
  for (const feature of gridData.features) {
    const { fid, grid_status, NUMPOINTS, GRID_ID } = feature.properties;
    const mappedStatus = STATUS_MAP[grid_status] || 'not_yet_finished';
    const geom = feature.geometry;
    if (geom.type === 'MultiPolygon' && geom.coordinates.length === 1) {
      geom.type = 'Polygon';
      geom.coordinates = geom.coordinates[0];
    }
    const geometry = JSON.stringify(geom);
    const now = new Date().toISOString();

    runSQL(
      'INSERT INTO grid_cells (id, fid, grid_id, geometry, grid_status, numpoints, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fid, fid, GRID_ID, geometry, mappedStatus, NUMPOINTS || 0, now]
    );
  }
  console.log(`Inserted ${gridData.features.length} grid cells.`);

  console.log('Loading leucaena-points.geojson...');
  const pointsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'leucaena-points.geojson'), 'utf8'));

  console.log(`Inserting ${pointsData.features.length} occurrence points...`);
  for (const feature of pointsData.features) {
    const { fid, layer, status } = feature.properties;
    const coords = feature.geometry.coordinates.slice(0, 2);
    const geometry = JSON.stringify({ type: 'Point', coordinates: coords });
    const pointLayer = layer || 'crowdmapping';
    const pointStatus = status != null ? status : 0;

    runSQL(
      'INSERT INTO occurrence_points (id, fid, geometry, not_valid, layer, status) VALUES (?, ?, ?, ?, ?, ?)',
      [fid, fid, geometry, pointStatus, pointLayer, pointStatus]
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
