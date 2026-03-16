const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

try {
  const envFile = require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
} catch (e) { /* no .env file, use system env vars */ }
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initDB, queryAll, queryOne, runSQL, persist } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const fs = require('fs');

const GMAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const mapsUrl = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=drawing,geometry&callback=initGoogleMapsCallback`;
  res.send(html.replace('__GOOGLE_MAPS_SCRIPT_URL__', mapsUrl));
});

app.use(express.static(path.join(__dirname, 'public')));

const connectedUsers = new Map();
const sessions = new Map();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const ADMIN_USERNAME = 'msb';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '***REDACTED_SALT***').digest('hex');
}

function getUsernameFromToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  return sessions.get(token) || null;
}

function requireAuth(req, res, next) {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Login required' });
  req.username = username;
  next();
}

function releaseExpiredLocks() {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
  const expired = queryAll('SELECT id, locked_by FROM grid_cells WHERE locked_at IS NOT NULL AND locked_at < ?', [cutoff]);
  for (const cell of expired) {
    runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), cell.id]);
    io.emit('cell:unlocked', { cellId: cell.id, previousUser: cell.locked_by });
  }
}

setInterval(releaseExpiredLocks, 30000);

function pointInPolygon(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function findGridForPoint(lng, lat) {
  const cells = queryAll('SELECT id, geometry, grid_status FROM grid_cells');
  for (const cell of cells) {
    const geom = JSON.parse(cell.geometry);
    if (pointInPolygon([lng, lat], geom.coordinates[0])) {
      return cell;
    }
  }
  return null;
}

function validateFinished(cellId) {
  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [cellId]);
  if (!cell) return { valid: false, error: 'Cell not found' };

  const cellGeom = JSON.parse(cell.geometry);
  const cellRing = cellGeom.coordinates[0];

  const allPoints = queryAll('SELECT * FROM occurrence_points');
  const validPointsInCell = allPoints.filter(p => {
    if (p.not_valid === 1) return false;
    const geom = JSON.parse(p.geometry);
    const [lng, lat] = geom.coordinates;
    return pointInPolygon([lng, lat], cellRing);
  });

  if (validPointsInCell.length === 0) return { valid: true };

  const polys = queryAll('SELECT * FROM polygons WHERE grid_cell_id = ?', [cellId]);
  const polyRings = polys.map(p => JSON.parse(p.geometry).coordinates[0]);

  const uncovered = [];
  for (const pt of validPointsInCell) {
    const geom = JSON.parse(pt.geometry);
    const [lng, lat] = geom.coordinates;
    const covered = polyRings.some(ring => pointInPolygon([lng, lat], ring));
    if (!covered) uncovered.push(pt.id);
  }

  if (uncovered.length > 0) {
    return {
      valid: false,
      error: `Cannot mark as finished: ${uncovered.length} valid point(s) are not covered by any Leucaena mask. Draw polygons over all valid points first.`
    };
  }
  return { valid: true };
}

// ── Auth ──

function getNextPasscode() {
  const row = queryOne('SELECT COUNT(*) as cnt FROM users');
  const n = row.cnt;
  if (n < 1) return '0001';
  const thousands = Math.ceil(n / 2);
  const hundreds = Math.floor(n / 2);
  return String(thousands * 1000 + hundreds * 100 + 1).padStart(4, '0');
}

app.post('/api/auth/register', (req, res) => {
  const { username, password, passcode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'Username must be 2-30 characters' });
  if (password.length < 3) return res.status(400).json({ error: 'Password must be at least 3 characters' });

  const expectedPasscode = getNextPasscode();
  if (!passcode || passcode.trim() !== expectedPasscode) {
    return res.status(403).json({ error: 'Invalid passcode. Please request one via email.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  runSQL('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [username, hash, now]);

  const token = uuidv4();
  sessions.set(token, username);
  res.json({ token, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const hash = hashPassword(password);
  if (user.password_hash !== hash) return res.status(401).json({ error: 'Invalid username or password' });

  const token = uuidv4();
  sessions.set(token, username);
  res.json({ token, username });
});

app.get('/api/auth/me', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Not logged in' });
  res.json({ username });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    sessions.delete(header.slice(7));
  }
  res.json({ success: true });
});

// ── REST API ──

app.get('/api/grid', (req, res) => {
  const cells = queryAll('SELECT id, fid, geometry, grid_status, locked_by, locked_at, updated_at, worked_by, finished_by FROM grid_cells');
  const features = cells.map(c => ({
    type: 'Feature',
    properties: {
      id: c.id,
      fid: c.fid,
      grid_status: c.grid_status,
      locked_by: c.locked_by,
      locked_at: c.locked_at,
      updated_at: c.updated_at,
      worked_by: c.worked_by || null,
      finished_by: c.finished_by || null
    },
    geometry: JSON.parse(c.geometry)
  }));
  res.json({ type: 'FeatureCollection', features });
});

app.put('/api/grid/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const username = req.username;
  const valid = ['not_yet_finished', 'mapping', 'no_points', 'finished'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell) return res.status(404).json({ error: 'Cell not found' });

  if (cell.locked_by && cell.locked_by !== username && username !== ADMIN_USERNAME) {
    return res.status(409).json({ error: `Cell is locked by ${cell.locked_by}` });
  }

  const now = new Date().toISOString();
  let finishedBy = cell.finished_by;
  if (status === 'finished') {
    finishedBy = username;
  }

  runSQL('UPDATE grid_cells SET grid_status = ?, finished_by = ?, updated_at = ? WHERE id = ?',
    [status, finishedBy, now, Number(id)]);

  io.emit('cell:statusChanged', { cellId: Number(id), status, username, finished_by: finishedBy });
  persist();
  res.json({ success: true });
});

app.post('/api/grid/:id/lock', requireAuth, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell) return res.status(404).json({ error: 'Cell not found' });

  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Cell is already locked by ${cell.locked_by}` });
  }

  const now = new Date().toISOString();

  let workedBy = cell.worked_by ? cell.worked_by.split(',') : [];
  if (!workedBy.includes(username)) {
    workedBy.push(username);
  }

  runSQL(
    'UPDATE grid_cells SET locked_by = ?, locked_at = ?, grid_status = \'mapping\', worked_by = ?, updated_at = ? WHERE id = ?',
    [username, now, workedBy.join(','), now, Number(id)]
  );

  io.emit('cell:locked', { cellId: Number(id), username });
  io.emit('cell:statusChanged', { cellId: Number(id), status: 'mapping', username });
  persist();
  res.json({ success: true, worked_by: workedBy.join(',') });
});

app.post('/api/grid/:id/unlock', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const username = req.username;

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell) return res.status(404).json({ error: 'Cell not found' });

  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Cell is locked by ${cell.locked_by}, not ${username}` });
  }

  const now = new Date().toISOString();
  const newStatus = status || 'not_yet_finished';
  let finishedBy = cell.finished_by;

  if (newStatus === 'finished') {
    const validation = validateFinished(Number(id));
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    finishedBy = username;
  }

  runSQL(
    'UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, finished_by = ?, updated_at = ? WHERE id = ?',
    [newStatus, finishedBy, now, Number(id)]
  );

  io.emit('cell:unlocked', { cellId: Number(id), username });
  io.emit('cell:statusChanged', { cellId: Number(id), status: newStatus, username, finished_by: finishedBy });
  persist();
  res.json({ success: true });
});

// ── Polygons ──

app.get('/api/polygons', (req, res) => {
  const { grid_cell_id } = req.query;
  let polys;
  if (grid_cell_id) {
    polys = queryAll('SELECT * FROM polygons WHERE grid_cell_id = ?', [Number(grid_cell_id)]);
  } else {
    polys = queryAll('SELECT * FROM polygons');
  }
  const features = polys.map(p => ({
    type: 'Feature',
    properties: {
      id: p.id,
      grid_cell_id: p.grid_cell_id,
      created_by: p.created_by,
      created_at: p.created_at,
      updated_at: p.updated_at
    },
    geometry: JSON.parse(p.geometry)
  }));
  res.json({ type: 'FeatureCollection', features });
});

app.post('/api/polygons', requireAuth, (req, res) => {
  const { grid_cell_id, geometry } = req.body;
  const username = req.username;
  if (!geometry || !grid_cell_id) {
    return res.status(400).json({ error: 'geometry and grid_cell_id required' });
  }

  const coords = geometry.coordinates && geometry.coordinates[0];
  const vertexCount = coords ? coords.length - 1 : 0;
  if (vertexCount < 3) {
    return res.status(400).json({ error: 'Polygon must have at least 3 vertices' });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(grid_cell_id)]);
  if (!cell) return res.status(404).json({ error: 'Grid cell not found' });
  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Cell locked by ${cell.locked_by}` });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  runSQL(
    'INSERT INTO polygons (id, grid_cell_id, geometry, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, Number(grid_cell_id), JSON.stringify(geometry), username || 'anonymous', now, now]
  );

  const polygon = { id, grid_cell_id: Number(grid_cell_id), geometry, created_by: username, created_at: now, updated_at: now };
  io.emit('polygon:created', polygon);
  persist();
  res.json(polygon);
});

app.put('/api/polygons/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { geometry } = req.body;
  const username = req.username;

  const poly = queryOne('SELECT * FROM polygons WHERE id = ?', [id]);
  if (!poly) return res.status(404).json({ error: 'Polygon not found' });

  if (poly.created_by !== username && username !== ADMIN_USERNAME) {
    return res.status(403).json({ error: `This polygon belongs to ${poly.created_by}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Cell locked by ${cell.locked_by}` });
  }

  const now = new Date().toISOString();
  runSQL('UPDATE polygons SET geometry = ?, updated_at = ? WHERE id = ?', [JSON.stringify(geometry), now, id]);

  io.emit('polygon:updated', { id, geometry, updated_at: now });
  persist();
  res.json({ success: true });
});

app.delete('/api/polygons/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  const poly = queryOne('SELECT * FROM polygons WHERE id = ?', [id]);
  if (!poly) return res.status(404).json({ error: 'Polygon not found' });

  if (poly.created_by !== username && username !== ADMIN_USERNAME) {
    return res.status(403).json({ error: `This polygon belongs to ${poly.created_by}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Cell locked by ${cell.locked_by}` });
  }

  runSQL('DELETE FROM polygons WHERE id = ?', [id]);
  io.emit('polygon:deleted', { id, grid_cell_id: poly.grid_cell_id });
  persist();
  res.json({ success: true });
});

// ── Occurrence points ──

app.get('/api/points', (req, res) => {
  const points = queryAll('SELECT * FROM occurrence_points');
  const features = points.map(p => ({
    type: 'Feature',
    properties: { id: p.id, fid: p.fid, not_valid: p.not_valid },
    geometry: JSON.parse(p.geometry)
  }));
  res.json({ type: 'FeatureCollection', features });
});

app.post('/api/points', requireAuth, (req, res) => {
  const { lat, lng } = req.body;
  const username = req.username;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  const geometry = { type: 'Point', coordinates: [lng, lat] };
  const notValid = req.body.not_valid != null ? (req.body.not_valid ? 1 : 0) : 0;

  const maxFid = queryOne('SELECT MAX(fid) as maxFid FROM occurrence_points');
  const newFid = (maxFid && maxFid.maxFid != null) ? maxFid.maxFid + 1 : 1;

  runSQL(
    'INSERT INTO occurrence_points (fid, geometry, not_valid) VALUES (?, ?, ?)',
    [newFid, JSON.stringify(geometry), notValid]
  );

  const inserted = queryOne('SELECT * FROM occurrence_points WHERE fid = ?', [newFid]);

  const gridCell = findGridForPoint(lng, lat);
  let gridStatusChanged = null;
  if (gridCell && gridCell.grid_status === 'no_points') {
    const now = new Date().toISOString();
    runSQL('UPDATE grid_cells SET grid_status = ?, updated_at = ? WHERE id = ?',
      ['not_yet_finished', now, gridCell.id]);
    gridStatusChanged = { cellId: gridCell.id, status: 'not_yet_finished' };
    io.emit('cell:statusChanged', { cellId: gridCell.id, status: 'not_yet_finished', username });
  }

  const pointData = {
    id: inserted.id,
    fid: newFid,
    not_valid: 0,
    geometry,
    grid_cell_id: gridCell ? gridCell.id : null
  };

  io.emit('point:created', pointData);
  persist();
  res.json(pointData);
});

app.delete('/api/points/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  if (username !== ADMIN_USERNAME) {
    return res.status(403).json({ error: 'Only admin can delete points' });
  }

  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Point not found' });

  const ptGeom = JSON.parse(point.geometry);
  const [ptLng, ptLat] = ptGeom.coordinates;
  const gridCell = findGridForPoint(ptLng, ptLat);

  runSQL('DELETE FROM occurrence_points WHERE id = ?', [Number(id)]);

  let gridStatusChanged = null;
  if (gridCell) {
    const cellGeom = JSON.parse(gridCell.geometry);
    const cellRing = cellGeom.coordinates[0];
    const remaining = queryAll('SELECT * FROM occurrence_points');
    const pointsInCell = remaining.filter(p => {
      const g = JSON.parse(p.geometry);
      return pointInPolygon([g.coordinates[0], g.coordinates[1]], cellRing);
    });
    if (pointsInCell.length === 0 && gridCell.grid_status !== 'no_points') {
      const now = new Date().toISOString();
      runSQL('UPDATE grid_cells SET grid_status = ?, updated_at = ? WHERE id = ?',
        ['no_points', now, gridCell.id]);
      gridStatusChanged = { cellId: gridCell.id, status: 'no_points' };
      io.emit('cell:statusChanged', { cellId: gridCell.id, status: 'no_points', username });
    }
  }

  io.emit('point:deleted', { id: Number(id) });
  persist();
  res.json({ success: true, gridStatusChanged });
});

app.put('/api/points/:id/validity', requireAuth, (req, res) => {
  const { id } = req.params;
  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Point not found' });

  const newValid = point.not_valid ? 0 : 1;
  runSQL('UPDATE occurrence_points SET not_valid = ? WHERE id = ?', [newValid, Number(id)]);

  io.emit('point:validityChanged', { id: Number(id), not_valid: newValid });
  persist();
  res.json({ id: Number(id), not_valid: newValid });
});

// ── Export ──

app.get('/api/export/geojson', (req, res) => {
  const polys = queryAll('SELECT * FROM polygons');
  const fc = {
    type: 'FeatureCollection',
    features: polys.map(p => ({
      type: 'Feature',
      properties: {
        id: p.id,
        grid_cell_id: p.grid_cell_id,
        created_by: p.created_by,
        created_at: p.created_at
      },
      geometry: JSON.parse(p.geometry)
    }))
  };
  res.setHeader('Content-Disposition', 'attachment; filename="leucena_polygons.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

app.get('/api/export/grid-status', (req, res) => {
  const cells = queryAll('SELECT * FROM grid_cells');
  const fc = {
    type: 'FeatureCollection',
    features: cells.map(c => ({
      type: 'Feature',
      properties: {
        id: c.id,
        fid: c.fid,
        grid_status: c.grid_status,
        worked_by: c.worked_by || null,
        finished_by: c.finished_by || null,
        updated_at: c.updated_at
      },
      geometry: JSON.parse(c.geometry)
    }))
  };
  res.setHeader('Content-Disposition', 'attachment; filename="grid_status.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

app.get('/api/export/points', (req, res) => {
  const points = queryAll('SELECT * FROM occurrence_points');
  const fc = {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      properties: { id: p.id, fid: p.fid, not_valid: p.not_valid },
      geometry: JSON.parse(p.geometry)
    }))
  };
  res.setHeader('Content-Disposition', 'attachment; filename="leucena_points.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

// ── Connected users ──

app.get('/api/users', (req, res) => {
  const users = [];
  for (const [socketId, user] of connectedUsers.entries()) {
    users.push({ socketId, ...user });
  }
  res.json(users);
});

// ── Socket.IO ──

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('user:join', (data) => {
    connectedUsers.set(socket.id, {
      username: data.username,
      editingCell: null,
      joinedAt: new Date().toISOString()
    });
    io.emit('users:updated', Array.from(connectedUsers.values()));
    console.log(`User joined: ${data.username}`);
  });

  socket.on('user:editingCell', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.editingCell = data.cellId;
      io.emit('users:updated', Array.from(connectedUsers.values()));
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const locked = queryAll('SELECT id FROM grid_cells WHERE locked_by = ?', [user.username]);
      for (const cell of locked) {
        runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, updated_at = ? WHERE id = ?',
          [new Date().toISOString(), cell.id]);
        io.emit('cell:unlocked', { cellId: cell.id, previousUser: user.username });
      }
      connectedUsers.delete(socket.id);
      io.emit('users:updated', Array.from(connectedUsers.values()));
      console.log(`User disconnected: ${user.username}`);
    }
  });
});

// ── Start ──

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Leucena Mapping Platform running at:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    const nets = require('os').networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  Network: http://${net.address}:${PORT}`);
        }
      }
    }
    console.log();
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
