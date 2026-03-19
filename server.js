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
const { initDB, queryAll, queryOne, runSQL, persist, DB_PATH } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const fs = require('fs');

const GMAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const MAP_HOSTS = ['map.leucaena.earth', 'localhost', '127.0.0.1'];

function isMapHost(req) {
  const host = (req.hostname || req.headers.host || '').split(':')[0];
  return MAP_HOSTS.some(h => host === h) || host.endsWith('.onrender.com');
}

app.get('/', (req, res) => {
  if (isMapHost(req)) {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const mapsUrl = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=drawing,geometry&callback=initGoogleMapsCallback`;
    res.send(html.replace('__GOOGLE_MAPS_SCRIPT_URL__', mapsUrl));
  } else {
    const mapUrl = `https://map.leucaena.earth`;
    const html = fs.readFileSync(path.join(__dirname, 'public', 'landing.html'), 'utf8');
    res.send(html.replace(/__MAP_URL__/g, mapUrl));
  }
});

app.get('/landing', (req, res) => {
  const mapUrl = req.protocol + '://' + req.get('host');
  const html = fs.readFileSync(path.join(__dirname, 'public', 'landing.html'), 'utf8');
  res.send(html.replace(/__MAP_URL__/g, mapUrl));
});

app.use(express.static(path.join(__dirname, 'public')));

const connectedUsers = new Map();
const sessions = new Map();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const ADMIN_USERNAMES = ['msb', 'mpf'];
function isAdmin(username) { return ADMIN_USERNAMES.includes(username); }

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
  if (!username) return res.status(401).json({ error: 'Login necessário' });
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
  let bestCell = null;
  let bestArea = Infinity;
  for (const cell of cells) {
    const geom = JSON.parse(cell.geometry);
    const rings = geom.type === 'MultiPolygon'
      ? geom.coordinates.map(p => p[0])
      : [geom.coordinates[0]];
    for (const ring of rings) {
      if (pointInPolygon([lng, lat], ring)) {
        const xs = ring.map(c => c[0]);
        const ys = ring.map(c => c[1]);
        const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
        if (area < bestArea) {
          bestArea = area;
          bestCell = cell;
        }
      }
    }
  }
  return bestCell;
}

function validateFinished(cellId) {
  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [cellId]);
  if (!cell) return { valid: false, error: 'Célula não encontrada' };

  const cellGeom = JSON.parse(cell.geometry);
  const cellRings = cellGeom.type === 'MultiPolygon'
    ? cellGeom.coordinates.map(p => p[0])
    : [cellGeom.coordinates[0]];

  const allPoints = queryAll('SELECT * FROM occurrence_points');
  const validPointsInCell = allPoints.filter(p => {
    if (p.status !== 0) return false;
    const geom = JSON.parse(p.geometry);
    const [lng, lat] = geom.coordinates;
    return cellRings.some(ring => pointInPolygon([lng, lat], ring));
  });

  if (validPointsInCell.length === 0) return { valid: true };

  const polys = queryAll('SELECT * FROM polygons WHERE grid_cell_id = ?', [cellId]);

  function isPointCoveredByPoly(lng, lat, polyGeom) {
    const coords = polyGeom.coordinates;
    if (!pointInPolygon([lng, lat], coords[0])) return false;
    for (let i = 1; i < coords.length; i++) {
      if (pointInPolygon([lng, lat], coords[i])) return false;
    }
    return true;
  }

  const uncovered = [];
  for (const pt of validPointsInCell) {
    const geom = JSON.parse(pt.geometry);
    const [lng, lat] = geom.coordinates;
    const covered = polys.some(p => isPointCoveredByPoly(lng, lat, JSON.parse(p.geometry)));
    if (!covered) uncovered.push(pt.id);
  }

  if (uncovered.length > 0) {
    return {
      valid: false,
      error: `Não é possível marcar como finalizado: ${uncovered.length} ponto(s) válido(s) não estão cobertos por nenhuma máscara de Leucena. Desenhe polígonos sobre todos os pontos válidos primeiro.`
    };
  }
  return { valid: true };
}

// ── View counter ──

app.post('/api/stats/view', (req, res) => {
  runSQL("UPDATE site_stats SET value = value + 1 WHERE key = 'view_count'");
  res.json({ success: true });
});

app.get('/api/stats/views', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username || !isAdmin(username)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const row = queryOne("SELECT value FROM site_stats WHERE key = 'view_count'");
  res.json({ views: row ? row.value : 0 });
});

// ── Auth ──

function getNextPasscode() {
  const adminList = ADMIN_USERNAMES.map(u => `'${u}'`).join(',');
  const row = queryOne(`SELECT COUNT(*) as cnt FROM users WHERE username NOT IN (${adminList}) AND username != 'deleted'`);
  const n = row.cnt;
  const d0 = Math.floor(n / 4);
  const rem = n % 4;
  const d1 = d0 + (rem >= 1 ? 1 : 0);
  const d2 = d0 + (rem >= 2 ? 1 : 0);
  const d3 = d0 + (rem >= 3 ? 1 : 0);
  return `${d1}${d2}${d3}${d0}`;
}

app.post('/api/auth/register', (req, res) => {
  const { username, password, passcode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'O usuário deve ter entre 2 e 30 caracteres' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });

  const expectedPasscode = getNextPasscode();
  if (!passcode || passcode.trim() !== expectedPasscode) {
    return res.status(403).json({ error: 'Código de acesso inválido. Solicite um por e-mail.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso' });

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  runSQL('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [username, hash, now]);

  const token = uuidv4();
  sessions.set(token, username);
  res.json({ token, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const hash = hashPassword(password);
  if (user.password_hash !== hash) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  runSQL('UPDATE users SET login_count = COALESCE(login_count, 0) + 1 WHERE username = ?', [username]);

  const token = uuidv4();
  sessions.set(token, username);
  res.json({ token, username });
});

app.get('/api/auth/me', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Não autenticado' });
  const user = queryOne('SELECT username, full_name, description, photo FROM users WHERE username = ?', [username]);
  res.json({ username, full_name: user?.full_name || null, description: user?.description || null, photo: user?.photo || null });
});

// ── Profile (for Quem Somos) ──

app.get('/api/profile', requireAuth, (req, res) => {
  const user = queryOne('SELECT username, full_name, description, photo FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ username: user.username, full_name: user.full_name || null, description: user.description || null, photo: user.photo || null });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { full_name, description, photo } = req.body || {};
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  if (photo != null && typeof photo === 'string' && photo.length > 500000) {
    return res.status(400).json({ error: 'Foto muito grande' });
  }
  runSQL(
    'UPDATE users SET full_name = ?, description = ?, photo = ? WHERE username = ?',
    [full_name || null, description != null ? description : null, photo != null ? photo : null, req.username]
  );
  persist();
  res.json({ success: true });
});

app.put('/api/profile/password', requireAuth, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE username = ?', [hash, req.username]);
  persist();
  res.json({ success: true });
});

app.put('/api/admin/users/:id/profile', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { full_name, description, photo } = req.body || {};
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  runSQL(
    'UPDATE users SET full_name = ?, description = ?, photo = ? WHERE id = ?',
    [full_name !== undefined ? (full_name || null) : user.full_name, description !== undefined ? (description || null) : user.description, photo !== undefined ? (photo || null) : user.photo, Number(req.params.id)]
  );
  persist();
  res.json({ success: true });
});

app.get('/api/landing-stats', (req, res) => {
  try {
    const cells = queryOne('SELECT COUNT(*) as cnt FROM grid_cells');
    const masks = queryOne('SELECT COUNT(*) as cnt FROM polygons');
    const points = queryOne('SELECT COUNT(*) as cnt FROM occurrence_points');
    const collabs = queryOne("SELECT COUNT(DISTINCT username) as cnt FROM users WHERE username != 'deleted'");
    res.json({
      cells: cells ? cells.cnt : 0,
      masks: masks ? masks.cnt : 0,
      points: points ? points.cnt : 0,
      collabs: collabs ? collabs.cnt : 0
    });
  } catch (e) { res.json({ cells: 0, masks: 0, points: 0, collabs: 0 }); }
});

app.get('/api/quem-somos', (req, res) => {
  const adminList = ADMIN_USERNAMES.map(u => `'${u}'`).join(',');
  const polygonCounts = queryAll(
    "SELECT created_by AS username, COUNT(*) AS cnt FROM polygons WHERE created_by IS NOT NULL AND created_by != 'deleted' GROUP BY created_by"
  );
  const countByUser = {};
  polygonCounts.forEach(r => { countByUser[r.username] = r.cnt; });

  const allUsers = queryAll('SELECT username, full_name, description, photo FROM users WHERE username != ?', ['deleted']);
  const idealizadores = allUsers
    .filter(u => isAdmin(u.username))
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, description: u.description || '', photo: u.photo || null }));
  const colaboradores = allUsers
    .filter(u => !isAdmin(u.username) && (countByUser[u.username] || 0) >= 10)
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, description: u.description || '', photo: u.photo || null }));

  res.json({ idealizadores, colaboradores });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    sessions.delete(header.slice(7));
  }
  res.json({ success: true });
});

// ── Admin: user management ──

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const users = queryAll("SELECT id, username, created_at, full_name, description, photo, login_count, total_time_ms FROM users WHERE username != 'deleted'");
  const maskCounts = queryAll('SELECT created_by, COUNT(*) as mask_count FROM polygons GROUP BY created_by');
  const maskMap = {};
  for (const m of maskCounts) maskMap[m.created_by] = m.mask_count;
  for (const u of users) u.mask_count = maskMap[u.username] || 0;
  const passcode = getNextPasscode();
  res.json({ users, nextPasscode: passcode });
});

app.get('/api/admin/users/export-csv', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const users = queryAll("SELECT id, username, created_at, full_name, description, login_count, total_time_ms FROM users WHERE username != 'deleted'");
  const maskCounts = queryAll('SELECT created_by, COUNT(*) as mask_count FROM polygons GROUP BY created_by');
  const maskMap = {};
  for (const m of maskCounts) maskMap[m.created_by] = m.mask_count;

  const header = 'username,full_name,description,masks_created,login_count,total_time_hours,created_at';
  const rows = users.map(u => {
    const masks = maskMap[u.username] || 0;
    const hours = ((u.total_time_ms || 0) / 3600000).toFixed(2);
    const fullName = (u.full_name || '').replace(/"/g, '""');
    const desc = (u.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
    return `${u.username},"${fullName}","${desc}",${masks},${u.login_count || 0},${hours},${u.created_at || ''}`;
  });

  const csv = header + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leucena_users_stats.csv');
  res.send('\uFEFF' + csv);
});

app.put('/api/admin/users/:id/password', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { password } = req.body;
  if (!password || password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE id = ?', [hash, Number(req.params.id)]);
  persist();
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (isAdmin(user.username)) return res.status(400).json({ error: 'Não é possível excluir um administrador' });

  const deletedExists = queryOne("SELECT id FROM users WHERE username = 'deleted'");
  if (!deletedExists) {
    const hash = hashPassword('__system_deleted__');
    const now = new Date().toISOString();
    runSQL("INSERT INTO users (username, password_hash, created_at) VALUES ('deleted', ?, ?)", [hash, now]);
  }

  runSQL("UPDATE polygons SET created_by = 'deleted' WHERE created_by = ?", [user.username]);
  runSQL("UPDATE grid_cells SET worked_by = REPLACE(worked_by, ?, 'deleted') WHERE worked_by LIKE ?",
    [user.username, `%${user.username}%`]);
  runSQL("UPDATE grid_cells SET finished_by = 'deleted' WHERE finished_by = ?", [user.username]);
  runSQL("UPDATE grid_cells SET locked_by = NULL, locked_at = NULL WHERE locked_by = ?", [user.username]);

  for (const [token, uname] of sessions.entries()) {
    if (uname === user.username) sessions.delete(token);
  }

  runSQL('DELETE FROM users WHERE id = ?', [Number(req.params.id)]);
  persist();
  io.emit('users:updated', Array.from(connectedUsers.values()));
  res.json({ success: true });
});

app.get('/api/admin/passcode', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  res.json({ passcode: getNextPasscode() });
});

app.get('/api/admin/db-info', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const dataPath = process.env.DATA_PATH || path.join(__dirname, 'data');
  res.json({
    dbPath: DB_PATH,
    dataPath,
    hasPersistentDisk: !!process.env.DATA_PATH,
    hint: process.env.DATA_PATH ? 'Persistent disk configured. DB should survive deploys.' : 'No DATA_PATH set. Add a Render Persistent Disk (mount /data) and set env DATA_PATH=/data to keep the DB across deploys.'
  });
});

// ── REST API ──

app.get('/api/grid', (req, res) => {
  const cells = queryAll('SELECT id, fid, grid_id, geometry, grid_status, numpoints, locked_by, locked_at, updated_at, worked_by, finished_by FROM grid_cells');
  const features = cells.map(c => ({
    type: 'Feature',
    properties: {
      id: c.id,
      fid: c.fid,
      grid_id: c.grid_id || String(c.fid),
      grid_status: c.grid_status,
      numpoints: c.numpoints || 0,
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
  const valid = ['not_yet_finished', 'in_use', 'mapping', 'no_points', 'finished'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Deve ser um dos seguintes: ${valid.join(', ')}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell) return res.status(404).json({ error: 'Célula não encontrada' });

  if (cell.locked_by && cell.locked_by !== username && !isAdmin(username)) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
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
  if (!cell) return res.status(404).json({ error: 'Célula não encontrada' });

  if (cell.grid_status === 'no_points') {
    return res.status(400).json({ error: 'Esta célula não possui pontos. Nada para editar.' });
  }

  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula já está bloqueada por ${cell.locked_by}` });
  }

  const now = new Date().toISOString();

  let workedBy = cell.worked_by ? cell.worked_by.split(',') : [];
  if (!workedBy.includes(username)) {
    workedBy.push(username);
  }

  runSQL(
    'UPDATE grid_cells SET locked_by = ?, locked_at = ?, grid_status = \'in_use\', worked_by = ?, updated_at = ? WHERE id = ?',
    [username, now, workedBy.join(','), now, Number(id)]
  );

  io.emit('cell:locked', { cellId: Number(id), username });
  io.emit('cell:statusChanged', { cellId: Number(id), status: 'in_use', username });
  persist();
  res.json({ success: true, worked_by: workedBy.join(',') });
});

app.post('/api/grid/:id/unlock', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const username = req.username;

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell) return res.status(404).json({ error: 'Célula não encontrada' });

  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}, não por ${username}` });
  }

  const now = new Date().toISOString();
  let newStatus = status || 'not_yet_finished';
  let finishedBy = cell.finished_by;

  if (newStatus === 'finished') {
    const validation = validateFinished(Number(id));
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    finishedBy = username;
  }

  if (newStatus === 'not_yet_finished') {
    const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? LIMIT 1', [Number(id)]);
    if (masks.length > 0) {
      newStatus = 'mapping';
    }
  }

  runSQL(
    'UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, finished_by = ?, updated_at = ? WHERE id = ?',
    [newStatus, finishedBy, now, Number(id)]
  );

  io.emit('cell:unlocked', { cellId: Number(id), username });
  io.emit('cell:statusChanged', { cellId: Number(id), status: newStatus, username, finished_by: finishedBy });
  persist();
  res.json({ success: true, status: newStatus });
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
    return res.status(400).json({ error: 'geometry e grid_cell_id obrigatórios' });
  }

  const coords = geometry.coordinates && geometry.coordinates[0];
  const vertexCount = coords ? coords.length - 1 : 0;
  if (vertexCount < 3) {
    return res.status(400).json({ error: 'Polígono deve ter pelo menos 3 vértices' });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(grid_cell_id)]);
  if (!cell) return res.status(404).json({ error: 'Célula do grid não encontrada' });
  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
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
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado' });

  if (poly.created_by !== username && !isAdmin(username)) {
    return res.status(403).json({ error: `Este polígono pertence a ${poly.created_by}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
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
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado' });

  if (poly.created_by !== username && !isAdmin(username)) {
    return res.status(403).json({ error: `Este polígono pertence a ${poly.created_by}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
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
    properties: { id: p.id, fid: p.fid, not_valid: p.status || 0, status: p.status || 0, layer: p.layer || 'crowdmapping' },
    geometry: JSON.parse(p.geometry)
  }));
  res.json({ type: 'FeatureCollection', features });
});

app.post('/api/points', requireAuth, (req, res) => {
  const { lat, lng } = req.body;
  const username = req.username;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat e lng obrigatórios' });
  }

  const geometry = { type: 'Point', coordinates: [lng, lat] };
  const pointStatus = req.body.status != null ? req.body.status : (req.body.not_valid != null ? (req.body.not_valid ? 1 : 0) : 0);
  const pointLayer = req.body.layer || 'crowdmapping';

  const maxFid = queryOne('SELECT MAX(fid) as maxFid FROM occurrence_points');
  const newFid = (maxFid && maxFid.maxFid != null) ? maxFid.maxFid + 1 : 1;

  runSQL(
    'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status) VALUES (?, ?, ?, ?, ?)',
    [newFid, JSON.stringify(geometry), pointStatus, pointLayer, pointStatus]
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
    not_valid: pointStatus,
    status: pointStatus,
    layer: pointLayer,
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

  if (!isAdmin(username)) {
    return res.status(403).json({ error: 'Somente administradores podem excluir pontos' });
  }

  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Ponto não encontrado' });

  const ptGeom = JSON.parse(point.geometry);
  const [ptLng, ptLat] = ptGeom.coordinates;
  const gridCell = findGridForPoint(ptLng, ptLat);

  runSQL('DELETE FROM occurrence_points WHERE id = ?', [Number(id)]);

  let gridStatusChanged = null;
  if (gridCell) {
    const cellGeom = JSON.parse(gridCell.geometry);
    const cellRings = cellGeom.type === 'MultiPolygon'
      ? cellGeom.coordinates.map(p => p[0])
      : [cellGeom.coordinates[0]];
    const remaining = queryAll('SELECT * FROM occurrence_points');
    const pointsInCell = remaining.filter(p => {
      const g = JSON.parse(p.geometry);
      return cellRings.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
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
  if (!point) return res.status(404).json({ error: 'Ponto não encontrado' });

  const currentStatus = point.status || 0;
  const newStatus = (currentStatus + 1) % 3; // 0→1→2→0
  runSQL('UPDATE occurrence_points SET status = ?, not_valid = ? WHERE id = ?', [newStatus, newStatus, Number(id)]);

  io.emit('point:validityChanged', { id: Number(id), not_valid: newStatus, status: newStatus });
  persist();
  res.json({ id: Number(id), not_valid: newStatus, status: newStatus });
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
        grid_id: c.grid_id || String(c.fid),
        grid_status: c.grid_status,
        numpoints: c.numpoints || 0,
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
      properties: { id: p.id, fid: p.fid, status: p.status || 0, layer: p.layer || 'crowdmapping' },
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
      const now = new Date().toISOString();
      const locked = queryAll('SELECT id FROM grid_cells WHERE locked_by = ?', [user.username]);
      for (const cell of locked) {
        const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? LIMIT 1', [cell.id]);
        const newStatus = masks.length > 0 ? 'mapping' : 'not_yet_finished';
        runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, updated_at = ? WHERE id = ?',
          [newStatus, now, cell.id]);
        io.emit('cell:unlocked', { cellId: cell.id, previousUser: user.username });
        io.emit('cell:statusChanged', { cellId: cell.id, status: newStatus, username: user.username });
      }
      if (locked.length > 0) persist();

      const sessionMs = Date.now() - new Date(user.joinedAt).getTime();
      if (sessionMs > 0 && sessionMs < 86400000) {
        runSQL('UPDATE users SET total_time_ms = COALESCE(total_time_ms, 0) + ? WHERE username = ?', [sessionMs, user.username]);
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
