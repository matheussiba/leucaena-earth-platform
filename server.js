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

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const host = req.headers.host || '';
    if (host.endsWith('.onrender.com')) {
      return res.redirect(301, 'https://map.leucaena.earth' + req.url);
    }
    if (req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, 'https://' + host + req.url);
    }
  }
  next();
});

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

// ── Rate limiter (in-memory, per IP) ──

const _rateBuckets = {};

function rateLimit(key, maxAttempts, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    if (!_rateBuckets[bucketKey]) _rateBuckets[bucketKey] = [];
    _rateBuckets[bucketKey] = _rateBuckets[bucketKey].filter(t => t > now - windowMs);
    if (_rateBuckets[bucketKey].length >= maxAttempts) {
      const retryAfter = Math.ceil((windowMs - (now - _rateBuckets[bucketKey][0])) / 1000);
      return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${retryAfter}s.`, retryAfter });
    }
    _rateBuckets[bucketKey].push(now);
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(_rateBuckets)) {
    _rateBuckets[key] = _rateBuckets[key].filter(t => t > now - 3600000);
    if (_rateBuckets[key].length === 0) delete _rateBuckets[key];
  }
}, 10 * 60 * 1000);

const loginLimiter = rateLimit('login', 8, 15 * 60 * 1000);
const registerLimiter = rateLimit('register', 5, 60 * 60 * 1000);
const resetLimiter = rateLimit('reset', 5, 15 * 60 * 1000);

// ── Password reset tokens (in-memory, expire in 30 min) ──

const resetTokens = new Map();
const RESET_TOKEN_TTL = 30 * 60 * 1000;

const connectedUsers = new Map();
const sessions = new Map();
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
function getUserRole(username) {
  const user = queryOne('SELECT role FROM users WHERE username = ?', [username]);
  return (user && user.role) || 'contributor';
}
function getEffectiveRole(username) {
  const role = getUserRole(username);
  if (role === 'tester') {
    const user = queryOne('SELECT tester_mode FROM users WHERE username = ?', [username]);
    return (user && user.tester_mode) || 'contributor';
  }
  return role;
}
function isSuperAdmin(username) { return getUserRole(username) === 'superadmin'; }
function isAdmin(username) { const r = getUserRole(username); return r === 'admin' || r === 'superadmin'; }
function isTeamOrAbove(username) {
  const eff = getEffectiveRole(username);
  return eff === 'superadmin' || eff === 'admin' || eff === 'team';
}
function canDeleteMask(username, maskCreator) {
  if (isAdmin(username)) return true;
  return maskCreator === username;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '***REDACTED_SALT***').digest('hex');
}

let _logCleanupCounter = 0;
function logActivity(username, action, cellId, objectId, details) {
  try {
    const dets = (details && typeof details === 'object') ? JSON.stringify(details) : (details || null);
    runSQL('INSERT INTO activity_logs (timestamp, username, action, cell_id, object_id, details) VALUES (?, ?, ?, ?, ?, ?)',
      [new Date().toISOString(), username || null, action, cellId || null, objectId || null, dets]);
    if (++_logCleanupCounter >= 50) {
      _logCleanupCounter = 0;
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      runSQL('DELETE FROM activity_logs WHERE timestamp < ?', [cutoff]);
    }
  } catch (e) { /* ignore logging errors */ }
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

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2);
}

function pointNearPolygonEdge(point, ring, toleranceDeg) {
  const [px, py] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (distToSegment(px, py, ring[j][0], ring[j][1], ring[i][0], ring[i][1]) <= toleranceDeg) return true;
  }
  return false;
}

function ringAreaM2(ring) {
  const toRad = Math.PI / 180;
  const R = 6371000;
  let area = 0;
  for (let i = 0, len = ring.length; i < len; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % len];
    area += (lng2 - lng1) * toRad * (2 + Math.sin(lat1 * toRad) + Math.sin(lat2 * toRad));
  }
  return Math.abs(area * R * R / 2);
}

function polygonAreaHa(geometry) {
  if (!geometry || !geometry.coordinates) return 0;
  const coords = geometry.coordinates;
  let area = ringAreaM2(coords[0]);
  for (let i = 1; i < coords.length; i++) {
    area -= ringAreaM2(coords[i]);
  }
  return Math.max(0, area) / 10000;
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

  const TOLERANCE_DEG = 0.00005; // ~5.5 meters at equator

  function isPointCoveredByPoly(lng, lat, polyGeom) {
    const coords = polyGeom.coordinates;
    if (pointInPolygon([lng, lat], coords[0])) {
      for (let i = 1; i < coords.length; i++) {
        if (pointInPolygon([lng, lat], coords[i])) return false;
      }
      return true;
    }
    if (pointNearPolygonEdge([lng, lat], coords[0], TOLERANCE_DEG)) return true;
    return false;
  }

  const uncovered = [];
  for (const pt of validPointsInCell) {
    const geom = JSON.parse(pt.geometry);
    const [lng, lat] = geom.coordinates;
    const covered = polys.some(p => isPointCoveredByPoly(lng, lat, JSON.parse(p.geometry)));
    if (!covered) uncovered.push({ id: pt.id, lng: lng.toFixed(6), lat: lat.toFixed(6), status: pt.status });
  }

  if (uncovered.length > 0) {
    const details = uncovered.slice(0, 5).map(u => `#${u.id} (${u.lat}, ${u.lng})`).join(', ');
    return {
      valid: false,
      error: `Não é possível marcar como finalizado: ${uncovered.length} ponto(s) válido(s) (status=0) sem máscara. IDs: ${details}${uncovered.length > 5 ? '...' : ''}`,
      uncoveredPointIds: uncovered.map(u => u.id)
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
  const row = queryOne("SELECT COUNT(*) as cnt FROM users WHERE role NOT IN ('admin','superadmin','tester') AND username != 'deleted'");
  const n = row.cnt;
  const d0 = Math.floor(n / 4);
  const rem = n % 4;
  const d1 = d0 + (rem >= 1 ? 1 : 0);
  const d2 = d0 + (rem >= 2 ? 1 : 0);
  const d3 = d0 + (rem >= 3 ? 1 : 0);
  return `${d1}${d2}${d3}${d0}`;
}

app.post('/api/auth/register', registerLimiter, (req, res) => {
  const { username, password, passcode, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'O usuário deve ter entre 2 e 30 caracteres' });
  if (!/^[a-z0-9.]+$/.test(username)) return res.status(400).json({ error: 'O usuário deve conter apenas letras minúsculas, números e ponto (ex: joao.silva)' });
  if (!/[a-z]/.test(username)) return res.status(400).json({ error: 'O usuário deve conter pelo menos uma letra (ex: joao.silva)' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail válido é obrigatório' });

  const expectedPasscode = getNextPasscode();
  if (!passcode || passcode.trim() !== expectedPasscode) {
    return res.status(403).json({ error: 'Código de acesso inválido. Solicite um por e-mail.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso' });

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  runSQL('INSERT INTO users (username, password_hash, created_at, email) VALUES (?, ?, ?, ?)', [username, hash, now, email]);
  logActivity(username, 'register', null, null, null);

  const token = uuidv4();
  sessions.set(token, username);
  const role = getUserRole(username);
  res.json({ token, username, role, tester_mode: 'contributor' });
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const hash = hashPassword(password);
  if (user.password_hash !== hash) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  runSQL('UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_active = ? WHERE username = ?', [new Date().toISOString(), username]);
  logActivity(username, 'login', null, null, null);

  const token = uuidv4();
  sessions.set(token, username);
  const role = getUserRole(username);
  const tm = queryOne('SELECT tester_mode FROM users WHERE username = ?', [username]);
  res.json({ token, username, role, tester_mode: (tm && tm.tester_mode) || 'contributor' });
});

app.get('/api/auth/me', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Não autenticado' });
  const user = queryOne('SELECT username, full_name, description, photo, linkedin, scholar, role, tester_mode, email FROM users WHERE username = ?', [username]);
  res.json({ username, role: user?.role || 'contributor', tester_mode: user?.tester_mode || 'contributor', full_name: user?.full_name || null, description: user?.description || null, photo: user?.photo || null, linkedin: user?.linkedin || null, scholar: user?.scholar || null, email: user?.email || null });
});

// ── Profile (for Quem Somos) ──

app.get('/api/profile', requireAuth, (req, res) => {
  const user = queryOne('SELECT username, full_name, description, photo, linkedin, scholar, email FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ username: user.username, full_name: user.full_name || null, description: user.description || null, photo: user.photo || null, linkedin: user.linkedin || null, scholar: user.scholar || null, email: user.email || null });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { full_name, description, photo, linkedin, scholar } = req.body || {};
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  if (photo != null && typeof photo === 'string' && photo.length > 500000) {
    return res.status(400).json({ error: 'Foto muito grande' });
  }
  runSQL(
    'UPDATE users SET full_name = ?, description = ?, photo = ?, linkedin = ?, scholar = ? WHERE username = ?',
    [full_name || null, description != null ? description : null, photo != null ? photo : null, linkedin || null, scholar || null, req.username]
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
  const { full_name, description, photo, linkedin, scholar, email } = req.body || {};
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  runSQL(
    'UPDATE users SET full_name = ?, description = ?, photo = ?, linkedin = ?, scholar = ?, email = ? WHERE id = ?',
    [full_name !== undefined ? (full_name || null) : user.full_name, description !== undefined ? (description || null) : user.description, photo !== undefined ? (photo || null) : user.photo, linkedin !== undefined ? (linkedin || null) : user.linkedin, scholar !== undefined ? (scholar || null) : user.scholar, email !== undefined ? (email || null) : user.email, Number(req.params.id)]
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
  const polygonCounts = queryAll(
    "SELECT created_by AS username, COUNT(*) AS cnt FROM polygons WHERE created_by IS NOT NULL AND created_by != 'deleted' GROUP BY created_by"
  );
  const countByUser = {};
  polygonCounts.forEach(r => { countByUser[r.username] = r.cnt; });

  const excludeUsers = ['deleted', 'teste'];
  const allUsers = queryAll('SELECT username, full_name, description, photo, linkedin, scholar, role, is_founder FROM users');
  const teamOrder = ['mpf', 'msb'];

  const equipe = allUsers
    .filter(u => (u.role === 'superadmin' || u.role === 'admin' || u.role === 'team') && !excludeUsers.includes(u.username))
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, description: u.description || '', photo: u.photo || null, linkedin: u.linkedin || null, scholar: u.scholar || null, role: u.role, is_founder: u.is_founder || 0, mask_count: countByUser[u.username] || 0 }))
    .sort((a, b) => {
      if (a.is_founder !== b.is_founder) return b.is_founder - a.is_founder;
      const order = { superadmin: 0, admin: 1, team: 2 };
      if ((order[a.role] ?? 9) !== (order[b.role] ?? 9)) return (order[a.role] ?? 9) - (order[b.role] ?? 9);
      const ai = teamOrder.indexOf(a.username), bi = teamOrder.indexOf(b.username);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const colaboradores = allUsers
    .filter(u => u.role === 'contributor' && !excludeUsers.includes(u.username) && (countByUser[u.username] || 0) >= 5)
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, description: u.description || '', photo: u.photo || null, linkedin: u.linkedin || null, scholar: u.scholar || null, role: u.role, mask_count: countByUser[u.username] || 0 }))
    .sort((a, b) => b.mask_count - a.mask_count);

  res.json({ equipe, colaboradores });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization;
  let logUser = null;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    logUser = sessions.get(token) || null;
    sessions.delete(token);
  }
  if (logUser) logActivity(logUser, 'logout', null, null, null);
  res.json({ success: true });
});

// ── Password reset ──

app.post('/api/auth/reset-password', resetLimiter, (req, res) => {
  const { username, code, password } = req.body;
  if (!username || !code || !password) return res.status(400).json({ error: 'Usuário, código e nova senha são obrigatórios' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });

  const entry = resetTokens.get(username.toLowerCase());
  if (!entry) return res.status(400).json({ error: 'Nenhum código de recuperação encontrado. Solicite ao administrador.' });
  if (Date.now() > entry.expires) {
    resetTokens.delete(username.toLowerCase());
    return res.status(400).json({ error: 'Código expirado. Solicite um novo ao administrador.' });
  }
  if (entry.code !== code.trim()) return res.status(400).json({ error: 'Código inválido' });

  const user = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE username = ?', [hash, username]);
  resetTokens.delete(username.toLowerCase());
  logActivity(username, 'password_reset_used', null, null, null);
  persist();
  res.json({ success: true });
});

// ── Admin: user management ──

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const users = queryAll("SELECT id, username, created_at, full_name, description, photo, linkedin, scholar, login_count, total_time_ms, role, tester_mode, is_founder, email, last_active FROM users WHERE username != 'deleted'");
  const allPolys = queryAll('SELECT created_by, geometry FROM polygons');
  const maskMap = {};
  const areaMap = {};
  let globalMasks = 0;
  let globalAreaHa = 0;
  for (const p of allPolys) {
    const user = p.created_by;
    maskMap[user] = (maskMap[user] || 0) + 1;
    let ha = 0;
    try { ha = polygonAreaHa(JSON.parse(p.geometry)); } catch (e) { /* skip bad geometry */ }
    areaMap[user] = (areaMap[user] || 0) + ha;
    globalMasks++;
    globalAreaHa += ha;
  }
  for (const u of users) {
    u.mask_count = maskMap[u.username] || 0;
    u.mask_area_ha = Math.round((areaMap[u.username] || 0) * 100) / 100;
  }
  const passcode = isAdmin(req.username) ? getNextPasscode() : null;
  const onlineUsernames = Array.from(connectedUsers.values()).map(u => u.username);
  res.json({ users, nextPasscode: passcode, globalMasks, globalAreaHa: Math.round(globalAreaHa * 100) / 100, callerRole: getUserRole(req.username), onlineUsers: onlineUsernames });
});

app.get('/api/admin/users/export-csv', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const users = queryAll("SELECT id, username, created_at, full_name, description, email, login_count, total_time_ms FROM users WHERE username != 'deleted'");
  const maskCounts = queryAll('SELECT created_by, COUNT(*) as mask_count FROM polygons GROUP BY created_by');
  const maskMap = {};
  for (const m of maskCounts) maskMap[m.created_by] = m.mask_count;

  const header = 'username,full_name,email,description,masks_created,login_count,total_time_hours,created_at';
  const rows = users.map(u => {
    const masks = maskMap[u.username] || 0;
    const hours = ((u.total_time_ms || 0) / 3600000).toFixed(2);
    const fullName = (u.full_name || '').replace(/"/g, '""');
    const desc = (u.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const email = (u.email || '').replace(/"/g, '""');
    return `${u.username},"${fullName}","${email}","${desc}",${masks},${u.login_count || 0},${hours},${u.created_at || ''}`;
  });

  const csv = header + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leucena_users_stats.csv');
  res.send('\uFEFF' + csv);
});

app.post('/api/admin/users/create', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'O usuário deve ter entre 2 e 30 caracteres' });
  if (!/^[a-z0-9.]+$/.test(username)) return res.status(400).json({ error: 'O usuário deve conter apenas letras minúsculas, números e ponto' });
  if (!/[a-z]/.test(username)) return res.status(400).json({ error: 'O usuário deve conter pelo menos uma letra' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail válido é obrigatório' });

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso' });

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  runSQL('INSERT INTO users (username, password_hash, created_at, email) VALUES (?, ?, ?, ?)', [username, hash, now, email]);
  logActivity(req.username, 'admin_create_user', null, null, { target_user: username });
  persist();
  res.json({ success: true, username });
});

app.put('/api/admin/users/:id/password', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { password } = req.body;
  if (!password || password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE id = ?', [hash, Number(req.params.id)]);
  logActivity(req.username, 'password_change', null, null, { target_user: user.username });
  persist();
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role === 'superadmin') return res.status(400).json({ error: 'Não é possível excluir um Super Admin' });

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
  logActivity(req.username, 'user_delete', null, null, { deleted_user: user.username, deleted_role: user.role });
  persist();
  io.emit('users:updated', Array.from(connectedUsers.values()));
  res.json({ success: true });
});

app.put('/api/admin/users/:id/role', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Apenas Super Admin pode alterar roles' });
  const { role } = req.body;
  const validRoles = ['superadmin', 'admin', 'team', 'contributor', 'tester'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Role inválido' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role === 'superadmin' && role !== 'superadmin' && user.username !== req.username) {
    return res.status(403).json({ error: 'Não é possível rebaixar outro Super Admin' });
  }
  const oldRole = user.role || 'contributor';
  runSQL('UPDATE users SET role = ? WHERE id = ?', [role, Number(req.params.id)]);
  logActivity(req.username, 'role_change', null, null, { target_user: user.username, from: oldRole, to: role });
  persist();
  res.json({ success: true });
});

app.put('/api/admin/users/:id/tester-mode', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { tester_mode } = req.body;
  if (!['team', 'contributor'].includes(tester_mode)) return res.status(400).json({ error: 'Modo inválido' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role !== 'tester') return res.status(400).json({ error: 'Usuário não é tester' });
  runSQL('UPDATE users SET tester_mode = ? WHERE id = ?', [tester_mode, Number(req.params.id)]);
  persist();
  res.json({ success: true });
});

app.put('/api/admin/users/:id/founder', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { is_founder } = req.body;
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!['superadmin', 'admin', 'team'].includes(user.role)) return res.status(400).json({ error: 'Apenas membros da equipe podem ser Idealizadores' });
  runSQL('UPDATE users SET is_founder = ? WHERE id = ?', [is_founder ? 1 : 0, Number(req.params.id)]);
  persist();
  res.json({ success: true });
});

app.post('/api/admin/users/:id/reset-token', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetTokens.set(user.username.toLowerCase(), { code, expires: Date.now() + RESET_TOKEN_TTL });
  logActivity(req.username, 'reset_token_generated', null, null, { target_user: user.username });
  res.json({ success: true, code, username: user.username, expiresInMinutes: RESET_TOKEN_TTL / 60000 });
});

app.get('/api/admin/passcode', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  res.json({ passcode: getNextPasscode() });
});

app.get('/api/admin/logs', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const format = req.query.format || 'json';
  const minutes = req.query.minutes ? Number(req.query.minutes) : null;
  let logs;
  if (minutes && minutes > 0) {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    logs = queryAll('SELECT * FROM activity_logs WHERE timestamp >= ? ORDER BY timestamp DESC', [since]);
  } else {
    logs = queryAll('SELECT * FROM activity_logs ORDER BY timestamp DESC');
  }
  if (format === 'csv') {
    const header = 'id,timestamp,username,action,cell_id,object_id,details\n';
    const rows = logs.map(l =>
      `${l.id},${l.timestamp},${l.username || ''},${l.action},${l.cell_id || ''},${l.object_id || ''},"${(l.details || '').replace(/"/g, '""')}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activity_logs.csv');
    return res.send(header + rows);
  }
  res.json(logs);
});

app.post('/api/log', requireAuth, (req, res) => {
  const events = req.body;
  if (!Array.isArray(events)) return res.status(400).json({ error: 'Expected array' });
  const max = Math.min(events.length, 50);
  for (let i = 0; i < max; i++) {
    const e = events[i];
    logActivity(req.username, e.action || 'unknown', e.cell_id || null, e.object_id || null, e.details || null);
  }
  res.json({ logged: max });
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

// ── Backup ──

const BACKUP_DIR = path.join(process.env.DATA_PATH || path.join(__dirname, 'data'), 'backups');
const MAX_BACKUPS = 10;

function createBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    persist();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(BACKUP_DIR, `leucena_${ts}.db`);
    fs.copyFileSync(DB_PATH, dest);

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
    }
    return dest;
  } catch (e) {
    console.error('Backup failed:', e.message);
    return null;
  }
}

setInterval(createBackup, 6 * 60 * 60 * 1000);

app.get('/api/admin/backup', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  persist();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  res.setHeader('Content-Disposition', `attachment; filename="leucena_backup_${ts}.db"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  const data = fs.readFileSync(DB_PATH);
  logActivity(req.username, 'db_backup_download', null, null, null);
  res.send(data);
});

app.get('/api/admin/backups', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse()
      .map(f => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
    res.json({ backups: files, dir: BACKUP_DIR });
  } catch (e) { res.json({ backups: [], dir: BACKUP_DIR }); }
});

app.post('/api/admin/backup', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const dest = createBackup();
  if (dest) {
    logActivity(req.username, 'db_backup_manual', null, null, null);
    res.json({ success: true, file: path.basename(dest) });
  } else {
    res.status(500).json({ error: 'Backup failed' });
  }
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

  if (status === 'finished' && !isTeamOrAbove(username)) {
    return res.status(403).json({ error: 'Colaboradores não podem finalizar células' });
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
  logActivity(username, 'cell_lock', Number(id), null, { prev_status: cell.grid_status });
  persist();
  res.json({ success: true, worked_by: workedBy.join(',') });
});

app.post('/api/grid/:id/heartbeat', requireAuth, (req, res) => {
  const { id } = req.params;
  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell || cell.locked_by !== req.username) return res.status(400).json({ error: 'Not locked by you' });
  runSQL('UPDATE grid_cells SET locked_at = ? WHERE id = ?', [new Date().toISOString(), Number(id)]);
  res.json({ success: true });
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

  if (newStatus === 'finished' && !isTeamOrAbove(username)) {
    const cellGeom = JSON.parse(cell.geometry);
    const cellRings = cellGeom.type === 'MultiPolygon'
      ? cellGeom.coordinates.map(p => p[0])
      : [cellGeom.coordinates[0]];
    const hasCrowdmapping = queryAll("SELECT geometry FROM occurrence_points WHERE layer = 'crowdmapping'")
      .some(p => {
        const g = JSON.parse(p.geometry);
        return cellRings.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
      });
    if (hasCrowdmapping) {
      return res.status(403).json({ error: 'crowdmapping_cell' });
    }
  }

  if (newStatus === 'finished') {
    const validation = validateFinished(Number(id));
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, uncoveredPointIds: validation.uncoveredPointIds || [] });
    }
    finishedBy = username;
  }

  if (newStatus === 'not_yet_finished') {
    const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? LIMIT 1', [Number(id)]);
    if (masks.length > 0) {
      newStatus = 'mapping';
    } else {
      const cellGeom = JSON.parse(cell.geometry);
      const cellRings = cellGeom.type === 'MultiPolygon'
        ? cellGeom.coordinates.map(p => p[0])
        : [cellGeom.coordinates[0]];
      const allPoints = queryAll('SELECT geometry FROM occurrence_points');
      const hasPoints = allPoints.some(p => {
        const g = JSON.parse(p.geometry);
        return cellRings.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
      });
      if (!hasPoints) newStatus = 'no_points';
    }
  }

  runSQL(
    'UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, finished_by = ?, updated_at = ? WHERE id = ?',
    [newStatus, finishedBy, now, Number(id)]
  );

  const cellPolys = queryAll('SELECT geometry FROM polygons WHERE grid_cell_id = ?', [Number(id)]);
  let cellMaskCount = cellPolys.length;
  let cellAreaHa = 0;
  for (const p of cellPolys) {
    try { cellAreaHa += polygonAreaHa(JSON.parse(p.geometry)); } catch (e) {}
  }
  cellAreaHa = Math.round(cellAreaHa * 10) / 10;

  io.emit('cell:unlocked', { cellId: Number(id), username });
  io.emit('cell:statusChanged', { cellId: Number(id), status: newStatus, username, finished_by: finishedBy });
  logActivity(username, 'cell_unlock', Number(id), null, JSON.stringify({ newStatus }));
  persist();
  res.json({ success: true, status: newStatus, maskCount: cellMaskCount, areaHa: cellAreaHa });
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
  const roleCache = {};
  function creatorRole(username) {
    if (!username) return 'contributor';
    if (roleCache[username] !== undefined) return roleCache[username];
    const u = queryOne('SELECT role, tester_mode FROM users WHERE username = ?', [username]);
    let r = (u && u.role) || 'contributor';
    if (r === 'superadmin') r = 'admin';
    if (r === 'tester') r = (u && u.tester_mode) || 'contributor';
    roleCache[username] = r;
    return roleCache[username];
  }
  const features = polys.map(p => ({
    type: 'Feature',
    properties: {
      id: p.id,
      grid_cell_id: p.grid_cell_id,
      created_by: p.created_by,
      created_by_role: creatorRole(p.created_by),
      created_at: p.created_at,
      updated_at: p.updated_at,
      area_ha: p.area_ha || 0
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
  const areaHa = Math.round(polygonAreaHa(geometry) * 100000) / 100000;
  runSQL(
    'INSERT INTO polygons (id, grid_cell_id, geometry, created_by, created_at, updated_at, area_ha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, Number(grid_cell_id), JSON.stringify(geometry), username || 'anonymous', now, now, areaHa]
  );

  const effRole = getEffectiveRole(username);
  const polyRole = effRole === 'superadmin' ? 'admin' : effRole;
  const polygon = { id, grid_cell_id: Number(grid_cell_id), geometry, created_by: username, created_by_role: polyRole, created_at: now, updated_at: now, area_ha: areaHa };
  io.emit('polygon:created', polygon);
  logActivity(username, 'polygon_create', Number(grid_cell_id), id, null);
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
  const areaHa = Math.round(polygonAreaHa(geometry) * 100000) / 100000;
  runSQL('UPDATE polygons SET geometry = ?, updated_at = ?, area_ha = ? WHERE id = ?', [JSON.stringify(geometry), now, areaHa, id]);

  io.emit('polygon:updated', { id, geometry, updated_at: now, area_ha: areaHa });
  logActivity(username, 'polygon_edit', poly.grid_cell_id, id, null);
  persist();
  res.json({ success: true, area_ha: areaHa });
});

app.delete('/api/polygons/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  const poly = queryOne('SELECT * FROM polygons WHERE id = ?', [id]);
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado' });

  if (!canDeleteMask(username, poly.created_by)) {
    return res.status(403).json({ error: `Este polígono pertence a ${poly.created_by}. Somente o criador ou um administrador pode excluí-lo.` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
  }

  runSQL('DELETE FROM polygons WHERE id = ?', [id]);
  io.emit('polygon:deleted', { id, grid_cell_id: poly.grid_cell_id });
  logActivity(username, 'polygon_delete', poly.grid_cell_id, id, null);
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

  if (!isTeamOrAbove(username)) {
    return res.status(403).json({ error: 'Colaboradores não podem adicionar pontos' });
  }

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
  logActivity(username, 'point_create', gridCell ? gridCell.id : null, String(inserted.id), { fid: newFid, lat, lng, layer: pointLayer });
  persist();
  res.json(pointData);
});

app.delete('/api/points/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  if (!isTeamOrAbove(username)) {
    return res.status(403).json({ error: 'Colaboradores não podem excluir pontos' });
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
  logActivity(username, 'point_delete', gridCell ? gridCell.id : null, String(id), { fid: point.fid, layer: point.layer });
  persist();
  res.json({ success: true, gridStatusChanged });
});

app.put('/api/points/:id/validity', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) {
    return res.status(403).json({ error: 'Apenas membros e administradores podem alterar a validade de pontos' });
  }
  const { id } = req.params;
  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Ponto não encontrado' });

  const currentStatus = point.status || 0;
  const newStatus = (currentStatus + 1) % 3; // 0→1→2→0
  runSQL('UPDATE occurrence_points SET status = ?, not_valid = ? WHERE id = ?', [newStatus, newStatus, Number(id)]);

  io.emit('point:validityChanged', { id: Number(id), not_valid: newStatus, status: newStatus });
  logActivity(req.username, 'point_status_change', null, String(id), JSON.stringify({ from: currentStatus, to: newStatus }));
  persist();
  res.json({ id: Number(id), not_valid: newStatus, status: newStatus });
});

// ── Export ──

app.get('/api/export/geojson', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) {
    return res.status(403).json({ error: 'Exportação de máscaras disponível a partir do segundo semestre de 2026' });
  }
  const polys = queryAll('SELECT * FROM polygons');
  const fc = {
    type: 'FeatureCollection',
    features: polys.map(p => ({
      type: 'Feature',
      properties: {
        id: p.id,
        grid_cell_id: p.grid_cell_id,
        created_by: p.created_by,
        created_at: p.created_at,
        area_ha: p.area_ha || 0
      },
      geometry: JSON.parse(p.geometry)
    }))
  };
  logActivity(req.username, 'export_masks', null, null, { count: fc.features.length });
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
  const uname = getUsernameFromToken(req);
  if (uname) logActivity(uname, 'export_grid', null, null, { count: fc.features.length });
  res.setHeader('Content-Disposition', 'attachment; filename="grid_status.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

app.get('/api/export/points', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) {
    return res.status(403).json({ error: 'Exportação de pontos disponível a partir do segundo semestre de 2026' });
  }
  const points = queryAll('SELECT * FROM occurrence_points');
  const fc = {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      properties: { id: p.id, fid: p.fid, status: p.status || 0, layer: p.layer || 'crowdmapping' },
      geometry: JSON.parse(p.geometry)
    }))
  };
  logActivity(req.username, 'export_points', null, null, { count: fc.features.length });
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
    runSQL('UPDATE users SET last_active = ? WHERE username = ?', [new Date().toISOString(), data.username]);
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
      logActivity(user.username, 'disconnect', null, null, null);
      const now = new Date().toISOString();
      const locked = queryAll('SELECT id FROM grid_cells WHERE locked_by = ?', [user.username]);
      for (const cell of locked) {
        const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? LIMIT 1', [cell.id]);
        const newStatus = masks.length > 0 ? 'mapping' : 'not_yet_finished';
        runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, updated_at = ? WHERE id = ?',
          [newStatus, now, cell.id]);
        io.emit('cell:unlocked', { cellId: cell.id, previousUser: user.username });
        io.emit('cell:statusChanged', { cellId: cell.id, status: newStatus, username: user.username });
        logActivity(user.username, 'cell_unlock_disconnect', cell.id, null, JSON.stringify({ newStatus }));
      }
      if (locked.length > 0) persist();

      const sessionMs = Date.now() - new Date(user.joinedAt).getTime();
      if (sessionMs > 0 && sessionMs < 86400000) {
        runSQL('UPDATE users SET total_time_ms = COALESCE(total_time_ms, 0) + ?, last_active = ? WHERE username = ?', [sessionMs, new Date().toISOString(), user.username]);
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

  const emptyArea = queryAll('SELECT id, geometry FROM polygons WHERE area_ha IS NULL OR area_ha = 0');
  if (emptyArea.length > 0) {
    for (const p of emptyArea) {
      try {
        const ha = polygonAreaHa(JSON.parse(p.geometry));
        runSQL('UPDATE polygons SET area_ha = ? WHERE id = ?', [Math.round(ha * 100000) / 100000, p.id]);
      } catch (e) {}
    }
    persist();
    console.log(`  Backfilled area_ha for ${emptyArea.length} polygons`);
  }

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
