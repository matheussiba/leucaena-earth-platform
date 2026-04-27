const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const crypto = require('crypto');

try {
  const envFile = require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8');
  for (let line of envFile.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch (e) { /* no .env file, use system env vars */ }
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { initDB, queryAll, queryOne, runSQL, persist, DB_PATH } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const BUILD_ID = Date.now().toString();

const fs = require('fs');
const backupRemote = require('./backup-remote');
const { validatePolygonGeometry } = require('./geometry-validate');

const { Resend } = require('resend');

const GMAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';
const GA_ID = process.env.GOOGLE_ANALYTICS_ID || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'leucaena.earth <noreply@leucaena.earth>';
const IMMUTABLE_USER = process.env.IMMUTABLE_USER || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function getBaseUrl(req) {
  if (process.env.NODE_ENV === 'production') return 'https://map.leucaena.earth';
  return req.protocol + '://' + req.get('host');
}

function sendWelcomeInboxMessage(targetUsername) {
  const existing = queryOne("SELECT id FROM messages WHERE target = ? AND subject LIKE '%Bem-vindo%leucaena%'", [targetUsername]);
  if (existing) return;
  const admin = queryOne("SELECT username FROM users WHERE role = 'superadmin' AND is_active = 1 ORDER BY id ASC LIMIT 1");
  const sender = admin ? admin.username : 'leucaena.earth';
  const now = new Date().toISOString();
  const subject = 'Bem-vindo ao leucaena.earth! 🌱';
  const body =
    'Olá! Bem-vindo(a) ao leucaena.earth!\n\n' +
    'Fico feliz demais que você quer fazer parte desse projeto científico com a gente!\n\n' +
    'Antes de começar, dá uma olhada na seção "Como mapear" (ícone 📖 no menu), pois lá tem instruções e um vídeo tutorial bem importantes.\n\n' +
    'Uma coisa bacana: só de mapear 1 polígono de leucena (desenhar o contorno de um aglomerado), você já passa a aparecer na seção de colaboradores do site!\n\n' +
    'Qualquer dúvida, sugestão ou ideia, pode responder esta mensagem. Vou ficar muito feliz em ajudar!\n\n' +
    'Um forte abraço!';
  // is_system = 1 keeps these auto-messages from flooding the super admin's inbox.
  // Only the actual recipient (target) sees them; the visibility query treats
  // them as targeted-only regardless of the requester's role.
  runSQL('INSERT INTO messages (sender, subject, body, target, allow_reply, is_system, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)',
    [sender, subject, body, targetUsername, now]);

  const nowPlus1 = new Date(Date.now() + 1000).toISOString();
  const newsSubject = 'Novidades: Vídeo tutorial de mapeamento 📺';
  const newsBody =
    'Foi adicionado um vídeo na seção "Como Mapear" explicando o procedimento de mapeamento.\n\n' +
    'O objetivo é que sejam desenhados polígonos ao redor dos aglomerados de leucena (áreas onde há duas ou mais leucenas juntas) sobre as imagens de satélite.\n\n' +
    'O vídeo explica como fazer isso passo a passo!\n\n' +
    '🎬 Assista ao vídeo: https://www.youtube.com/watch?v=S7NCnasL1oQ\n\n' +
    'Ou acesse a seção "Como Mapear" no menu superior (ícone 📖).';
  runSQL('INSERT INTO messages (sender, subject, body, target, allow_reply, is_system, created_at) VALUES (?, ?, ?, ?, 0, 1, ?)',
    [sender, newsSubject, newsBody, targetUsername, nowPlus1]);

  console.log(`[inbox] Welcome + news messages created for ${targetUsername} from ${sender}`);
}

async function sendWelcomeEmail(user) {
  if (!resend || !user.email) return;
  const firstName = (user.full_name || user.username || '').split(/\s+/)[0];
  const isGoogle = user.auth_provider === 'google';
  const credentialsBlock = isGoogle
    ? `<p>Você pode entrar usando sua conta <strong>Google</strong> a qualquer momento.</p>`
    : `<p>Para o seu primeiro acesso, seguem suas credenciais:</p>
       <p><strong>Usuário:</strong> ${escapeHtml(user.username)}<br><strong>E-mail:</strong> ${escapeHtml(user.email)}<br><strong>Senha:</strong> a senha que você definiu no cadastro<br>
       <em>(Você pode alterar a senha no menu da engrenagem depois que entrar.)</em></p>`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.7">
  <p>Olá <strong>${escapeHtml(firstName)}</strong>!! Bem-vindo ao <a href="https://leucaena.earth/" style="color:#22c55e;font-weight:600">leucaena.earth</a>! 🌱</p>
  <p>Fico feliz demais que você entrou em contato e quer fazer parte desse projeto científico com a gente!</p>
  ${credentialsBlock}
  <p>Antes de começar, peço, por gentileza, que dê uma olhada na seção "<a href="https://map.leucaena.earth/#howto" style="color:#22c55e;font-weight:600">Como mapear</a>", pois lá tem instruções bem importantes.</p>
  <p>Ahh... e uma coisa bem bacana que é importante você saber é que só de mapear <strong>1 polígono de leucena</strong> (ou seja, desenhar o contorno de um aglomerado, uma área onde há duas ou mais leucenas juntas), você já passa a aparecer na <strong>seção de colaboradores do site</strong>!</p>
  <p>E esse trabalho vai além do mapeamento em si. A ideia é usar esses polígonos para gerar produtos como <strong>mapas da distribuição da leucena, estimativas de biomassa e estoque de carbono</strong>, e depois disponibilizar tudo isso de <strong>forma aberta no próprio site para apoiar pesquisa, gestão e tomada de decisão</strong>.</p>
  <p>E qualquer dúvida, sugestão de melhoria ou ideia de funcionalidade para o site, pode me mandar mensagem sem problema, vou ficar muito feliz em poder incorporar essas ideias na plataforma!</p>
  <p>Um forte abraço!</p>
</div>`;
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: user.email,
      subject: 'Bem-vindo ao leucaena.earth! 🌱',
      html
    });
    console.log(`Welcome email sent to ${user.email}`);
  } catch (e) {
    console.error('Welcome email error:', e.message, e);
  }
}
const GA_SCRIPT = GA_ID
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`
  : '';

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

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>leucaena.earth / Manutenção</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a 0%,#1a2e1a 50%,#0f172a 100%);color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow:hidden}
.card{text-align:center;max-width:520px;padding:48px 40px;border:1px solid rgba(34,197,94,.2);border-radius:24px;background:rgba(30,41,59,.85);backdrop-filter:blur(12px);box-shadow:0 0 80px rgba(34,197,94,.08);animation:fadeUp .8s ease-out}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.logo{width:120px;height:120px;margin:0 auto 24px;border-radius:50%;border:3px solid rgba(34,197,94,.3);padding:8px;background:rgba(15,23,42,.6)}
.logo img{width:100%;height:100%;object-fit:contain;border-radius:50%}
h1{font-size:26px;margin-bottom:6px;color:#22c55e;letter-spacing:-.5px}
h2{font-size:16px;font-weight:400;color:#64748b;margin-bottom:28px}
.message{font-size:17px;line-height:1.7;color:#cbd5e1;margin-bottom:12px}
.message .accent{color:#22c55e;font-weight:600}
.gears{font-size:56px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:2px}
.gear{display:inline-block;animation:spin 3s linear infinite}
.gear:nth-child(2){animation-direction:reverse;animation-duration:2.4s;font-size:36px;margin-top:14px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.sub{font-size:13px;color:#475569;margin-top:16px}
.dots{display:flex;gap:6px;justify-content:center;margin-top:24px}
.dots span{width:6px;height:6px;border-radius:50%;background:#22c55e;opacity:.4;animation:pulse 1.4s ease-in-out infinite}
.dots span:nth-child(2){animation-delay:.2s}
.dots span:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
</style>
</head>
<body>
<div class="card">
  <div class="logo"><img src="/img/leucaena-earth-logo.png" alt="leucaena.earth"></div>
  <h1>leucaena.earth</h1>
  <h2>Plataforma de Mapeamento</h2>
  <div class="gears"><span class="gear">⚙️</span><span class="gear">⚙️</span></div>
  <div class="message">
    Estamos fazendo alguns ajustes para<br>
    melhorar sua experiência.<br>
    <span class="accent">Já já estamos de volta!</span>
  </div>
  <div class="sub">Agradecemos a paciência</div>
  <div class="dots"><span></span><span></span><span></span></div>
</div>
</body>
</html>`;

function isMaintenanceModeEnabled() {
  const v = (process.env.MAINTENANCE_MODE || '').toString().trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

const MAP_HOSTS = ['map.leucaena.earth', 'localhost', '127.0.0.1'];

function isMapHost(req) {
    const host = (req.hostname || req.headers.host || '').split(':')[0];
  return MAP_HOSTS.some(h => host === h) || host.endsWith('.onrender.com');
}

/** Maintenance splash on the map platform (map host + localhost for local testing). */
function isMaintenancePlatformHost(req) {
  const host = (req.hostname || req.headers.host || '').split(':')[0];
  return host === 'map.leucaena.earth' || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.onrender.com');
}

function parseCookies(req) {
  const str = req.headers.cookie || '';
  const map = {};
  str.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx < 1) return;
    map[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
  });
  return map;
}

function hasMaintenanceBypass(req, res) {
  const token = process.env.MAINTENANCE_BYPASS_TOKEN;
  if (!token) return false;
  if (req.query.bypass === token) {
    res.cookie('maint_bypass', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000
    });
    return true;
  }
  const cookies = parseCookies(req);
  return cookies.maint_bypass === token;
}

app.use((req, res, next) => {
  if (!isMaintenanceModeEnabled()) return next();
  if (!isMaintenancePlatformHost(req)) return next();
  if (hasMaintenanceBypass(req, res)) return next();
  const p = req.path || '';
  if (p === '/landing' || p === '/landing.html') return next();
  if (req.path.startsWith('/api/')) return next();
  if (p.startsWith('/img/') || p.startsWith('/css/') || p.startsWith('/js/') || p.startsWith('/fonts/')) {
    return next();
  }
  return res.status(200).type('html').set('X-Robots-Tag', 'noindex').send(MAINTENANCE_HTML);
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://map.leucaena.earth', 'https://leucaena.earth'];

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.get('/', (req, res) => {
  if (isMapHost(req)) {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const mapsUrl = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=drawing,geometry&callback=initGoogleMapsCallback`;
    res.send(html.replace('__GOOGLE_MAPS_SCRIPT_URL__', mapsUrl).replace('__GA_SCRIPT__', GA_SCRIPT));
  } else {
    const mapUrl = `https://map.leucaena.earth`;
    const html = fs.readFileSync(path.join(__dirname, 'public', 'landing.html'), 'utf8');
    res.send(html.replace(/__MAP_URL__/g, mapUrl).replace('__GA_SCRIPT__', GA_SCRIPT));
  }
});

app.get('/landing', (req, res) => {
  const mapUrl = req.protocol + '://' + req.get('host');
  const html = fs.readFileSync(path.join(__dirname, 'public', 'landing.html'), 'utf8');
  res.send(html.replace(/__MAP_URL__/g, mapUrl).replace('__GA_SCRIPT__', GA_SCRIPT));
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

const loginLimiter = rateLimit('login', 10, 15 * 60 * 1000);
const registerLimiter = rateLimit('register', 5, 60 * 60 * 1000);
const resetLimiter = rateLimit('reset', 5, 15 * 60 * 1000);
const messageLimiter = rateLimit('message', 10, 15 * 60 * 1000);
const checkEmailLimiter = rateLimit('checkEmail', 15, 15 * 60 * 1000);

const MSG_SUBJECT_MAX = 200;
const MSG_BODY_MAX = 2000;
const MSG_COOLDOWN_MS = 10000;
const MSG_DAILY_CONTRIBUTOR = 20;
const MSG_DAILY_ADMIN = 100;

function checkMessageLimits(username) {
  const last = queryOne('SELECT created_at FROM messages WHERE sender = ? ORDER BY id DESC LIMIT 1', [username]);
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < MSG_COOLDOWN_MS) {
      const wait = Math.ceil((MSG_COOLDOWN_MS - elapsed) / 1000);
      return { error: `Aguarde ${wait}s antes de enviar outra mensagem.`, retryAfter: wait };
    }
  }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const row = queryOne('SELECT COUNT(*) as cnt FROM messages WHERE sender = ? AND created_at >= ?', [username, todayStart.toISOString()]);
  const count = row ? row.cnt : 0;
  const dailyMax = isAdmin(username) ? MSG_DAILY_ADMIN : MSG_DAILY_CONTRIBUTOR;
  if (count >= dailyMax) {
    return { error: `Limite diário de ${dailyMax} mensagens atingido.` };
  }
  return null;
}

const MSG_IMG_REGEX = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MSG_IMG_MAX_CHARS = 300000;
const MSG_IMG_MAX_COUNT = 2;

function validateMessageImages(images) {
  if (!images || (Array.isArray(images) && images.length === 0)) return [];
  if (!Array.isArray(images)) throw new Error('images must be an array');
  if (images.length > MSG_IMG_MAX_COUNT) throw new Error(`Máximo de ${MSG_IMG_MAX_COUNT} imagens por mensagem`);
  const clean = [];
  for (const img of images) {
    if (typeof img !== 'string') throw new Error('Invalid image data');
    if (img.length > MSG_IMG_MAX_CHARS) throw new Error('Imagem muito grande (máx. ~200KB cada)');
    if (!MSG_IMG_REGEX.test(img)) throw new Error('Formato de imagem inválido');
    clean.push(img);
  }
  return clean;
}

function stripHtmlTags(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeMessageHtml(html) {
  if (!html) return '';
  let s = html;
  s = s.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^]*?<\/\1>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^>]*\/?>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  s = s.replace(/javascript\s*:/gi, '');
  return s;
}

function validateMessageText(subject, body) {
  if (!subject || !body) return 'subject and body are required';
  if (typeof subject !== 'string' || typeof body !== 'string') return 'subject and body must be strings';
  if (subject.trim().length === 0) return 'subject cannot be empty';
  const textLen = stripHtmlTags(body).length;
  if (textLen === 0) return 'body cannot be empty';
  if (subject.trim().length > MSG_SUBJECT_MAX) return `Assunto deve ter no máximo ${MSG_SUBJECT_MAX} caracteres`;
  if (textLen > MSG_BODY_MAX) return `Mensagem deve ter no máximo ${MSG_BODY_MAX} caracteres`;
  return null;
}

// ── Password reset tokens (in-memory, expire in 30 min) ──

const resetTokens = new Map();
const RESET_TOKEN_TTL = 30 * 60 * 1000;
/** Unverified local accounts older than this are removed (contributors only). */
const UNVERIFIED_ACCOUNT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const connectedUsers = new Map();

function getUniqueUsers() {
  const byUsername = new Map();
  for (const user of connectedUsers.values()) {
    const existing = byUsername.get(user.username);
    if (!existing) {
      byUsername.set(user.username, { ...user });
    } else {
      if (user.editingCell && !existing.editingCell) {
        existing.editingCell = user.editingCell;
      }
      if (user.activity && !existing.activity) {
        existing.activity = user.activity;
      }
      if (user.locationState && !existing.locationState) {
        existing.locationState = user.locationState;
      }
    }
  }
  const result = [];
  for (const u of byUsername.values()) {
    const dbUser = queryOne('SELECT role FROM users WHERE username = ?', [u.username]);
    if (dbUser && dbUser.role === 'tester') continue;
    if (u.editingCell) {
      const cell = queryOne('SELECT grid_id, fid FROM grid_cells WHERE id = ?', [u.editingCell]);
      u.editingCellName = cell ? (cell.grid_id || String(cell.fid)) : String(u.editingCell);
      const stateRow = queryOne('SELECT state FROM grid_cell_states WHERE grid_cell_id = ? LIMIT 1', [u.editingCell]);
      u.editingCellState = stateRow ? stateRow.state : null;
    }
    result.push(u);
  }
  return result;
}

function userHasOtherSockets(socketId, username) {
  for (const [sid, u] of connectedUsers.entries()) {
    if (sid !== socketId && u.username === username) return true;
  }
  return false;
}

const sessions = new Map();
const oauthCodes = new Map();
const LOCK_TIMEOUT_MS = 30 * 60 * 1000;
// Role ladder: superadmin > admin > team > contributor > tester; testers use tester_mode as their effective role for caps.
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
function getSuperAdminUsernames() {
  return queryAll("SELECT username FROM users WHERE role = 'superadmin'").map(u => u.username);
}
function isTeamOrAbove(username) {
  const eff = getEffectiveRole(username);
  return eff === 'superadmin' || eff === 'admin' || eff === 'team';
}
function canDeleteMask(username, maskCreator) {
  if (isAdmin(username)) return true;
  return maskCreator === username;
}

// Notify superadmins via email when an admin (non-superadmin) performs sensitive actions
// Actions: password_change, username_change, user_deactivate, user_reactivate
async function notifySuperAdminsOfAdminAction(actorUsername, actionLabel, targetUsername, extraInfo) {
  if (!resend) return;
  if (isSuperAdmin(actorUsername)) return;
  const saEmails = queryAll("SELECT email FROM users WHERE role = 'superadmin' AND email IS NOT NULL AND email != ''").map(u => u.email);
  if (saEmails.length === 0) return;
  const subject = `[Leucaena.Earth] Admin action: ${actionLabel}`;
  const html = `<p>O admin <strong>${escapeHtml(actorUsername)}</strong> realizou a seguinte ação:</p>
    <p><strong>${escapeHtml(actionLabel)}</strong> no usuário <strong>${escapeHtml(targetUsername)}</strong></p>
    ${extraInfo ? `<p>Detalhes: ${escapeHtml(extraInfo)}</p>` : ''}
    <p style="font-size:13px;color:#64748b;">Esta notificação é automática. Apenas admins (não super admins) geram esta notificação.</p>`;
  for (const email of saEmails) {
    try { await resend.emails.send({ from: RESEND_FROM, to: email, subject, html }); } catch (e) { /* ignore */ }
  }
}

const bcrypt = require('bcryptjs');
const PASSWORD_SALT = process.env.PASSWORD_SALT || 'default_salt';
const BCRYPT_ROUNDS = 10;

function hashPasswordLegacy(password) {
  return crypto.createHash('sha256').update(password + PASSWORD_SALT).digest('hex');
}

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, storedHash) {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(password, storedHash);
  }
  return hashPasswordLegacy(password) === storedHash;
}

function needsRehash(storedHash) {
  return !(storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$'));
}

let _logCleanupCounter = 0;
// Amortized retention: every 50 inserts, purge activity_logs older than 48h.
//
// Backwards compatible signature: (username, action, cellId, objectId, details, role).
// The new optional 7th arg `ctx` accepts either an Express `req` (we'll
// extract device info from it) or an object like `{ device_type, os, browser,
// user_agent, ip }`. We keep the legacy positional form so the dozens of
// existing call sites don't have to change.
function logActivity(username, action, cellId, objectId, details, role, ctx) {
  try {
    const dets = (details && typeof details === 'object') ? JSON.stringify(details) : (details || null);
    const userRole = role || (username ? (getUserRole(username) || null) : null);
    let device = null;
    if (ctx) {
      // Heuristic: if it walks like a req object, extract from it.
      if (ctx.headers || ctx.connection || ctx.ip) {
        device = _deviceContextFromReq(ctx);
      } else {
        device = ctx;
      }
    }
    const dev = device || {};
    runSQL(
      'INSERT INTO activity_logs (timestamp, username, action, cell_id, object_id, details, role, device_type, os, browser, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [new Date().toISOString(), username || null, action, cellId || null, objectId || null, dets, userRole,
        dev.device_type || null, dev.os || null, dev.browser || null,
        dev.user_agent ? String(dev.user_agent).slice(0, 500) : null, dev.ip || null]
    );
    if (++_logCleanupCounter >= 50) {
      _logCleanupCounter = 0;
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      runSQL('DELETE FROM activity_logs WHERE timestamp < ?', [cutoff]);
    }
  } catch (e) { /* ignore logging errors */ }
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Persistence helpers. The in-memory `sessions` Map stays the hot path; the SQLite table is
// only the durable mirror so tokens survive a redeploy/restart. All writes are best-effort —
// if the DB write throws we still keep the in-memory entry so the live request succeeds.
function _persistSession(token, username, createdAt, expiresAt) {
  try {
    runSQL(
      'INSERT OR REPLACE INTO sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [token, username, createdAt, expiresAt]
    );
  } catch (e) { /* best effort */ }
}
function deleteSession(token) {
  sessions.delete(token);
  try { runSQL('DELETE FROM sessions WHERE token = ?', [token]); } catch (e) { /* best effort */ }
}
function deleteSessionsForUser(username) {
  for (const [token, session] of sessions.entries()) {
    const u = typeof session === 'string' ? session : session && session.username;
    if (u === username) sessions.delete(token);
  }
  try { runSQL('DELETE FROM sessions WHERE username = ?', [username]); } catch (e) { /* best effort */ }
}

// Rehydrate the in-memory map from disk on boot. Called from start() after initDB().
function _hydrateSessionsFromDisk() {
  try {
    const now = Date.now();
    runSQL('DELETE FROM sessions WHERE expires_at < ?', [now]);
    const rows = queryAll('SELECT token, username, created_at, expires_at FROM sessions');
    for (const r of rows) {
      sessions.set(r.token, { username: r.username, createdAt: r.created_at, expiresAt: r.expires_at });
    }
    if (rows.length > 0) console.log(`  Restored ${rows.length} active session(s) from disk`);
  } catch (e) { console.error('Session hydration failed:', e.message); }
}

function createSession(username) {
  const token = uuidv4();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  sessions.set(token, { username, createdAt: now, expiresAt });
  _persistSession(token, username, now, expiresAt);
  return token;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (typeof session !== 'string' && session.expiresAt && now > session.expiresAt) {
      sessions.delete(token);
    }
  }
  try { runSQL('DELETE FROM sessions WHERE expires_at < ?', [now]); } catch (e) { /* best effort */ }
}, 60 * 60 * 1000);

function getUsernameFromToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const session = sessions.get(token);
  if (!session) return null;
  if (typeof session === 'string') return session;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    deleteSession(token);
    return null;
  }
  return session.username;
}

function isSessionExpired(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  const session = sessions.get(token);
  if (!session) return false;
  if (typeof session === 'string') return false;
  return session.expiresAt && Date.now() > session.expiresAt;
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return local.charAt(0) + '***@' + domain;
}

/**
 * Full account removal (polygons → deleted user, sessions cleared). Used by superadmin delete and purge job.
 * @param {object} user - row from users
 * @param {string|null} logActorUsername - superadmin who triggered delete, or null for system purge
 */
function permanentlyDeleteUserAccount(user, logActorUsername, req) {
  if (!user || user.username === 'deleted') return;

  const deletedExists = queryOne("SELECT id FROM users WHERE username = 'deleted'");
  if (!deletedExists) {
    const hash = hashPassword('__system_deleted__');
    const now = new Date().toISOString();
    runSQL("INSERT INTO users (username, password_hash, created_at, is_active) VALUES ('deleted', ?, ?, 0)", [hash, now]);
  }

  runSQL("UPDATE polygons SET created_by = 'deleted' WHERE created_by = ?", [user.username]);
  runSQL("UPDATE grid_cells SET worked_by = REPLACE(worked_by, ?, 'deleted') WHERE worked_by LIKE ?",
    [user.username, `%${user.username}%`]);
  runSQL("UPDATE grid_cells SET finished_by = 'deleted' WHERE finished_by = ?", [user.username]);
  const lockedByDeleted = queryAll('SELECT id, geometry FROM grid_cells WHERE locked_by = ?', [user.username]);
  for (const cell of lockedByDeleted) {
    const newStatus = determineCellStatusOnUnlock(cell.id, cell.geometry);
    runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ? WHERE id = ?', [newStatus, cell.id]);
  }

  deleteSessionsForUser(user.username);

  runSQL('UPDATE users SET email = NULL, google_id = NULL, verification_token = NULL, verification_expires = NULL WHERE id = ?', [user.id]);
  runSQL('DELETE FROM users WHERE id = ?', [user.id]);

  if (logActorUsername) {
    logActivity(logActorUsername, 'user_delete', null, null, { deleted_user: user.username, deleted_role: user.role }, null, req);
  } else {
    logActivity(null, 'user_purge_unverified', null, null, { username: user.username, id: user.id });
  }
  persist();
}

function purgeExpiredUnverifiedUsers() {
  const cutoffIso = new Date(Date.now() - UNVERIFIED_ACCOUNT_MAX_AGE_MS).toISOString();
  const candidates = queryAll(
    `SELECT * FROM users WHERE username != 'deleted'
     AND (email_verified IS NULL OR email_verified = 0)
     AND (auth_provider IS NULL OR auth_provider = 'local')
     AND created_at IS NOT NULL AND created_at < ?
     AND COALESCE(role, 'contributor') NOT IN ('superadmin', 'admin', 'team', 'tester')`,
    [cutoffIso]
  );
  if (candidates.length === 0) return;
  for (const user of candidates) {
    permanentlyDeleteUserAccount(user, null);
  }
  try {
    io.emit('users:updated', getUniqueUsers());
  } catch (e) { /* ignore */ }
  console.log(`[purge] Removed ${candidates.length} unverified account(s) older than 7 days`);
}

function requireAuth(req, res, next) {
  if (isSessionExpired(req)) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.', code: 'SESSION_EXPIRED' });
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Login necessário' });
  req.username = username;
  next();
}

function requireVerified(req, res, next) {
  const user = queryOne('SELECT email_verified, auth_provider, role FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  if (user.auth_provider === 'google') return next();
  if (user.role === 'tester') return next();
  if (!user.email_verified) return res.status(403).json({ error: 'Verifique seu e-mail antes de usar a plataforma', code: 'EMAIL_NOT_VERIFIED' });
  next();
}

function determineCellStatusOnUnlock(cellId, cellGeometry) {
  const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL LIMIT 1', [cellId]);
  if (masks.length > 0) return 'mapping';
  try {
    const cellGeom = typeof cellGeometry === 'string' ? JSON.parse(cellGeometry) : cellGeometry;
    const cellRings = cellGeom.type === 'MultiPolygon'
      ? cellGeom.coordinates.map(p => p[0])
      : [cellGeom.coordinates[0]];
    const allPts = queryAll('SELECT geometry FROM occurrence_points');
    const hasPoints = allPts.some(p => {
      const g = JSON.parse(p.geometry);
      return cellRings.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
    });
    return hasPoints ? 'not_yet_finished' : 'no_points';
  } catch (e) {
    return 'not_yet_finished';
  }
}

function releaseExpiredLocks() {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString();
  const now = new Date().toISOString();
  const expired = queryAll('SELECT id, locked_by, geometry, grid_id, fid FROM grid_cells WHERE locked_at IS NOT NULL AND locked_at < ?', [cutoff]);
  for (const cell of expired) {
    const newStatus = determineCellStatusOnUnlock(cell.id, cell.geometry);
    runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, updated_at = ? WHERE id = ?',
      [newStatus, now, cell.id]);
    io.emit('cell:unlocked', { cellId: cell.id, previousUser: cell.locked_by, cellName: cell.grid_id || String(cell.fid) });
    io.emit('cell:statusChanged', { cellId: cell.id, status: newStatus, username: cell.locked_by });
  }
}

setInterval(releaseExpiredLocks, 30000);

// Ray casting on lng/lat plane; odd intersection count ⇒ inside (not true geodesic).
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

// Spherical excess on R=6371km → geodesic ring area in m² (Shoelace on the sphere).
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

/** Per-cell polygon stats: count, summed area (ha), comma-separated distinct authors (excludes deleted). */
function getCellMaskSummary(gridCellId) {
  const polys = queryAll(
    'SELECT geometry, area_ha, created_by FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL',
    [Number(gridCellId)]
  );
  const authors = new Set();
  let cellAreaHa = 0;
  for (const p of polys) {
    let ha = p.area_ha != null ? Number(p.area_ha) : 0;
    if (!ha || ha <= 0) {
      try {
        ha = polygonAreaHa(JSON.parse(p.geometry));
      } catch (e) {
        ha = 0;
      }
    }
    cellAreaHa += ha;
    if (p.created_by && p.created_by !== 'deleted') authors.add(p.created_by);
  }
  cellAreaHa = Math.round(cellAreaHa * 10) / 10;
  const mappedBy = authors.size ? [...authors].sort().join(',') : null;
  return { mask_count: polys.length, mask_area_ha: cellAreaHa, mapped_by: mappedBy };
}

// If multiple cells contain the point, pick the one with smallest bbox (inner over outer overlap).
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

function isLngLatInsideCellGeometry(geom, lng, lat) {
  const rings = geom.type === 'MultiPolygon'
    ? geom.coordinates.map(p => p[0])
    : [geom.coordinates[0]];
  return rings.some(ring => pointInPolygon([lng, lat], ring));
}

// Block "finished" unless every status=0 point in the cell lies in a mask exterior or within ~5.5m of the outer ring.
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

  const polys = queryAll('SELECT * FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL', [cellId]);

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

// ── Device detection helpers ──
//
// We don't pull in an external UA parser to keep cold-start light; the regex
// below covers > 99% of browsers we see in production. `parseUserAgent` is
// the canonical entry point and returns { device_type, os, browser } so the
// activity log row carries enough context to debug issues without asking the
// user "what device are you on?".

function isMobileUA(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  return /mobile|android|iphone|ipad|ipod|webos|blackberry|opera mini|iemobile/.test(ua);
}

function parseUserAgent(uaRaw) {
  const ua = String(uaRaw || '');
  if (!ua) return { device_type: null, os: null, browser: null };
  const lc = ua.toLowerCase();
  // Tablet detection comes first: iPad and many Android tablets identify as
  // "Mobile" too, so the order matters.
  let device_type = 'desktop';
  if (/ipad|tablet|playbook|silk|kindle/.test(lc)) device_type = 'tablet';
  else if (/android(?!.*mobi)/.test(lc)) device_type = 'tablet';
  else if (/mobile|android|iphone|ipod|webos|blackberry|opera mini|iemobile/.test(lc)) device_type = 'mobile';
  let os = null;
  if (/windows nt 11/.test(lc)) os = 'Windows 11';
  else if (/windows nt 10/.test(lc)) os = 'Windows 10';
  else if (/windows nt/.test(lc)) os = 'Windows';
  else if (/iphone|ipad|ipod/.test(lc)) {
    const m = ua.match(/OS (\d+)[._](\d+)/);
    os = m ? `iOS ${m[1]}.${m[2]}` : 'iOS';
  } else if (/android/.test(lc)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/);
    os = m ? `Android ${m[1]}` : 'Android';
  } else if (/mac os x/.test(lc)) {
    const m = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = m ? `macOS ${m[1].replace('_', '.')}` : 'macOS';
  } else if (/cros/.test(lc)) os = 'ChromeOS';
  else if (/linux/.test(lc)) os = 'Linux';
  let browser = null;
  // Order matters: Edge/Opera/Chromium-based browsers also include "Chrome".
  let m;
  if ((m = ua.match(/Edg\/(\d+)/))) browser = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/(\d+)/))) browser = `Opera ${m[1]}`;
  else if ((m = ua.match(/Firefox\/(\d+)/))) browser = `Firefox ${m[1]}`;
  else if ((m = ua.match(/Chrome\/(\d+)/))) browser = `Chrome ${m[1]}`;
  else if (/Safari/.test(ua) && (m = ua.match(/Version\/(\d+)/))) browser = `Safari ${m[1]}`;
  else if (/Safari/.test(ua)) browser = 'Safari';
  return { device_type, os, browser };
}

// Extract the client IP and zero its last octet (IPv4) or last hextet (IPv6)
// so we can keep coarse "where" data without retaining a fully identifying
// address.
function _coarseIp(req) {
  if (!req) return null;
  const xfwd = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  let ip = null;
  if (typeof xfwd === 'string' && xfwd.length > 0) {
    ip = xfwd.split(',')[0].trim();
  } else if (req.ip) {
    ip = req.ip;
  } else if (req.connection && req.connection.remoteAddress) {
    ip = req.connection.remoteAddress;
  }
  if (!ip) return null;
  ip = ip.replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, '.0');
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) parts[parts.length - 1] = '0';
    return parts.join(':');
  }
  return ip;
}

function _deviceContextFromReq(req) {
  if (!req || !req.headers) return null;
  const uaRaw = String(req.headers['user-agent'] || '').slice(0, 500);
  if (!uaRaw) return null;
  const parsed = parseUserAgent(uaRaw);
  return {
    device_type: parsed.device_type,
    os: parsed.os,
    browser: parsed.browser,
    user_agent: uaRaw,
    ip: _coarseIp(req)
  };
}

function bumpStat(key) {
  const exists = queryOne('SELECT value FROM site_stats WHERE key = ?', [key]);
  if (exists) {
    runSQL('UPDATE site_stats SET value = value + 1 WHERE key = ?', [key]);
  } else {
    runSQL('INSERT INTO site_stats (key, value) VALUES (?, 1)', [key]);
  }
}

// ── View counter ──

app.post('/api/stats/view', (req, res) => {
  const username = getUsernameFromToken(req);
  if (username && isSuperAdmin(username)) return res.json({ success: true });
  runSQL("UPDATE site_stats SET value = value + 1 WHERE key = 'view_count'");
  bumpStat(isMobileUA(req) ? 'view_count_mobile' : 'view_count_desktop');
  res.json({ success: true });
});

app.get('/api/stats/views', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username || !isTeamOrAbove(username)) {
    return res.status(403).json({ error: 'Acesso restrito à equipe' });
  }
  const row = queryOne("SELECT value FROM site_stats WHERE key = 'view_count'");
  res.json({ views: row ? row.value : 0 });
});

app.get('/api/stats/platform', (req, res) => {
  const username = getUsernameFromToken(req);
  if (!username || !isAdmin(username)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  function stat(key) {
    const r = queryOne('SELECT value FROM site_stats WHERE key = ?', [key]);
    return r ? r.value : 0;
  }
  const saUsers = getSuperAdminUsernames();
  const placeholders = saUsers.map(() => '?').join(',');
  const totalMasks = saUsers.length > 0
    ? queryOne(`SELECT COUNT(*) as cnt FROM polygons WHERE deleted_at IS NULL AND created_by NOT IN (${placeholders})`, saUsers)
    : queryOne('SELECT COUNT(*) as cnt FROM polygons WHERE deleted_at IS NULL');
  res.json({
    views:          { total: stat('view_count'), desktop: stat('view_count_desktop'), mobile: stat('view_count_mobile') },
    logins:         { desktop: stat('login_count_desktop'), mobile: stat('login_count_mobile') },
    masks_created:  { total: totalMasks ? totalMasks.cnt : 0, desktop: stat('mask_count_desktop'), mobile: stat('mask_count_mobile') }
  });
});

// ── Auth ──

// [REMOVED] Passcode system replaced by Google OAuth + email/password registration

app.post('/api/auth/check-email', checkEmailLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ exists: false });
  const user = queryOne("SELECT email_verified, auth_provider FROM users WHERE LOWER(email) = ? AND is_active = 1", [email.trim().toLowerCase()]);
  if (!user) return res.json({ exists: false });
  const verified = !!(user.email_verified || user.auth_provider === 'google');
  res.json({ exists: true, verified });
});

app.post('/api/auth/resend-verification-by-email', registerLimiter, async (req, res) => {
  const raw = (req.body.email || req.body.identifier || '').trim();
  if (!raw) return res.status(400).json({ error: 'Informe o e-mail ou nome de usuário' });
  const user = raw.includes('@')
    ? queryOne('SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1', [raw.toLowerCase()])
    : queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [raw]);
  if (!user) return res.status(404).json({ error: 'Nenhuma conta encontrada' });
  if (user.email_verified) return res.json({ success: true, already_verified: true });
  if (!resend) return res.status(500).json({ error: 'Serviço de e-mail não configurado' });

  const verifyToken = uuidv4();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  runSQL('UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?', [verifyToken, verifyExpires, user.id]);

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: user.email,
      subject: 'Verifique seu e-mail (leucaena.earth)',
      html: `<p>Olá <strong>${escapeHtml(user.username)}</strong>,</p>
             <p>Clique no link abaixo para verificar seu e-mail:</p>
             <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Verificar e-mail</a></p>
             <p style="font-size:13px;color:#64748b;">Se não encontrar na caixa de entrada, verifique também a pasta de <strong>spam</strong> ou lixo eletrônico.</p>
             <p>leucaena.earth</p>`
    });
    logActivity(user.username, 'auth_resend_verification_unauthed', null, null, null, null, req);
    res.json({ success: true });
  } catch (e) {
    console.error('Resend error:', e.message);
    logActivity(user.username, 'auth_resend_verification_unauthed_error', null, null, { error: e.message || String(e) }, null, req);
    res.status(500).json({ error: 'Falha ao enviar e-mail' });
  }
});

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  let { username, password, email, full_name, referral_source, referral_detail } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail válido é obrigatório' });
  if (!password) return res.status(400).json({ error: 'Senha obrigatória' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const cleanFullName = (full_name && typeof full_name === 'string') ? full_name.trim().substring(0, 100) : '';
  if (!cleanFullName) return res.status(400).json({ error: 'Nome completo é obrigatório' });

  const existingEmail = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [email.toLowerCase()]);
  if (existingEmail) return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta' });

  if (!username) {
    let baseUsername = email.split('@')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9.]/g, '').substring(0, 25);
    if (baseUsername.length < 2 || !/[a-z]/.test(baseUsername)) baseUsername = 'user' + baseUsername;
    let finalUsername = baseUsername;
    let counter = 1;
    while (queryOne('SELECT id FROM users WHERE username = ?', [finalUsername])) {
      finalUsername = baseUsername + counter;
      counter++;
    }
    username = finalUsername;
  } else {
    if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'O usuário deve ter entre 2 e 30 caracteres' });
    if (!/^[a-z0-9.]+$/.test(username)) return res.status(400).json({ error: 'O usuário deve conter apenas letras minúsculas, números e ponto' });
    if (!/[a-z]/.test(username)) return res.status(400).json({ error: 'O usuário deve conter pelo menos uma letra' });
    const existingUsername = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername) return res.status(409).json({ error: 'Nome de usuário já em uso' });
  }

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  const verifyToken = uuidv4();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const cleanRefSource = (referral_source && typeof referral_source === 'string') ? referral_source.trim().substring(0, 50) : null;
  const cleanRefDetail = (referral_detail && typeof referral_detail === 'string') ? referral_detail.trim().substring(0, 200) : null;
  runSQL(
    `INSERT INTO users (username, password_hash, created_at, email, auth_provider, email_verified, verification_token, verification_expires, full_name, referral_source, referral_detail)
     VALUES (?, ?, ?, ?, 'local', 0, ?, ?, ?, ?, ?)`,
    [username, hash, now, email, verifyToken, verifyExpires, cleanFullName, cleanRefSource, cleanRefDetail]
  );
  logActivity(username, 'register', null, null, { email, full_name: cleanFullName, referral_source: cleanRefSource }, null, req);
  persist();

  let emailSent = false;
  if (resend) {
    const displayName = cleanFullName ? cleanFullName.split(/\s+/)[0] : username;
    const baseUrl = getBaseUrl(req);
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
    try {
      const result = await resend.emails.send({
        from: RESEND_FROM,
        to: email,
        subject: 'Verifique seu e-mail (leucaena.earth)',
        html: `<p>Olá <strong>${escapeHtml(displayName)}</strong>,</p>
               <p>Clique no link abaixo para verificar seu e-mail e ativar sua conta:</p>
               <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Verificar e-mail</a></p>
               <p style="font-size:13px;color:#64748b;">Se não encontrar na caixa de entrada, verifique também a pasta de <strong>spam</strong> ou lixo eletrônico.</p>
               <p>Se você não criou essa conta, ignore este e-mail.</p>
               <p>leucaena.earth</p>`
      });
      emailSent = true;
      console.log('Verification email sent:', result?.data?.id || 'ok', 'to:', email);
    } catch (e) {
      console.error('Resend email error:', e.message, JSON.stringify(e));
    }
  } else {
    console.warn('Resend not configured; verification email not sent for', email);
  }

  res.json({ success: true, needs_verification: true, username, email_sent: emailSent });
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { identifier, username, email, password } = req.body;
  const idRaw = (identifier || email || username || '').trim();
  if (!idRaw || !password) return res.status(400).json({ error: 'Usuário/e-mail e senha obrigatórios' });

  const isEmail = idRaw.includes('@');
  const user = isEmail
    ? queryOne('SELECT * FROM users WHERE email = ?', [idRaw.toLowerCase()])
    : queryOne('SELECT * FROM users WHERE username = ?', [idRaw]);
  if (!user) {
    logActivity(null, 'login_failed', null, null, { reason: 'unknown_user', identifier: idRaw }, null, req);
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  if (!verifyPassword(password, user.password_hash)) {
    logActivity(user.username, 'login_failed', null, null, { reason: 'bad_password' }, null, req);
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  if (needsRehash(user.password_hash)) {
    const newHash = hashPassword(password);
    runSQL('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
    persist();
  }

  if (user.is_active === 0) {
    logActivity(user.username, 'login_blocked', null, null, { reason: 'deactivated' }, null, req);
    return res.status(403).json({ error: 'Conta desativada. Entre em contato com o administrador.', code: 'ACCOUNT_DEACTIVATED' });
  }

  const realUsername = user.username;
  const userRole = (user.role || 'contributor');
  if (user.auth_provider !== 'google' && userRole !== 'tester' && !user.email_verified) {
    logActivity(realUsername, 'login_blocked', null, null, { reason: 'email_not_verified' }, null, req);
    if (!user.email) {
      return res.status(403).json({ error: 'Seu cadastro não tem e-mail. Entre em contato com o administrador.', code: 'EMAIL_NOT_VERIFIED' });
    }
    const masked = maskEmail(user.email);
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      masked_email: masked,
      error: 'Conta não verificada. Abra o link que enviamos por e-mail ou solicite um novo abaixo.'
    });
  }

  runSQL('UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_active = ? WHERE username = ?', [new Date().toISOString(), realUsername]);
  if (!isSuperAdmin(realUsername)) bumpStat(isMobileUA(req) ? 'login_count_mobile' : 'login_count_desktop');
  // Pass req so the login row carries device_type/os/browser/UA — answers the
  // user's "I want device per login" requirement without a separate sessions
  // table mutation.
  logActivity(realUsername, 'login', null, null, { method: isEmail ? 'email' : 'username' }, null, req);

  const token = createSession(realUsername);
  const role = getUserRole(realUsername);
  const showMigrationBanner = !user.google_id && user.auth_provider !== 'google';
  res.json({
    token, username: realUsername, role,
    tester_mode: user.tester_mode || 'contributor',
    auth_provider: user.auth_provider || 'local',
    email_verified: !!user.email_verified,
    has_google: !!user.google_id,
    show_migration_banner: showMigrationBanner
  });
});

app.get('/api/auth/me', (req, res) => {
  if (isSessionExpired(req)) return res.status(401).json({ error: 'Sessão expirada', code: 'SESSION_EXPIRED' });
  const username = getUsernameFromToken(req);
  if (!username) return res.status(401).json({ error: 'Não autenticado' });
  const user = queryOne('SELECT username, full_name, occupation, description, photo, linkedin, scholar, role, tester_mode, email, auth_provider, email_verified, google_id, login_count FROM users WHERE username = ?', [username]);
  const showMigrationBanner = user && !user.google_id && (user.auth_provider || 'local') !== 'google';
  const maskRow = queryOne('SELECT COUNT(*) as cnt FROM polygons WHERE created_by = ? AND deleted_at IS NULL', [username]);
  res.json({
    username, role: user?.role || 'contributor', tester_mode: user?.tester_mode || 'contributor',
    full_name: user?.full_name || null, occupation: user?.occupation || null, description: user?.description || null, photo: user?.photo || null,
    linkedin: user?.linkedin || null, scholar: user?.scholar || null, email: user?.email || null,
    auth_provider: user?.auth_provider || 'local', email_verified: !!(user?.email_verified),
    has_google: !!(user?.google_id), show_migration_banner: showMigrationBanner,
    login_count: user?.login_count || 0, mask_count: maskRow ? maskRow.cnt : 0,
    is_local: !process.env.DATA_PATH
  });
});

// ── Profile (for Quem Somos) ──

app.get('/api/profile', requireAuth, (req, res) => {
  const user = queryOne('SELECT username, full_name, occupation, description, photo, linkedin, scholar, email, auth_provider, email_verified, google_id, referral_source, referral_detail FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({
    username: user.username, full_name: user.full_name || null, occupation: user.occupation || null, description: user.description || null,
    photo: user.photo || null, linkedin: user.linkedin || null, scholar: user.scholar || null, email: user.email || null,
    auth_provider: user.auth_provider || 'local', email_verified: !!(user.email_verified), has_google: !!(user.google_id),
    referral_source: user.referral_source || null, referral_detail: user.referral_detail || null
  });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const { full_name, occupation, description, photo, linkedin, scholar, referral_source, referral_detail } = req.body || {};
  const occStr = typeof occupation === 'string' ? occupation.trim().substring(0, 120) : '';
  if (typeof occupation === 'string' && occupation.trim().length > 120) {
    return res.status(400).json({ error: 'Ocupação deve ter no máximo 120 caracteres' });
  }
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  if (photo != null && typeof photo === 'string' && photo.length > 500000) {
    return res.status(400).json({ error: 'Foto muito grande' });
  }
  if (photo != null && typeof photo === 'string' && photo.length > 0 && !photo.startsWith('data:image/') && !photo.startsWith('https://')) {
    return res.status(400).json({ error: 'URL de foto inválida' });
  }
  const cleanRefSrc = (referral_source && typeof referral_source === 'string') ? referral_source.trim().substring(0, 50) : null;
  const cleanRefDet = (referral_detail && typeof referral_detail === 'string') ? referral_detail.trim().substring(0, 200) : null;
  // Capture which fields actually changed so the activity_log row is useful
  // for "who changed what when" audits without leaking the new content.
  const before = queryOne('SELECT full_name, occupation, description, linkedin, scholar, referral_source, referral_detail, photo FROM users WHERE username = ?', [req.username]) || {};
  runSQL(
    'UPDATE users SET full_name = ?, occupation = ?, description = ?, photo = ?, linkedin = ?, scholar = ?, referral_source = ?, referral_detail = ? WHERE username = ?',
    [full_name || null, occStr || null, description != null ? description : null, photo != null ? photo : null, linkedin || null, scholar || null, cleanRefSrc, cleanRefDet, req.username]
  );
  const changed = [];
  if ((before.full_name || null) !== (full_name || null)) changed.push('full_name');
  if ((before.occupation || null) !== (occStr || null)) changed.push('occupation');
  if ((before.description || null) !== (description || null)) changed.push('description');
  if ((before.linkedin || null) !== (linkedin || null)) changed.push('linkedin');
  if ((before.scholar || null) !== (scholar || null)) changed.push('scholar');
  if ((before.referral_source || null) !== (cleanRefSrc || null)) changed.push('referral_source');
  if ((before.referral_detail || null) !== (cleanRefDet || null)) changed.push('referral_detail');
  if ((before.photo || null) !== (photo || null)) changed.push('photo');
  logActivity(req.username, 'profile_save', null, null, { changed }, null, req);
  persist();
  res.json({ success: true });
});

app.put('/api/profile/password', requireAuth, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE username = ?', [hash, req.username]);
  logActivity(req.username, 'password_change_self', null, null, null, null, req);
  persist();
  res.json({ success: true });
});

app.put('/api/admin/users/:id/profile', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { full_name, occupation, description, photo, linkedin, scholar, email, referral_source, referral_detail } = req.body || {};
  // Note: actor + target are recorded so audit trails make sense for super
  // admins editing other users' profiles. Logged after we resolve the user.
  if (occupation !== undefined && occupation !== null && typeof occupation === 'string' && occupation.length > 120) {
    return res.status(400).json({ error: 'Ocupação deve ter no máximo 120 caracteres' });
  }
  if (description != null && typeof description === 'string' && description.length > 400) {
    return res.status(400).json({ error: 'Descrição deve ter no máximo 400 caracteres' });
  }
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const occVal = occupation !== undefined
    ? (typeof occupation === 'string' ? (occupation.trim().substring(0, 120) || null) : null)
    : user.occupation;
  const refSrcVal = referral_source !== undefined ? (referral_source ? String(referral_source).trim().substring(0, 50) : null) : user.referral_source;
  const refDetVal = referral_detail !== undefined ? (referral_detail ? String(referral_detail).trim().substring(0, 200) : null) : user.referral_detail;
  runSQL(
    'UPDATE users SET full_name = ?, occupation = ?, description = ?, photo = ?, linkedin = ?, scholar = ?, email = ?, referral_source = ?, referral_detail = ? WHERE id = ?',
    [full_name !== undefined ? (full_name || null) : user.full_name, occVal, description !== undefined ? (description || null) : user.description, photo !== undefined ? (photo || null) : user.photo, linkedin !== undefined ? (linkedin || null) : user.linkedin, scholar !== undefined ? (scholar || null) : user.scholar, email !== undefined ? (email || null) : user.email, refSrcVal, refDetVal, Number(req.params.id)]
  );
  logActivity(req.username, 'admin_profile_save', null, null, { target_user: user.username }, null, req);
  persist();
  res.json({ success: true });
});

app.get('/api/landing-stats', (req, res) => {
  try {
    const saUsers = getSuperAdminUsernames();
    const ph = saUsers.map(() => '?').join(',');
    const cells = queryOne('SELECT COUNT(*) as cnt FROM grid_cells');
    const masks = saUsers.length > 0
      ? queryOne(`SELECT COUNT(*) as cnt FROM polygons WHERE deleted_at IS NULL AND created_by NOT IN (${ph})`, saUsers)
      : queryOne('SELECT COUNT(*) as cnt FROM polygons WHERE deleted_at IS NULL');
    const points = queryOne('SELECT COUNT(*) as cnt FROM occurrence_points');
    const collabs = saUsers.length > 0
      ? queryOne(`SELECT COUNT(DISTINCT username) as cnt FROM users WHERE is_active = 1 AND role != 'superadmin'`)
      : queryOne("SELECT COUNT(DISTINCT username) as cnt FROM users WHERE is_active = 1");
    const finished = queryOne("SELECT COUNT(*) as cnt FROM grid_cells WHERE grid_status = 'finished'");
    const mapping = queryOne("SELECT COUNT(*) as cnt FROM grid_cells WHERE grid_status IN ('mapping','in_use')");
    const tomap = queryOne("SELECT COUNT(*) as cnt FROM grid_cells WHERE grid_status = 'not_yet_finished'");
    res.json({
      cells: cells ? cells.cnt : 0,
      masks: masks ? masks.cnt : 0,
      points: points ? points.cnt : 0,
      collabs: collabs ? collabs.cnt : 0,
      grid_finished: finished ? finished.cnt : 0,
      grid_mapping: mapping ? mapping.cnt : 0,
      grid_tomap: tomap ? tomap.cnt : 0
    });
  } catch (e) { res.json({ cells: 0, masks: 0, points: 0, collabs: 0, grid_finished: 0, grid_mapping: 0, grid_tomap: 0 }); }
});

app.get('/api/quem-somos', (req, res) => {
  const polygonStats = queryAll(
    "SELECT created_by AS username, COUNT(*) AS cnt, COALESCE(SUM(area_ha), 0) AS total_area FROM polygons WHERE deleted_at IS NULL AND created_by IS NOT NULL AND created_by != 'deleted' GROUP BY created_by"
  );
  const countByUser = {};
  const areaByUser = {};
  polygonStats.forEach(r => { countByUser[r.username] = r.cnt; areaByUser[r.username] = r.total_area; });

  const allUsers = queryAll('SELECT username, full_name, occupation, description, photo, linkedin, scholar, role, is_founder FROM users WHERE is_active = 1');
  const teamOrder = ['mpf', 'msb'];

  const equipe = allUsers
    .filter(u => (u.role === 'superadmin' || u.role === 'admin' || u.role === 'team'))
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, occupation: u.occupation || null, description: u.description || '', photo: u.photo || null, linkedin: u.linkedin || null, scholar: u.scholar || null, role: u.role, is_founder: u.is_founder || 0, mask_count: countByUser[u.username] || 0 }))
    .sort((a, b) => {
      if (a.is_founder !== b.is_founder) return b.is_founder - a.is_founder;
      const order = { superadmin: 0, admin: 1, team: 2 };
      if ((order[a.role] ?? 9) !== (order[b.role] ?? 9)) return (order[a.role] ?? 9) - (order[b.role] ?? 9);
      const ai = teamOrder.indexOf(a.username), bi = teamOrder.indexOf(b.username);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const colaboradores = allUsers
    .filter(u => u.role === 'contributor' && (countByUser[u.username] || 0) >= 1)
    .map(u => ({ username: u.username, full_name: u.full_name || u.username, occupation: u.occupation || null, description: u.description || '', photo: u.photo || null, linkedin: u.linkedin || null, scholar: u.scholar || null, role: u.role, mask_count: countByUser[u.username] || 0, area_ha: Math.round((areaByUser[u.username] || 0) * 100) / 100 }))
    .sort((a, b) => b.mask_count - a.mask_count);

  res.json({ equipe, colaboradores });
});

app.get('/api/ranking', (req, res) => {
  const allContribs = queryAll(
    "SELECT u.username, u.full_name, COUNT(p.id) as mask_count, COALESCE(SUM(p.area_ha), 0) as area_ha " +
    "FROM users u LEFT JOIN polygons p ON p.created_by = u.username " +
    "WHERE u.role = 'contributor' AND u.is_active = 1 " +
    "GROUP BY u.username ORDER BY mask_count DESC, area_ha DESC"
  );
  const top3 = allContribs.slice(0, 3).map(u => ({
    name: u.full_name || u.username,
    mask_count: u.mask_count,
    area_ha: Math.round((u.area_ha || 0) * 100) / 100
  }));
  res.json({ top3, total_contributors: allContribs.filter(u => u.mask_count > 0).length });
});

app.get('/api/my-ranking', requireAuth, (req, res) => {
  const excludeUsers = ['deleted', 'teste'];
  const allContribs = queryAll(
    "SELECT u.username, u.full_name, COUNT(p.id) as mask_count, COALESCE(SUM(p.area_ha), 0) as area_ha " +
    "FROM users u LEFT JOIN polygons p ON p.created_by = u.username " +
    "WHERE u.role = 'contributor' AND u.username NOT IN ('" + excludeUsers.join("','") + "') " +
    "GROUP BY u.username ORDER BY mask_count DESC, area_ha DESC"
  );

  const top3 = allContribs.slice(0, 3).map(u => ({
    name: u.full_name || u.username,
    mask_count: u.mask_count,
    area_ha: Math.round((u.area_ha || 0) * 100) / 100
  }));

  let userPosition = 0;
  let userMaskCount = 0;
  let userAreaHa = 0;
  for (let i = 0; i < allContribs.length; i++) {
    if (allContribs[i].username === req.username) {
      userPosition = i + 1;
      userMaskCount = allContribs[i].mask_count;
      userAreaHa = Math.round((allContribs[i].area_ha || 0) * 100) / 100;
      break;
    }
  }

  res.json({
    top3,
    user_position: userPosition,
    user_mask_count: userMaskCount,
    user_area_ha: userAreaHa,
    total_contributors: allContribs.filter(u => u.mask_count > 0).length
  });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization;
  let logUser = null;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    const sess = sessions.get(token);
    logUser = (typeof sess === 'string') ? sess : (sess && sess.username) || null;
    deleteSession(token);
  }
  if (logUser) logActivity(logUser, 'logout', null, null, null, null, req);
  res.json({ success: true });
});

// ── Google photo helper ──

async function fetchGooglePhotoAsDataUrl(pictureUrl) {
  if (!pictureUrl) return null;
  try {
    const sizedUrl = pictureUrl.replace(/=s\d+(-c)?/, '=s256-c');
    const finalUrl = sizedUrl.includes('=s') ? sizedUrl : sizedUrl + '=s256-c';
    const res = await fetch(finalUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 500000) return null;
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

// ── Google OAuth ──

app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).send('Google OAuth not configured');
  const redirectUri = getBaseUrl(req) + '/auth/google/callback';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?auth_error=no_code');

  try {
    const redirectUri = getBaseUrl(req) + '/auth/google/callback';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect('/?auth_error=token_failed');

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    if (!profile.id || !profile.email) return res.redirect('/?auth_error=profile_failed');

    const googleId = profile.id;
    const googleEmail = profile.email.toLowerCase();
    let googleName = (profile.name && String(profile.name).trim()) || '';
    if (!googleName && (profile.given_name || profile.family_name)) {
      googleName = [profile.given_name, profile.family_name]
        .filter(Boolean)
        .map(s => String(s).trim())
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    if (googleName.length > 100) googleName = googleName.substring(0, 100);
    const googlePicture = profile.picture || null;

    let user = queryOne('SELECT * FROM users WHERE google_id = ?', [googleId]);

    if (!user) {
      user = queryOne('SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1', [googleEmail]);
      if (user) {
        runSQL('UPDATE users SET google_id = ?, auth_provider = ?, email_verified = 1 WHERE id = ?', [googleId, 'google', user.id]);
        logActivity(user.username, 'google_auto_link', null, null, { google_email: googleEmail }, null, req);
        user.google_id = googleId;
      }
    }

    if (!user) {
      let baseUsername = googleEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '').substring(0, 25);
      if (baseUsername.length < 2) baseUsername = 'user' + baseUsername;
      let finalUsername = baseUsername;
      let counter = 1;
      while (queryOne('SELECT id FROM users WHERE username = ?', [finalUsername])) {
        finalUsername = baseUsername + counter;
        counter++;
      }
      const now = new Date().toISOString();
      const randomHash = hashPassword(crypto.randomBytes(32).toString('hex'));
      runSQL(
        `INSERT INTO users (username, password_hash, created_at, email, google_id, auth_provider, email_verified, full_name)
         VALUES (?, ?, ?, ?, ?, 'google', 1, ?)`,
        [finalUsername, randomHash, now, googleEmail, googleId, googleName]
      );
      user = queryOne('SELECT * FROM users WHERE username = ?', [finalUsername]);
      logActivity(user.username, 'register_google', null, null, { google_email: googleEmail }, null, req);
      persist();
      sendWelcomeEmail(user).catch(e => console.error('Welcome email error:', e));
      sendWelcomeInboxMessage(user.username);
    }

    if (user.is_active === 0) {
      return res.redirect('/?auth_error=account_deactivated');
    }

    const hasLocalFullName = user.full_name && String(user.full_name).trim();
    if (googleName && !hasLocalFullName) {
      runSQL('UPDATE users SET full_name = ? WHERE id = ?', [googleName, user.id]);
      persist();
    }

    if (googlePicture && !user.photo) {
      const photoDataUrl = await fetchGooglePhotoAsDataUrl(googlePicture);
      if (photoDataUrl) {
        runSQL('UPDATE users SET photo = ? WHERE id = ?', [photoDataUrl, user.id]);
        persist();
      }
    }

    runSQL('UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_active = ? WHERE id = ?', [new Date().toISOString(), user.id]);
    if (!isSuperAdmin(user.username)) bumpStat(isMobileUA(req) ? 'login_count_mobile' : 'login_count_desktop');
    logActivity(user.username, 'login_google', null, null, { google_email: googleEmail }, null, req);

    const oneTimeCode = uuidv4();
    oauthCodes.set(oneTimeCode, { username: user.username, createdAt: Date.now() });
    setTimeout(() => oauthCodes.delete(oneTimeCode), 60 * 1000);

    res.redirect(`/?google_auth_code=${oneTimeCode}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect('/?auth_error=server_error');
  }
});

app.post('/api/auth/exchange-code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const entry = oauthCodes.get(code);
  if (!entry) return res.status(401).json({ error: 'Invalid or expired code' });
  oauthCodes.delete(code);
  if (Date.now() - entry.createdAt > 60 * 1000) return res.status(401).json({ error: 'Code expired' });
  const user = queryOne('SELECT * FROM users WHERE username = ?', [entry.username]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = createSession(user.username);
  const role = getUserRole(user.username);
  res.json({
    token, username: user.username, role,
    tester_mode: user.tester_mode || 'contributor',
    auth_provider: user.auth_provider || 'local',
    email_verified: !!user.email_verified,
    has_google: !!user.google_id,
    show_migration_banner: !user.google_id && user.auth_provider !== 'google'
  });
});

// ── Email verification ──

app.get('/api/auth/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token ausente');

  const user = queryOne('SELECT * FROM users WHERE verification_token = ?', [token]);
  if (!user) return res.send(verifyResultHtml('error', 'Token inválido ou já utilizado.'));
  if (new Date(user.verification_expires) < new Date()) {
    return res.send(verifyResultHtml('error', 'Token expirado. Solicite um novo na plataforma.'));
  }

  runSQL('UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?', [user.id]);
  logActivity(user.username, 'email_verified', null, null, null, null, req);
  persist();

  const freshUser = queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
  if (freshUser) {
    sendWelcomeEmail(freshUser).catch(e => console.error('Welcome email error:', e));
    sendWelcomeInboxMessage(freshUser.username);
  }

  res.send(verifyResultHtml('success', 'E-mail verificado com sucesso! Você já pode usar a plataforma normalmente.'));
});

function verifyResultHtml(type, message) {
  const color = type === 'success' ? '#22c55e' : '#ef4444';
  const icon = type === 'success' ? '✓' : '✗';
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>leucaena.earth</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.card{text-align:center;max-width:420px;padding:40px 32px;border:1px solid #1e293b;border-radius:16px;background:#1e293b}
.icon{font-size:48px;margin-bottom:16px;color:${color}}p{font-size:15px;line-height:1.6;color:#94a3b8;margin-top:12px}
a{display:inline-block;margin-top:20px;padding:10px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="card"><div class="icon">${icon}</div><p>${message}</p><a href="https://map.leucaena.earth">Ir para a plataforma</a></div></body></html>`;
}

app.post('/api/auth/resend-verification', requireAuth, async (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.email_verified) return res.json({ success: true, already_verified: true });
  if (!user.email) return res.status(400).json({ error: 'Nenhum e-mail cadastrado' });
  if (!resend) return res.status(500).json({ error: 'Serviço de e-mail não configurado' });

  const verifyToken = uuidv4();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  runSQL('UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?', [verifyToken, verifyExpires, user.id]);

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: user.email,
      subject: 'Verifique seu e-mail (leucaena.earth)',
      html: `<p>Olá <strong>${escapeHtml(user.username)}</strong>,</p>
             <p>Clique no link abaixo para verificar seu e-mail:</p>
             <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 24px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Verificar e-mail</a></p>
             <p style="font-size:13px;color:#64748b;">Se não encontrar na caixa de entrada, verifique também a pasta de <strong>spam</strong> ou lixo eletrônico.</p>
             <p>leucaena.earth</p>`
    });
    logActivity(user.username, 'auth_resend_verification', null, null, null, null, req);
    res.json({ success: true });
  } catch (e) {
    console.error('Resend error:', e.message);
    logActivity(user.username, 'auth_resend_verification_error', null, null, { error: e.message || String(e) }, null, req);
    res.status(500).json({ error: 'Falha ao enviar e-mail' });
  }
});

// ── Link Google to existing profile ──

app.post('/api/profile/link-google', requireAuth, (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE username = ?', [req.username]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.google_id) return res.json({ success: true, already_linked: true });
  logActivity(req.username, 'profile_link_google_init', null, null, null, null, req);
  res.json({ redirect: '/auth/google?link=true' });
});

// ── Password reset (self-service via email) ──

app.post('/api/auth/forgot-password', resetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

  const genericMsg = 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.';

  const user = queryOne("SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1", [email.trim().toLowerCase()]);
  if (!user) return res.json({ success: true, message: genericMsg });

  if (user.auth_provider === 'google' && !user.password_hash) {
    return res.json({ success: true, google: true, message: 'Esta conta usa login Google. Use o botão "Entrar com Google".' });
  }

  if (!resend) return res.status(500).json({ error: 'Serviço de e-mail não configurado' });

  const token = uuidv4();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL).toISOString();
  runSQL('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);

  const baseUrl = getBaseUrl(req);
  const resetUrl = `${baseUrl}/api/auth/reset-password?token=${token}`;
  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: user.email,
      subject: 'Redefinir sua senha (leucaena.earth)',
      html: `<p>Olá <strong>${user.full_name || user.username}</strong>,</p>
             <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
             <p><a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#22c55e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir Senha</a></p>
             <p>Este link expira em 30 minutos.</p>
             <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
             <p>leucaena.earth</p>`
    });
  } catch (e) { console.error('Resend reset email error:', e.message); }

  logActivity(user.username, 'password_reset_requested', null, null, null, null, req);
  res.json({ success: true, message: genericMsg });
});

function resetPasswordPageHtml(type, content) {
  const color = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '🔒';
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redefinir Senha (leucaena.earth)</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.card{text-align:center;max-width:420px;width:90%;padding:40px 32px;border:1px solid #1e293b;border-radius:16px;background:#1e293b}
.icon{font-size:48px;margin-bottom:16px;color:${color}}h2{font-size:20px;margin-bottom:16px;color:#f1f5f9}p{font-size:14px;line-height:1.6;color:#94a3b8;margin-top:8px}
input{width:100%;padding:10px 14px;margin-top:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:14px;outline:none}
input:focus{border-color:#22c55e}
.btn{display:inline-block;margin-top:16px;padding:10px 24px;background:#22c55e;color:#fff;border:none;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;cursor:pointer;width:100%}
.btn:hover{background:#16a34a}
.error{color:#ef4444;font-size:13px;margin-top:8px;display:none}
a.link{display:inline-block;margin-top:20px;color:#22c55e;text-decoration:none;font-size:13px}
</style></head><body><div class="card"><div class="icon">${icon}</div>${content}</div></body></html>`;
}

app.get('/api/auth/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(resetPasswordPageHtml('error', '<p>Token ausente.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));

  const user = queryOne('SELECT * FROM users WHERE reset_token = ?', [token]);
  if (!user) return res.send(resetPasswordPageHtml('error', '<p>Link inválido ou já utilizado.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  if (new Date(user.reset_token_expires) < new Date()) {
    runSQL('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [user.id]);
    return res.send(resetPasswordPageHtml('error', '<p>Link expirado. Solicite um novo na plataforma.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }

  const formHtml = `<h2>Redefinir Senha</h2>
    <p>Crie uma nova senha para <strong>${escapeHtml(user.username)}</strong></p>
    <form id="rf" method="POST" action="/api/auth/reset-password">
      <input type="hidden" name="token" value="${token}">
      <input type="password" name="password" id="pw1" placeholder="Nova senha (mínimo 3 caracteres)" required minlength="3">
      <input type="password" name="password_confirm" id="pw2" placeholder="Confirmar nova senha" required minlength="3">
      <p class="error" id="err"></p>
      <button type="submit" class="btn">Redefinir Senha</button>
    </form>
    <a class="link" href="https://map.leucaena.earth">Voltar para a plataforma</a>
    <script>document.getElementById('rf').addEventListener('submit',function(e){
      var p1=document.getElementById('pw1').value,p2=document.getElementById('pw2').value,err=document.getElementById('err');
      if(p1!==p2){e.preventDefault();err.textContent='As senhas não coincidem.';err.style.display='block';return;}
      if(p1.length<3){e.preventDefault();err.textContent='A senha deve ter pelo menos 3 caracteres.';err.style.display='block';return;}
    });</script>`;
  res.send(resetPasswordPageHtml('form', formHtml));
});

app.post('/api/auth/reset-password', resetLimiter, (req, res) => {
  const { token, password, password_confirm, username, code } = req.body;

  // Legacy admin-code flow (in-memory tokens)
  if (code && username) {
    if (!password) return res.status(400).json({ error: 'Senha obrigatória' });
    if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const entry = resetTokens.get(username.toLowerCase());
    if (!entry) return res.status(400).json({ error: 'Nenhum código de recuperação encontrado.' });
  if (Date.now() > entry.expires) {
    resetTokens.delete(username.toLowerCase());
      return res.status(400).json({ error: 'Código expirado.' });
  }
  if (entry.code !== code.trim()) return res.status(400).json({ error: 'Código inválido' });
    const u = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE username = ?', [hash, username]);
  resetTokens.delete(username.toLowerCase());
  logActivity(username, 'password_reset_used', null, null, { flow: 'in_app' }, null, req);
  persist();
    return res.json({ success: true });
  }

  // Email-link flow (DB tokens)
  if (!token || !password) {
    return res.status(400).send(resetPasswordPageHtml('error', '<p>Dados incompletos.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }
  if (password.length < 3) {
    return res.status(400).send(resetPasswordPageHtml('error', '<p>A senha deve ter pelo menos 3 caracteres.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }
  if (password_confirm && password !== password_confirm) {
    return res.status(400).send(resetPasswordPageHtml('error', '<p>As senhas não coincidem.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }

  const user = queryOne('SELECT * FROM users WHERE reset_token = ?', [token]);
  if (!user) {
    return res.status(400).send(resetPasswordPageHtml('error', '<p>Link inválido ou já utilizado.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }
  if (new Date(user.reset_token_expires) < new Date()) {
    runSQL('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [user.id]);
    return res.status(400).send(resetPasswordPageHtml('error', '<p>Link expirado. Solicite um novo na plataforma.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
  }

  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);
  logActivity(user.username, 'password_reset_used', null, null, { flow: 'email_link' }, null, req);
  persist();
  res.send(resetPasswordPageHtml('success', '<h2>Senha redefinida!</h2><p>Sua senha foi atualizada com sucesso.</p><a class="link" href="https://map.leucaena.earth">Ir para a plataforma</a>'));
});

// ── Admin: user management ──

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) return res.status(403).json({ error: 'Acesso restrito à equipe' });
  const callerIsAdminOrAbove = isAdmin(req.username);
  // Team members see all users but without email (privacy)
  const users = callerIsAdminOrAbove
    ? queryAll("SELECT id, username, created_at, full_name, occupation, description, photo, linkedin, scholar, login_count, total_time_ms, role, tester_mode, is_founder, email, last_active, auth_provider, email_verified, google_id, is_active, referral_source, referral_detail, last_location_state, last_edited_state FROM users WHERE username != 'deleted'")
    : queryAll("SELECT id, username, created_at, full_name, occupation, description, photo, linkedin, scholar, login_count, total_time_ms, role, tester_mode, is_founder, NULL as email, last_active, auth_provider, email_verified, google_id, is_active, NULL as referral_source, NULL as referral_detail, last_location_state, last_edited_state FROM users WHERE username != 'deleted'");
  const allPolys = queryAll('SELECT created_by, geometry FROM polygons WHERE deleted_at IS NULL');
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
    u.is_immutable = !!(IMMUTABLE_USER && u.username === IMMUTABLE_USER);
  }
  const onlineUsernames = getUniqueUsers().map(u => u.username);
  res.json({ users, globalMasks, globalAreaHa: Math.round(globalAreaHa * 100) / 100, callerRole: getUserRole(req.username), onlineUsers: onlineUsernames });
});

app.get('/api/admin/users/export-csv', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const users = queryAll("SELECT id, username, created_at, full_name, description, email, login_count, total_time_ms, referral_source, referral_detail FROM users WHERE is_active = 1");
  const maskCounts = queryAll('SELECT created_by, COUNT(*) as mask_count FROM polygons WHERE deleted_at IS NULL GROUP BY created_by');
  const maskMap = {};
  for (const m of maskCounts) maskMap[m.created_by] = m.mask_count;

  const header = 'username,full_name,email,description,masks_created,login_count,total_time_hours,created_at,referral_source,referral_detail';
  const rows = users.map(u => {
    const masks = maskMap[u.username] || 0;
    const hours = ((u.total_time_ms || 0) / 3600000).toFixed(2);
    const fullName = (u.full_name || '').replace(/"/g, '""');
    const desc = (u.description || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const email = (u.email || '').replace(/"/g, '""');
    const refSrc = (u.referral_source || '').replace(/"/g, '""');
    const refDet = (u.referral_detail || '').replace(/"/g, '""').replace(/\n/g, ' ');
    return `${u.username},"${fullName}","${email}","${desc}",${masks},${u.login_count || 0},${hours},${u.created_at || ''},"${refSrc}","${refDet}"`;
  });

  const csv = header + '\n' + rows.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=leucena_users_stats.csv');
  res.send('\uFEFF' + csv);
});

app.post('/api/admin/users/create', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { username, password, email, full_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'O usuário deve ter entre 2 e 30 caracteres' });
  if (!/^[a-z0-9.]+$/.test(username)) return res.status(400).json({ error: 'O usuário deve conter apenas letras minúsculas, números e ponto' });
  if (!/[a-z]/.test(username)) return res.status(400).json({ error: 'O usuário deve conter pelo menos uma letra' });
  if (password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail válido é obrigatório' });
  const cleanFullName = (full_name && typeof full_name === 'string') ? full_name.trim().substring(0, 100) : '';
  if (!cleanFullName) return res.status(400).json({ error: 'Nome completo é obrigatório' });

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso' });

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  runSQL(
    'INSERT INTO users (username, password_hash, created_at, email, email_verified, auth_provider, full_name) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [username, hash, now, email, 'local', cleanFullName]
  );
  logActivity(req.username, 'admin_create_user', null, null, { target_user: username, full_name: cleanFullName }, null, req);
  persist();

  const freshUser = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (freshUser) {
    sendWelcomeEmail(freshUser).catch(e => console.error('Welcome email error:', e));
    sendWelcomeInboxMessage(freshUser.username);
  }

  res.json({ success: true, username });
});

app.put('/api/admin/users/:id/password', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { password } = req.body;
  if (!password || password.length < 3) return res.status(400).json({ error: 'A senha deve ter pelo menos 3 caracteres' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) return res.status(403).json({ error: 'Admins só podem gerenciar colaboradores e testers' });
  const hash = hashPassword(password);
  runSQL('UPDATE users SET password_hash = ? WHERE id = ?', [hash, Number(req.params.id)]);
  logActivity(req.username, 'password_change', null, null, { target_user: user.username }, null, req);
  persist();
  notifySuperAdminsOfAdminAction(req.username, 'Alteração de senha', user.username);
  res.json({ success: true });
});

app.put('/api/admin/users/:id/deactivate', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (IMMUTABLE_USER && user.username === IMMUTABLE_USER) return res.status(403).json({ error: 'Este usuário é protegido' });
  if (user.role === 'superadmin') return res.status(400).json({ error: 'Não é possível desativar um Super Admin' });
  if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) return res.status(403).json({ error: 'Admins só podem gerenciar colaboradores e testers' });
  if (!user.is_active) return res.status(400).json({ error: 'Usuário já está desativado' });

  runSQL('UPDATE users SET is_active = 0 WHERE id = ?', [Number(req.params.id)]);
  const lockedByDeactivated = queryAll('SELECT id, geometry FROM grid_cells WHERE locked_by = ?', [user.username]);
  for (const cell of lockedByDeactivated) {
    const newStatus = determineCellStatusOnUnlock(cell.id, cell.geometry);
    runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ? WHERE id = ?', [newStatus, cell.id]);
  }

  deleteSessionsForUser(user.username);

  logActivity(req.username, 'user_deactivate', null, null, { target_user: user.username, target_role: user.role }, null, req);
  persist();
  io.emit('users:updated', getUniqueUsers());
  notifySuperAdminsOfAdminAction(req.username, 'Desativação de usuário', user.username, `Role: ${user.role}`);
  res.json({ success: true });
});

app.put('/api/admin/users/:id/reactivate', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) return res.status(403).json({ error: 'Admins só podem gerenciar colaboradores e testers' });
  if (user.is_active) return res.status(400).json({ error: 'Usuário já está ativo' });

  runSQL('UPDATE users SET is_active = 1 WHERE id = ?', [Number(req.params.id)]);
  logActivity(req.username, 'user_reactivate', null, null, { target_user: user.username, target_role: user.role }, null, req);
  persist();
  notifySuperAdminsOfAdminAction(req.username, 'Reativação de usuário', user.username, `Role: ${user.role}`);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (IMMUTABLE_USER && user.username === IMMUTABLE_USER) return res.status(403).json({ error: 'Este usuário é protegido' });
  if (user.role === 'superadmin') return res.status(400).json({ error: 'Não é possível excluir um Super Admin' });

  permanentlyDeleteUserAccount(user, req.username, req);
  io.emit('users:updated', getUniqueUsers());
  res.json({ success: true });
});

app.put('/api/admin/users/:id/role', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Apenas Super Admin pode alterar roles' });
  const { role } = req.body;
  const validRoles = ['superadmin', 'admin', 'team', 'contributor', 'tester'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Role inválido' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (IMMUTABLE_USER && user.username === IMMUTABLE_USER) {
    return res.status(403).json({ error: 'Este usuário é protegido e não pode ter sua função alterada' });
  }
  const oldRole = user.role || 'contributor';
  runSQL('UPDATE users SET role = ? WHERE id = ?', [role, Number(req.params.id)]);
  logActivity(req.username, 'role_change', null, null, { target_user: user.username, from: oldRole, to: role }, null, req);
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
  logActivity(req.username, 'admin_tester_mode_set', null, null, { target_user: user.username, tester_mode }, null, req);
  persist();
  res.json({ success: true });
});

app.put('/api/tester/mode', requireAuth, (req, res) => {
  const caller = queryOne('SELECT id, role FROM users WHERE username = ?', [req.username]);
  if (!caller || caller.role !== 'tester') return res.status(403).json({ error: 'Tester only' });
  const { tester_mode } = req.body;
  if (!['team', 'contributor'].includes(tester_mode)) return res.status(400).json({ error: 'Modo inválido' });
  runSQL('UPDATE users SET tester_mode = ? WHERE id = ?', [tester_mode, caller.id]);
  logActivity(req.username, 'tester_mode_switch', null, null, { tester_mode }, null, req);
  persist();
  res.json({ success: true, tester_mode });
});

app.put('/api/admin/users/:id/username', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { new_username } = req.body;
  if (!new_username || !/^[a-z0-9.]+$/.test(new_username) || !/[a-z]/.test(new_username)) {
    return res.status(400).json({ error: 'Nome de usuário inválido. Use apenas letras minúsculas, números e ponto.' });
  }
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) return res.status(403).json({ error: 'Admins só podem gerenciar colaboradores e testers' });
  const oldUsername = user.username;
  if (oldUsername === new_username) return res.json({ success: true });
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [new_username]);
  if (existing) return res.status(409).json({ error: 'Nome de usuário já em uso' });

  runSQL('UPDATE users SET username = ? WHERE id = ?', [new_username, Number(req.params.id)]);
  runSQL('UPDATE polygons SET created_by = ? WHERE created_by = ?', [new_username, oldUsername]);
  runSQL('UPDATE grid_cells SET locked_by = ? WHERE locked_by = ?', [new_username, oldUsername]);
  runSQL('UPDATE grid_cells SET finished_by = ? WHERE finished_by = ?', [new_username, oldUsername]);
  try { runSQL('UPDATE activity_logs SET username = ? WHERE username = ?', [new_username, oldUsername]); } catch (e) { /* ignore */ }

  for (const [token, sessData] of sessions.entries()) {
    const sessUsername = typeof sessData === 'string' ? sessData : sessData.username;
    if (sessUsername === oldUsername) {
      if (typeof sessData === 'string') {
        sessions.set(token, new_username);
      } else {
        sessData.username = new_username;
      }
    }
  }
  try { runSQL('UPDATE sessions SET username = ? WHERE username = ?', [new_username, oldUsername]); } catch (e) { /* best effort */ }

  logActivity(req.username, 'username_change', null, null, { from: oldUsername, to: new_username }, null, req);
  persist();
  notifySuperAdminsOfAdminAction(req.username, 'Renomeação de usuário', oldUsername, `Novo username: ${new_username}`);
  res.json({ success: true, old_username: oldUsername, new_username });
});

app.put('/api/admin/users/:id/verify', requireAuth, async (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.email_verified) return res.json({ success: true, already_verified: true });
  runSQL('UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?', [Number(req.params.id)]);
  logActivity(req.username, 'admin_verify_email', null, null, { target_user: user.username }, null, req);
  persist();

  const freshUser = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (freshUser) {
    sendWelcomeEmail(freshUser).catch(e => console.error('Welcome email error:', e));
    sendWelcomeInboxMessage(freshUser.username);
  }

  res.json({ success: true });
});

app.put('/api/admin/users/:id/founder', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { is_founder } = req.body;
  const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(req.params.id)]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (!['superadmin', 'admin', 'team'].includes(user.role)) return res.status(400).json({ error: 'Apenas membros da equipe podem ser Idealizadores' });
  runSQL('UPDATE users SET is_founder = ? WHERE id = ?', [is_founder ? 1 : 0, Number(req.params.id)]);
  logActivity(req.username, 'founder_toggle', null, null, { target_user: user.username, is_founder: !!is_founder }, null, req);
  persist();
  res.json({ success: true });
});

// ── Batch operations (superadmin only) ──

app.post('/api/admin/batch/verify', requireAuth, async (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  let verified = 0, skipped = 0;
  for (const id of ids) {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!user) { skipped++; continue; }
    if (user.email_verified) { skipped++; continue; }
    runSQL('UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?', [Number(id)]);
    logActivity(req.username, 'admin_verify_email', null, null, { target_user: user.username, batch: true }, null, req);
    const freshUser = queryOne('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (freshUser) {
      sendWelcomeEmail(freshUser).catch(e => console.error('Welcome email error:', e));
      sendWelcomeInboxMessage(freshUser.username);
    }
    verified++;
  }
  persist();
  res.json({ success: true, verified, skipped });
});

app.post('/api/admin/batch/deactivate', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  let processed = 0;
  for (const id of ids) {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!user || user.role === 'superadmin' || user.is_active === 0) continue;
    if (IMMUTABLE_USER && user.username === IMMUTABLE_USER) continue;
    if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) continue;
    const lockedCells = queryAll('SELECT id, geometry FROM grid_cells WHERE locked_by = ?', [user.username]);
    for (const c of lockedCells) {
      const newStatus = determineCellStatusOnUnlock(c.id, c.geometry);
      runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ? WHERE id = ?', [newStatus, c.id]);
    }
    runSQL('UPDATE users SET is_active = 0 WHERE id = ?', [Number(id)]);
    logActivity(req.username, 'user_deactivate', null, null, { target_user: user.username, batch: true }, null, req);
    processed++;
  }
  persist();
  io.emit('grid:refresh');
  res.json({ success: true, processed });
});

app.post('/api/admin/batch/reactivate', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  let processed = 0;
  for (const id of ids) {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!user || user.is_active === 1) continue;
    if (!isSuperAdmin(req.username) && ['admin', 'superadmin', 'team'].includes(user.role)) continue;
    runSQL('UPDATE users SET is_active = 1 WHERE id = ?', [Number(id)]);
    logActivity(req.username, 'user_reactivate', null, null, { target_user: user.username, batch: true }, null, req);
    processed++;
  }
  persist();
  res.json({ success: true, processed });
});

app.post('/api/admin/batch/delete', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
  const isRemote = !!process.env.DATA_PATH;
  const REMOTE_BATCH_LIMIT = 5;
  if (isRemote && ids.length > REMOTE_BATCH_LIMIT) {
    return res.status(400).json({ error: `Limite de ${REMOTE_BATCH_LIMIT} exclusões por vez no ambiente remoto. Selecione menos usuários.` });
  }
  let deleted = 0;
  for (const id of ids) {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [Number(id)]);
    if (!user || user.role === 'superadmin') continue;
    if (IMMUTABLE_USER && user.username === IMMUTABLE_USER) continue;
    permanentlyDeleteUserAccount(user, req.username, req);
    deleted++;
  }
  io.emit('users:updated', getUniqueUsers());
  res.json({ success: true, deleted });
});

// [REMOVED] admin reset-token route; password reset is now self-service via email

// [REMOVED] /api/admin/passcode; passcode system removed

// ── Inbox: messages ──

// Build the "Mensagem enviada por …" footer line. Superadmins were getting
// notifications without enough context to know who actually wrote (only the
// username), so we now render "Display Name (@username) <email>" whenever
// we can resolve the sender's profile.
function _renderSenderFooter(senderProfile, senderUsername) {
  const name = senderProfile && senderProfile.full_name ? String(senderProfile.full_name).trim() : '';
  const uname = (senderProfile && senderProfile.username) || senderUsername || '';
  const email = senderProfile && senderProfile.email ? String(senderProfile.email).trim() : '';
  const safeUname = escapeHtml(uname);
  const handle = `<a href="https://map.leucaena.earth/?u=${encodeURIComponent(uname)}">@${safeUname}</a>`;
  let line;
  if (name) {
    line = `<strong>${escapeHtml(name)}</strong> (${handle})`;
  } else {
    line = `<strong>${handle}</strong>`;
  }
  if (email) line += ` &lt;${escapeHtml(email)}&gt;`;
  return `<p style="font-size:12px;color:#888;">Mensagem enviada por ${line} via leucaena.earth</p>`;
}

// Resolves a username to the row we store in `users` (full_name, email, role)
// so callers don't have to thread the lookup through every email path.
function _lookupSenderProfile(username) {
  if (!username) return null;
  return queryOne('SELECT username, full_name, email, role FROM users WHERE username = ?', [username]);
}

async function sendInboxEmails(senderUsername, subject, body, recipients) {
  const results = [];
  if (!resend) return results;
  const senderProfile = _lookupSenderProfile(senderUsername);
  const senderFooter = _renderSenderFooter(senderProfile, senderUsername);
  // Subject prefix with the sender's display name (or username) so the
  // superadmin can scan their inbox and know who wrote without opening each
  // email. Username is always included so cross-referencing is unambiguous.
  const senderLabel = senderProfile && senderProfile.full_name
    ? `${senderProfile.full_name} (@${senderUsername})`
    : `@${senderUsername}`;
  const subjectLine = `[leucaena.earth] ${subject} — ${senderLabel}`;
  for (const u of recipients) {
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: u.email,
        subject: subjectLine,
        html: `<p>Olá <strong>${escapeHtml(u.full_name || u.username)}</strong>,</p>
               <p>${sanitizeMessageHtml(body).replace(/\n/g, '<br>')}</p>
               <hr>${senderFooter}
               <p style="font-size:12px;color:#888;"><a href="https://map.leucaena.earth">Abrir plataforma</a></p>`
      });
      results.push({ username: u.username, sent: true });
    } catch (e) {
      console.error('Inbox email error:', u.username, e.message);
      results.push({ username: u.username, sent: false, error: e.message });
    }
  }
  return results;
}

function inboxVisibilityCondition() {
  // Visibility tiers:
  //   1) regular reach (target=all to contributors, direct target,
  //      admins-target, sender-of-non-system, or superadmin sees-all-non-system)
  //   2) is_system messages (welcome / news templates) bypass both the sender
  //      view and the superadmin "see-all" rule — only the explicit target
  //      sees them, so the admin's inbox doesn't drown in auto-generated copies
  //   3) gating: stop leaking inbox history older than the requester's account
  return `(
    (m.target = 'all' AND ? IN (SELECT username FROM users WHERE role = 'contributor'))
    OR m.target = ?
    OR (m.target = 'admins' AND ? IN (SELECT username FROM users WHERE role = 'superadmin'))
    OR (m.sender = ? AND COALESCE(m.is_system, 0) = 0)
    OR (
      ? IN (SELECT username FROM users WHERE role = 'superadmin')
      AND COALESCE(m.is_system, 0) = 0
    )
  )
  AND (
    m.sender = ?
    OR m.target = ?
    OR m.created_at >= COALESCE((SELECT created_at FROM users WHERE username = ?), '1970-01-01')
  )`;
}

function inboxVisibilityParams(username) {
  return [username, username, username, username, username, username, username, username];
}

app.post('/api/admin/messages', requireAuth, messageLimiter, async (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { subject, body, target, allow_reply, images } = req.body;
  const textErr = validateMessageText(subject, body);
  if (textErr) return res.status(400).json({ error: textErr });
  const limitErr = checkMessageLimits(req.username);
  if (limitErr) return res.status(429).json(limitErr);
  let cleanImages = null;
  try { cleanImages = validateMessageImages(images); } catch (e) { return res.status(400).json({ error: e.message }); }
  const cleanTarget = (target || 'all').trim();
  if (cleanTarget !== 'all') {
    const targetUser = queryOne('SELECT id FROM users WHERE username = ?', [cleanTarget]);
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });
  }
  const allowReply = allow_reply === false || allow_reply === 0 ? 0 : 1;
  const imagesJson = cleanImages.length > 0 ? JSON.stringify(cleanImages) : null;
  const now = new Date().toISOString();
  runSQL('INSERT INTO messages (sender, subject, body, target, allow_reply, images, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.username, subject.trim(), sanitizeMessageHtml(body.trim()), cleanTarget, allowReply, imagesJson, now]);
  const msg = queryOne('SELECT * FROM messages WHERE sender = ? AND created_at = ? ORDER BY id DESC LIMIT 1', [req.username, now]);
  logActivity(req.username, 'inbox_message_sent', null, msg ? String(msg.id) : null, { target: cleanTarget, subject: subject.trim(), allow_reply: allowReply }, null, req);

  let recipients;
  if (cleanTarget === 'all') {
    recipients = queryAll("SELECT username, email, full_name FROM users WHERE is_active = 1 AND role = 'contributor' AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'");
  } else {
    recipients = queryAll("SELECT username, email, full_name FROM users WHERE username = ? AND is_active = 1 AND email IS NOT NULL AND TRIM(email) != ''", [cleanTarget]);
  }
  const superadminsCc = queryAll("SELECT username, email, full_name FROM users WHERE role = 'superadmin' AND is_active = 1 AND username != ? AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'", [req.username]);
  const seen = new Set(recipients.map(r => r.username));
  for (const sa of superadminsCc) { if (!seen.has(sa.username)) recipients.push(sa); }
  const emailResults = await sendInboxEmails(req.username, subject.trim(), body.trim(), recipients);

  io.emit('inbox:new', { id: msg ? msg.id : null, subject: subject.trim(), sender: req.username, target: cleanTarget, created_at: now });
  res.json({ success: true, messageId: msg ? msg.id : null, emailResults });
});

// ── Email queue (daily batch sender) ──
//
// Resend's free tier caps outbound email per day. When an admin broadcasts to
// many collaborators we cannot deliver in a single shot, so we store the
// per-recipient envelopes in `message_queue` and drain at most
// EMAIL_DAILY_LIMIT entries per day (default 80; override with env). Recipients
// are sorted by polygon count
// descending, so the most active mappers always hear from us first.
const EMAIL_DAILY_LIMIT = parseInt(process.env.EMAIL_DAILY_LIMIT || '80', 10);
const EMAIL_QUEUE_TICK_MS = 5 * 60 * 1000; // 5 min — cheap and self-correcting.

function _todayUtcDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function _startOfTodayUtcIso() {
  return _todayUtcDateStr() + 'T00:00:00.000Z';
}

function _emailsSentToday() {
  // Counts both immediate sends from /api/admin/messages and queue-drained sends.
  // Immediate sends don't go through the queue, so we conservatively count any
  // queue row marked 'sent' since UTC midnight as the floor of today's usage.
  const row = queryOne(
    "SELECT COUNT(*) AS n FROM message_queue WHERE status = 'sent' AND sent_at >= ?",
    [_startOfTodayUtcIso()]
  );
  return row ? Number(row.n || 0) : 0;
}

function _remainingEmailBudgetToday() {
  return Math.max(0, EMAIL_DAILY_LIMIT - _emailsSentToday());
}

async function _sendOneQueueRow(row, msg) {
  if (!resend) {
    runSQL("UPDATE message_queue SET status = 'failed', last_error = ?, attempts = attempts + 1 WHERE id = ?",
      ['email provider not configured', row.id]);
    return false;
  }
  try {
    const senderProfile = _lookupSenderProfile(msg.sender);
    const senderFooter = _renderSenderFooter(senderProfile, msg.sender);
    const senderLabel = senderProfile && senderProfile.full_name
      ? `${senderProfile.full_name} (@${msg.sender})`
      : `@${msg.sender}`;
    await resend.emails.send({
      from: RESEND_FROM,
      to: row.recipient_email,
      subject: `[leucaena.earth] ${msg.subject} — ${senderLabel}`,
      html: `<p>Olá <strong>${escapeHtml(row.recipient_full_name || row.recipient_username)}</strong>,</p>
             <p>${sanitizeMessageHtml(msg.body).replace(/\n/g, '<br>')}</p>
             <hr>${senderFooter}
             <p style="font-size:12px;color:#888;"><a href="https://map.leucaena.earth">Abrir plataforma</a></p>`
    });
    runSQL("UPDATE message_queue SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?",
      [new Date().toISOString(), row.id]);
    return true;
  } catch (e) {
    const errMsg = (e && e.message) ? String(e.message).slice(0, 500) : 'unknown error';
    console.error('Queue email error:', row.recipient_username, errMsg);
    runSQL("UPDATE message_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?", [errMsg, row.id]);
    // Hard-fail after 3 attempts so we don't block the queue forever.
    if ((row.attempts || 0) + 1 >= 3) {
      runSQL("UPDATE message_queue SET status = 'failed' WHERE id = ?", [row.id]);
    }
    return false;
  }
}

let _drainingQueue = false;
async function drainMessageQueueDueToday() {
  if (_drainingQueue) return { skipped: true };
  _drainingQueue = true;
  try {
    const today = _todayUtcDateStr();
    const remaining = _remainingEmailBudgetToday();
    if (remaining <= 0) return { sent: 0, failed: 0, remainingBudget: 0 };

    const due = queryAll(
      `SELECT * FROM message_queue
       WHERE status = 'pending' AND scheduled_for <= ?
       ORDER BY scheduled_for ASC, priority DESC, id ASC
       LIMIT ?`,
      [today, remaining]
    );
    let sent = 0, failed = 0;
    for (const row of due) {
      const msg = queryOne('SELECT id, sender, subject, body FROM messages WHERE id = ?', [row.message_id]);
      if (!msg) {
        runSQL("UPDATE message_queue SET status = 'failed', last_error = 'parent message missing' WHERE id = ?", [row.id]);
        failed++;
        continue;
      }
      const ok = await _sendOneQueueRow(row, msg);
      if (ok) sent++; else failed++;
    }
    if (sent > 0 || failed > 0) {
      try { persist(); } catch (e) { /* best-effort */ }
      console.log(`[email-queue] drained ${sent} sent, ${failed} failed (budget left: ${_remainingEmailBudgetToday()})`);
    }
    return { sent, failed, remainingBudget: _remainingEmailBudgetToday() };
  } finally {
    _drainingQueue = false;
  }
}

// Build the daily delivery plan for a recipient list. Returns an array
// of `{ date: 'YYYY-MM-DD', count: N }` describing how the recipients will be
// spread across days, given today's remaining budget.
function _planDailyDelivery(totalRecipients, startingBudget) {
  const plan = [];
  if (totalRecipients <= 0) return plan;
  let remaining = totalRecipients;
  let dayOffset = 0;
  let budget = Math.max(0, Math.min(startingBudget, EMAIL_DAILY_LIMIT));
  // Day 0 (today) uses whatever budget we have left for today, then each
  // following day gets the full EMAIL_DAILY_LIMIT.
  while (remaining > 0) {
    const slot = dayOffset === 0 ? budget : EMAIL_DAILY_LIMIT;
    const take = Math.min(slot, remaining);
    if (take > 0) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + dayOffset);
      plan.push({ date: d.toISOString().slice(0, 10), count: take });
      remaining -= take;
    }
    dayOffset++;
    if (dayOffset > 365) break; // safety cap, should never hit
  }
  return plan;
}

app.post('/api/admin/messages/batch', requireAuth, messageLimiter, async (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const { subject, body, usernames, allow_reply, images, target_kind } = req.body;
  const textErr = validateMessageText(subject, body);
  if (textErr) return res.status(400).json({ error: textErr });
  const limitErr = checkMessageLimits(req.username);
  if (limitErr) return res.status(429).json(limitErr);

  let cleanImages = null;
  try { cleanImages = validateMessageImages(images); } catch (e) { return res.status(400).json({ error: e.message }); }

  // Resolve the recipient roster, joined with mask_count for ordering. We
  // count polygons via `created_by` (the polygons table uses that column,
  // not `username`).
  let recipients;
  if (target_kind === 'all_collaborators') {
    recipients = queryAll(`
      SELECT u.username, u.email, u.full_name,
             COALESCE((SELECT COUNT(*) FROM polygons p WHERE p.created_by = u.username AND p.deleted_at IS NULL), 0) AS mask_count
      FROM users u
      WHERE u.is_active = 1 AND u.role = 'contributor'
        AND u.email IS NOT NULL AND TRIM(u.email) != ''
        AND u.username != 'deleted'
    `);
  } else {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: 'usernames array required' });
    }
    const cleanList = [...new Set(usernames.map(s => String(s || '').trim()).filter(Boolean))];
    if (cleanList.length === 0) return res.status(400).json({ error: 'usernames array required' });
    const placeholders = cleanList.map(() => '?').join(',');
    recipients = queryAll(`
      SELECT u.username, u.email, u.full_name,
             COALESCE((SELECT COUNT(*) FROM polygons p WHERE p.created_by = u.username AND p.deleted_at IS NULL), 0) AS mask_count
      FROM users u
      WHERE u.username IN (${placeholders})
        AND u.is_active = 1
        AND u.email IS NOT NULL AND TRIM(u.email) != ''
    `, cleanList);
  }

  recipients = recipients.filter(r => r && r.email);
  if (recipients.length === 0) return res.status(400).json({ error: 'No deliverable recipients (need active users with email).' });

  // Sort: most polygons first, alphabetical tiebreak.
  recipients.sort((a, b) => (b.mask_count || 0) - (a.mask_count || 0)
    || String(a.username || '').localeCompare(String(b.username || '')));

  const allowReply = allow_reply === false || allow_reply === 0 ? 0 : 1;
  const imagesJson = cleanImages.length > 0 ? JSON.stringify(cleanImages) : null;
  const now = new Date().toISOString();
  // One messages row per batch — UI shows it as a single broadcast. Recipients
  // can still see/read it via inbox visibility (target='all') even though we
  // email them in waves.
  const batchTarget = target_kind === 'all_collaborators' ? 'all' : 'all';
  // recipients_meta lets the sender's inbox show the actual recipient list as a
  // single thread instead of replicating per-user. We persist sender-visible
  // metadata: usernames, full names, and whether this was an "all collaborators"
  // broadcast so the UI can render "Todos os colaboradores (N)" instead of an
  // exhaustive list when appropriate.
  const recipientsMeta = {
    kind: target_kind === 'all_collaborators' ? 'all_collaborators' : 'list',
    total: recipients.length,
    usernames: recipients.map(r => r.username),
    names: recipients.reduce((acc, r) => { acc[r.username] = r.full_name || null; return acc; }, {})
  };
  const recipientsMetaJson = JSON.stringify(recipientsMeta);
  runSQL('INSERT INTO messages (sender, subject, body, target, allow_reply, images, recipients_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.username, subject.trim(), sanitizeMessageHtml(body.trim()), batchTarget, allowReply, imagesJson, recipientsMetaJson, now]);
  const msg = queryOne('SELECT * FROM messages WHERE sender = ? AND created_at = ? ORDER BY id DESC LIMIT 1', [req.username, now]);
  if (!msg) return res.status(500).json({ error: 'Failed to persist message' });

  // Plan the daily distribution.
  const startingBudget = _remainingEmailBudgetToday();
  const plan = _planDailyDelivery(recipients.length, startingBudget);

  // Insert queue rows: walk recipients in priority order, advancing through plan slots.
  let recipientIdx = 0;
  for (const slot of plan) {
    for (let k = 0; k < slot.count && recipientIdx < recipients.length; k++) {
      const r = recipients[recipientIdx++];
      runSQL(
        `INSERT INTO message_queue
           (message_id, recipient_username, recipient_email, recipient_full_name, scheduled_for, priority, status, attempts, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
        [msg.id, r.username, r.email, r.full_name || null, slot.date, Number(r.mask_count || 0), now]
      );
    }
  }
  persist();

  logActivity(req.username, 'inbox_message_batch', null, String(msg.id),
    { subject: subject.trim(), total: recipients.length, plan, allow_reply: allowReply }, null, req);
  io.emit('inbox:new', { id: msg.id, subject: subject.trim(), sender: req.username, target: batchTarget, created_at: now });

  // Drain today's slice immediately (best-effort; the worker covers retries).
  const drained = await drainMessageQueueDueToday();

  res.json({
    success: true,
    messageId: msg.id,
    total: recipients.length,
    plan,
    sentToday: drained.sent || 0,
    failedToday: drained.failed || 0,
    dailyLimit: EMAIL_DAILY_LIMIT,
    remainingBudgetToday: _remainingEmailBudgetToday()
  });
});

app.get('/api/admin/messages/:id/recipients', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const msgId = Number(req.params.id);
  const msg = queryOne('SELECT id, sender, recipients_meta FROM messages WHERE id = ?', [msgId]);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  // Pull live delivery status from message_queue (covers batch sends). The
  // client merges this with recipients_meta to show "delivered/pending/failed"
  // chips next to each recipient.
  const queueRows = queryAll(
    `SELECT recipient_username AS username, recipient_full_name AS full_name,
            recipient_email AS email, status, scheduled_for, sent_at, attempts, last_error
     FROM message_queue WHERE message_id = ? ORDER BY scheduled_for ASC, priority DESC, id ASC`,
    [msgId]
  );
  let meta = null;
  if (msg.recipients_meta) {
    try { meta = JSON.parse(msg.recipients_meta); } catch (e) { meta = null; }
  }
  res.json({ id: msg.id, meta, queue: queueRows });
});

app.get('/api/admin/messages/queue/status', requireAuth, (req, res) => {
  if (!isAdmin(req.username)) return res.status(403).json({ error: 'Admin only' });
  const today = _todayUtcDateStr();
  const perDay = queryAll(
    `SELECT scheduled_for AS date, status, COUNT(*) AS n
     FROM message_queue
     WHERE status IN ('pending', 'failed')
     GROUP BY scheduled_for, status
     ORDER BY scheduled_for ASC`
  );
  const sentToday = _emailsSentToday();
  res.json({
    today,
    dailyLimit: EMAIL_DAILY_LIMIT,
    sentToday,
    remainingBudgetToday: _remainingEmailBudgetToday(),
    upcoming: perDay
  });
});

app.post('/api/messages/send', requireAuth, messageLimiter, async (req, res) => {
  const { subject, body, images } = req.body;
  const textErr = validateMessageText(subject, body);
  if (textErr) return res.status(400).json({ error: textErr });
  const limitErr = checkMessageLimits(req.username);
  if (limitErr) return res.status(429).json(limitErr);
  let cleanImages = null;
  try { cleanImages = validateMessageImages(images); } catch (e) { return res.status(400).json({ error: e.message }); }
  const imagesJson = cleanImages.length > 0 ? JSON.stringify(cleanImages) : null;
  const now = new Date().toISOString();
  runSQL('INSERT INTO messages (sender, subject, body, target, allow_reply, images, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [req.username, subject.trim(), sanitizeMessageHtml(body.trim()), 'admins', imagesJson, now]);
  const msg = queryOne('SELECT * FROM messages WHERE sender = ? AND created_at = ? ORDER BY id DESC LIMIT 1', [req.username, now]);
  logActivity(req.username, 'inbox_message_to_admin', null, msg ? String(msg.id) : null, { subject: subject.trim() }, null, req);

  const superadmins = queryAll("SELECT username, email, full_name FROM users WHERE role = 'superadmin' AND is_active = 1 AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'");
  const emailResults = await sendInboxEmails(req.username, subject.trim(), body.trim(), superadmins);

  io.emit('inbox:new', { id: msg ? msg.id : null, subject: subject.trim(), sender: req.username, target: 'admins', created_at: now });
  res.json({ success: true, messageId: msg ? msg.id : null, emailResults });
});

app.post('/api/messages/reply', requireAuth, messageLimiter, async (req, res) => {
  const { parent_id, body } = req.body;
  if (!parent_id || !body) return res.status(400).json({ error: 'parent_id and body are required' });
  if (typeof body !== 'string' || stripHtmlTags(body).length === 0) return res.status(400).json({ error: 'body cannot be empty' });
  if (stripHtmlTags(body).length > MSG_BODY_MAX) return res.status(400).json({ error: `Mensagem deve ter no máximo ${MSG_BODY_MAX} caracteres` });
  const limitErr = checkMessageLimits(req.username);
  if (limitErr) return res.status(429).json(limitErr);
  const parent = queryOne('SELECT * FROM messages WHERE id = ?', [Number(parent_id)]);
  if (!parent) return res.status(404).json({ error: 'Original message not found' });
  if (!parent.allow_reply) return res.status(403).json({ error: 'Replies are not allowed on this message' });

  const requesterRole = queryOne('SELECT role FROM users WHERE username = ?', [req.username]);
  const isRecipient = isSuperAdmin(req.username)
    || (parent.target === 'all' && requesterRole && requesterRole.role === 'contributor')
    || parent.target === req.username
    || (parent.target === 'admins' && isSuperAdmin(req.username))
    || parent.sender === req.username;
  if (!isRecipient) return res.status(403).json({ error: 'You are not a recipient of this message' });

  const replyTarget = parent.sender === req.username ? parent.target : parent.sender;
  const { images } = req.body;
  let cleanImages = null;
  try { cleanImages = validateMessageImages(images); } catch (e) { return res.status(400).json({ error: e.message }); }
  const imagesJson = cleanImages.length > 0 ? JSON.stringify(cleanImages) : null;
  const replySubject = parent.subject.startsWith('Re: ') ? parent.subject : 'Re: ' + parent.subject;
  const now = new Date().toISOString();
  runSQL('INSERT INTO messages (sender, subject, body, target, reply_to, allow_reply, images, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    [req.username, replySubject, sanitizeMessageHtml(body.trim()), replyTarget, parent.id, imagesJson, now]);
  const msg = queryOne('SELECT * FROM messages WHERE sender = ? AND created_at = ? ORDER BY id DESC LIMIT 1', [req.username, now]);
  logActivity(req.username, 'inbox_message_reply', null, msg ? String(msg.id) : null, { parent_id, subject: replySubject }, null, req);

  let recipients;
  if (replyTarget === 'all') {
    recipients = queryAll("SELECT username, email, full_name FROM users WHERE is_active = 1 AND role = 'contributor' AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'");
  } else if (replyTarget === 'admins') {
    recipients = queryAll("SELECT username, email, full_name FROM users WHERE role = 'superadmin' AND is_active = 1 AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'");
  } else {
    recipients = queryAll("SELECT username, email, full_name FROM users WHERE username = ? AND is_active = 1 AND email IS NOT NULL AND TRIM(email) != ''", [replyTarget]);
  }
  const superadminsCc = queryAll("SELECT username, email, full_name FROM users WHERE role = 'superadmin' AND is_active = 1 AND username != ? AND email IS NOT NULL AND TRIM(email) != '' AND username != 'deleted'", [req.username]);
  const seen = new Set(recipients.map(r => r.username));
  for (const sa of superadminsCc) { if (!seen.has(sa.username)) recipients.push(sa); }
  const emailResults = await sendInboxEmails(req.username, replySubject, body.trim(), recipients);

  io.emit('inbox:new', { id: msg ? msg.id : null, subject: replySubject, sender: req.username, target: replyTarget, created_at: now });
  res.json({ success: true, messageId: msg ? msg.id : null, emailResults });
});

app.get('/api/messages', requireAuth, (req, res) => {
  const cond = inboxVisibilityCondition();
  const messages = queryAll(
    `SELECT m.*, mr.read_at,
            u.full_name AS sender_full_name,
            u.role AS sender_role
     FROM messages m
     LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.username = ?
     LEFT JOIN users u ON u.username = m.sender
     WHERE ${cond}
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [req.username, ...inboxVisibilityParams(req.username)]
  );
  res.json(messages);
});

app.put('/api/messages/:id/read', requireAuth, (req, res) => {
  const msgId = Number(req.params.id);
  const msg = queryOne('SELECT id FROM messages WHERE id = ?', [msgId]);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const already = queryOne('SELECT message_id FROM message_reads WHERE message_id = ? AND username = ?', [msgId, req.username]);
  if (!already) {
    runSQL('INSERT INTO message_reads (message_id, username, read_at) VALUES (?, ?, ?)', [msgId, req.username, new Date().toISOString()]);
    logActivity(req.username, 'inbox_message_read', null, String(msgId), null, null, req);
  }
  res.json({ success: true });
});

app.get('/api/messages/unread-count', requireAuth, (req, res) => {
  const cond = inboxVisibilityCondition();
  const params = [...inboxVisibilityParams(req.username), req.username, req.username];
  const row = queryOne(
    `SELECT COUNT(*) as cnt FROM messages m
     WHERE ${cond}
     AND m.sender != ?
     AND NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.username = ?)`,
    params
  );
  const count = row ? row.cnt : 0;
  if (count > 0) console.log(`[inbox] ${req.username} has ${count} unread message(s)`);
  res.json({ count });
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Apenas Super Admin pode apagar mensagens' });
  const msgId = Number(req.params.id);
  const msg = queryOne('SELECT * FROM messages WHERE id = ?', [msgId]);
  if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });
  runSQL('DELETE FROM message_reads WHERE message_id = ?', [msgId]);
  runSQL('UPDATE messages SET reply_to = NULL WHERE reply_to = ?', [msgId]);
  runSQL('DELETE FROM messages WHERE id = ?', [msgId]);
  logActivity(req.username, 'inbox_message_delete', null, String(msgId), { subject: msg.subject, sender: msg.sender }, null, req);
  res.json({ success: true });
});

app.post('/api/messages/batch', requireAuth, (req, res) => {
  const { action, ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
  if (action === 'delete') {
    if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Apenas Super Admin' });
    for (const id of ids) {
      runSQL('DELETE FROM message_reads WHERE message_id = ?', [Number(id)]);
      runSQL('UPDATE messages SET reply_to = NULL WHERE reply_to = ?', [Number(id)]);
      runSQL('DELETE FROM messages WHERE id = ?', [Number(id)]);
    }
    logActivity(req.username, 'inbox_batch_delete', null, null, { count: ids.length, ids }, null, req);
    return res.json({ success: true, affected: ids.length });
  }
  if (action === 'mark_read') {
    const now = new Date().toISOString();
    for (const id of ids) {
      const already = queryOne('SELECT message_id FROM message_reads WHERE message_id = ? AND username = ?', [Number(id), req.username]);
      if (!already) runSQL('INSERT INTO message_reads (message_id, username, read_at) VALUES (?, ?, ?)', [Number(id), req.username, now]);
    }
    return res.json({ success: true, affected: ids.length });
  }
  if (action === 'mark_unread') {
    for (const id of ids) {
      runSQL('DELETE FROM message_reads WHERE message_id = ? AND username = ?', [Number(id), req.username]);
    }
    return res.json({ success: true, affected: ids.length });
  }
  return res.status(400).json({ error: 'Invalid action' });
});

app.get('/api/admin/logs', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) return res.status(403).json({ error: 'Equipe ou admin apenas' });
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
    const header = 'id,timestamp,username,role,action,cell_id,object_id,details\n';
    const rows = logs.map(l =>
      `${l.id},${l.timestamp},${l.username || ''},${l.role || ''},${l.action},${l.cell_id || ''},${l.object_id || ''},"${(l.details || '').replace(/"/g, '""')}"`
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
    // Pass req so each batched event carries device/UA context; cheap because
    // we parse the UA once per insert and the columns are tiny strings.
    logActivity(req.username, e.action || 'unknown', e.cell_id || null, e.object_id || null, e.details || null, null, req);
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
    // Phase 1: optional copy to S3-compatible object storage (Cloudflare R2 recommended — free tier).
    backupRemote.queueRemoteBackup(dest);
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
  logActivity(req.username, 'db_backup_download', null, null, null, null, req);
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
    logActivity(req.username, 'db_backup_manual', null, null, null, null, req);
    res.json({ success: true, file: path.basename(dest), remote: backupRemote.getRemoteBackupStatus() });
  } else {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// Off-site backup status (R2 / S3-compatible). Does not expose secrets.
app.get('/api/admin/backup-remote/status', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  res.json(backupRemote.getRemoteBackupStatus());
});

// ── REST API ──

app.get('/api/states', (req, res) => {
  const rows = queryAll(`
    SELECT gcs.state,
           COUNT(DISTINCT gcs.grid_cell_id) AS cell_count,
           SUM(CASE WHEN gc.grid_status = 'finished' THEN 1 ELSE 0 END) AS finished_count,
           SUM(CASE WHEN gc.grid_status IN ('mapping', 'in_use') THEN 1 ELSE 0 END) AS mapping_count,
           SUM(CASE WHEN gc.grid_status = 'not_yet_finished' THEN 1 ELSE 0 END) AS tomap_count,
           COALESCE(SUM(gc.numpoints), 0) AS points_registered
    FROM grid_cell_states gcs
    LEFT JOIN grid_cells gc ON gc.id = gcs.grid_cell_id
    GROUP BY gcs.state
    ORDER BY gcs.state
  `);
  res.json(rows);
});

app.get('/api/states/:uf/stats', (req, res) => {
  const uf = String(req.params.uf).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    return res.status(400).json({ error: 'UF inválida. Use 2 letras (ex: SP, MG).' });
  }
  const cellIds = queryAll('SELECT DISTINCT grid_cell_id FROM grid_cell_states WHERE UPPER(state) = ?', [uf]);
  if (cellIds.length === 0) {
    return res.json({ state: uf, cells: 0, by_status: {}, masks: 0, mask_area_ha: 0, points: 0 });
  }
  const ids = cellIds.map(r => r.grid_cell_id);
  const ph = ids.map(() => '?').join(',');
  const statusRows = queryAll(`SELECT grid_status, COUNT(*) as cnt FROM grid_cells WHERE id IN (${ph}) GROUP BY grid_status`, ids);
  const byStatus = {};
  let totalCells = 0;
  for (const r of statusRows) { byStatus[r.grid_status] = r.cnt; totalCells += r.cnt; }
  const maskRow = queryOne(`SELECT COUNT(*) as cnt, COALESCE(SUM(area_ha), 0) as area FROM polygons WHERE deleted_at IS NULL AND grid_cell_id IN (${ph})`, ids);
  const cells = queryAll(`SELECT geometry FROM grid_cells WHERE id IN (${ph})`, ids);
  let pointCount = 0;
  if (cells.length > 0) {
    const allPoints = queryAll('SELECT geometry FROM occurrence_points');
    for (const p of allPoints) {
      const g = JSON.parse(p.geometry);
      const [lng, lat] = g.coordinates;
      for (const c of cells) {
        const cg = JSON.parse(c.geometry);
        const rings = cg.type === 'MultiPolygon' ? cg.coordinates.map(poly => poly[0]) : [cg.coordinates[0]];
        if (rings.some(ring => pointInPolygon([lng, lat], ring))) { pointCount++; break; }
      }
    }
  }
  res.json({
    state: uf,
    cells: totalCells,
    by_status: byStatus,
    masks: maskRow ? maskRow.cnt : 0,
    mask_area_ha: maskRow ? Math.round(maskRow.area * 100) / 100 : 0,
    points: pointCount
  });
});

app.get('/api/grid', (req, res) => {
  const stateQ = req.query.state;
  const baseSql = 'SELECT id, fid, grid_id, geometry, grid_status, numpoints, locked_by, locked_at, updated_at, worked_by, finished_by FROM grid_cells';
  let cells;
  if (stateQ != null && String(stateQ).trim() !== '') {
    const uf = String(stateQ).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) {
      return res.status(400).json({ error: 'Parâmetro state inválido. Use uma UF com 2 letras (ex: SP, MS).' });
    }
    const cellIds = queryAll('SELECT DISTINCT grid_cell_id FROM grid_cell_states WHERE UPPER(state) = ?', [uf]);
    if (cellIds.length === 0) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }
    const placeholders = cellIds.map(() => '?').join(',');
    cells = queryAll(`${baseSql} WHERE id IN (${placeholders})`, cellIds.map(r => r.grid_cell_id));
  } else {
    cells = queryAll(baseSql);
  }
  const stateRows = queryAll('SELECT grid_cell_id, state FROM grid_cell_states');
  const stateMap = {};
  for (const r of stateRows) {
    if (!stateMap[r.grid_cell_id]) stateMap[r.grid_cell_id] = [];
    stateMap[r.grid_cell_id].push(r.state);
  }
  const maskStats = {};
  const polyRows = queryAll('SELECT grid_cell_id, COALESCE(area_ha,0) as area_ha, geometry, created_by FROM polygons WHERE deleted_at IS NULL');
  for (const p of polyRows) {
    const cid = p.grid_cell_id;
    if (!maskStats[cid]) maskStats[cid] = { cnt: 0, ha: 0, authors: new Set() };
    maskStats[cid].cnt++;
    let ha = Number(p.area_ha);
    if (!ha || ha <= 0) {
      try {
        ha = polygonAreaHa(JSON.parse(p.geometry));
      } catch (e) {
        ha = 0;
      }
    }
    maskStats[cid].ha += ha;
    if (p.created_by && p.created_by !== 'deleted') maskStats[cid].authors.add(p.created_by);
  }
  for (const cid of Object.keys(maskStats)) {
    const m = maskStats[cid];
    m.ha = Math.round(m.ha * 10) / 10;
    m.mapped_by = m.authors.size ? [...m.authors].sort().join(',') : null;
  }
  const features = cells.map(c => {
    const ms = maskStats[c.id] || { cnt: 0, ha: 0, mapped_by: null };
    return {
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
        finished_by: c.finished_by || null,
        states: stateMap[c.id] || [],
        mask_count: ms.cnt,
        mask_area_ha: ms.ha,
        mapped_by: ms.mapped_by || null
    },
    geometry: JSON.parse(c.geometry)
    };
  });
  res.json({ type: 'FeatureCollection', features });
});

app.put('/api/grid/:id/status', requireAuth, requireVerified, (req, res) => {
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

// Lock: cell → in_use, append locker to worked_by (comma-separated attribution trail).
app.post('/api/grid/:id/lock', requireAuth, requireVerified, (req, res) => {
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

  const workedByStr = workedBy.join(',');
  const cellName = cell.grid_id || String(cell.fid);
  io.emit('cell:locked', { cellId: Number(id), username, cellName });
  io.emit('cell:statusChanged', { cellId: Number(id), status: 'in_use', username, worked_by: workedByStr });
  logActivity(username, 'cell_lock', Number(id), null, { prev_status: cell.grid_status }, null, req);
  const cellStateRow = queryOne('SELECT state FROM grid_cell_states WHERE grid_cell_id = ? LIMIT 1', [Number(id)]);
  if (cellStateRow) {
    runSQL('UPDATE users SET last_edited_state = ? WHERE username = ?', [cellStateRow.state, username]);
  }
  persist();
  res.json({ success: true, worked_by: workedByStr });
});

app.post('/api/grid/:id/heartbeat', requireAuth, requireVerified, (req, res) => {
  const { id } = req.params;
  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(id)]);
  if (!cell || cell.locked_by !== req.username) return res.status(400).json({ error: 'Not locked by you' });
  runSQL('UPDATE grid_cells SET locked_at = ? WHERE id = ?', [new Date().toISOString(), Number(id)]);
  res.json({ success: true });
});

// Unlock: clear lock; if client sends not_yet_finished, refine to mapping / no_points / not_yet_finished; finished runs validateFinished.
app.post('/api/grid/:id/unlock', requireAuth, requireVerified, (req, res) => {
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
  let workedBy = cell.worked_by;

  // Colaboradores (e testers em modo colaborador) nunca finalizam; só equipe ou acima.
  if (newStatus === 'finished' && !isTeamOrAbove(username)) {
    return res.status(403).json({ error: 'Colaboradores não podem finalizar células' });
  }

  if (newStatus === 'finished') {
    const masksForFinish = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL LIMIT 1', [Number(id)]);
    if (masksForFinish.length === 0) {
      const cellGeomFin = JSON.parse(cell.geometry);
      const cellRingsFin = cellGeomFin.type === 'MultiPolygon'
        ? cellGeomFin.coordinates.map(p => p[0])
        : [cellGeomFin.coordinates[0]];
      const unvalidatedPts = queryAll('SELECT id, geometry FROM occurrence_points WHERE status = 0')
        .filter(p => {
          const g = JSON.parse(p.geometry);
          return cellRingsFin.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
        });
      if (unvalidatedPts.length > 0) {
        return res.status(400).json({
          error: `Não é possível finalizar: ${unvalidatedPts.length} ponto(s) ainda não validado(s). Valide todos os pontos antes de finalizar.`,
          uncoveredPointIds: unvalidatedPts.map(p => p.id)
        });
      }
      finishedBy = username;
    } else {
    const validation = validateFinished(Number(id));
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, uncoveredPointIds: validation.uncoveredPointIds || [] });
    }
    finishedBy = username;
    }
  }

  if (newStatus === 'not_yet_finished') {
    const masks = queryAll('SELECT id FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL LIMIT 1', [Number(id)]);
    if (masks.length > 0) {
      newStatus = 'mapping';
    } else {
      finishedBy = null;
      workedBy = null;
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
    'UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, finished_by = ?, worked_by = ?, updated_at = ? WHERE id = ?',
    [newStatus, finishedBy, workedBy, now, Number(id)]
  );

  const cellSummary = getCellMaskSummary(Number(id));
  const unlockCellName = cell.grid_id || String(cell.fid);

  io.emit('cell:unlocked', { cellId: Number(id), username, cellName: unlockCellName });
  io.emit('cell:statusChanged', {
    cellId: Number(id),
    status: newStatus,
    username,
    finished_by: finishedBy,
    worked_by: workedBy,
    mask_count: cellSummary.mask_count,
    mask_area_ha: cellSummary.mask_area_ha,
    mapped_by: cellSummary.mapped_by
  });
  logActivity(username, 'cell_unlock', Number(id), null, { newStatus }, null, req);
  persist();
  res.json({
    success: true,
    status: newStatus,
    maskCount: cellSummary.mask_count,
    areaHa: cellSummary.mask_area_ha,
    finished_by: finishedBy || null,
    worked_by: workedBy || null,
    mapped_by: cellSummary.mapped_by
  });
});

// ── Polygons ──

app.get('/api/polygons', (req, res) => {
  const { grid_cell_id } = req.query;
  let polys;
  if (grid_cell_id) {
    polys = queryAll('SELECT * FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL', [Number(grid_cell_id)]);
  } else {
    polys = queryAll('SELECT * FROM polygons WHERE deleted_at IS NULL');
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

app.post('/api/polygons', requireAuth, requireVerified, (req, res) => {
  const { grid_cell_id, geometry: rawGeometry } = req.body;
  const username = req.username;
  if (!rawGeometry || !grid_cell_id) {
    return res.status(400).json({ error: 'geometry e grid_cell_id obrigatórios' });
  }

  // Phase 3: server-side geometry validation (area, closure, self-intersection)
  const validResult = validatePolygonGeometry(rawGeometry);
  if (!validResult.ok) return res.status(422).json({ error: validResult.error });
  const geometry = validResult.geometry; // auto-cleaned version

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [Number(grid_cell_id)]);
  if (!cell) return res.status(404).json({ error: 'Célula do grid não encontrada' });
  if (cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const areaHa = Math.round(validResult.area_ha * 100000) / 100000;
  runSQL(
    'INSERT INTO polygons (id, grid_cell_id, geometry, created_by, created_at, updated_at, area_ha) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, Number(grid_cell_id), JSON.stringify(geometry), username || 'anonymous', now, now, areaHa]
  );

  const effRole = getEffectiveRole(username);
  const polyRole = effRole === 'superadmin' ? 'admin' : effRole;
  const polygon = { id, grid_cell_id: Number(grid_cell_id), geometry, created_by: username, created_by_role: polyRole, created_at: now, updated_at: now, area_ha: areaHa };
  const cellSummary = getCellMaskSummary(Number(grid_cell_id));
  io.emit('polygon:created', {
    ...polygon,
    cell_mask_count: cellSummary.mask_count,
    cell_mask_area_ha: cellSummary.mask_area_ha,
    cell_mapped_by: cellSummary.mapped_by
  });
  if (!isSuperAdmin(username)) bumpStat(isMobileUA(req) ? 'mask_count_mobile' : 'mask_count_desktop');
  logActivity(username, 'polygon_create', Number(grid_cell_id), id, null, null, req);
  persist();
  res.json({ ...polygon, cell_summary: cellSummary });
});

app.put('/api/polygons/:id', requireAuth, requireVerified, (req, res) => {
  const { id } = req.params;
  const { geometry: rawGeometry } = req.body;
  const username = req.username;

  const poly = queryOne('SELECT * FROM polygons WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado' });

  if (poly.created_by !== username && !isAdmin(username)) {
    return res.status(403).json({ error: `Este polígono pertence a ${poly.created_by}` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
  }

  // Phase 3: server-side geometry validation
  const validResult = validatePolygonGeometry(rawGeometry);
  if (!validResult.ok) return res.status(422).json({ error: validResult.error });
  const geometry = validResult.geometry;

  const now = new Date().toISOString();
  const areaHa = Math.round(validResult.area_ha * 100000) / 100000;
  runSQL('UPDATE polygons SET geometry = ?, updated_at = ?, area_ha = ? WHERE id = ?', [JSON.stringify(geometry), now, areaHa, id]);

  io.emit('polygon:updated', { id, geometry, updated_at: now, area_ha: areaHa });
  logActivity(username, 'polygon_edit', poly.grid_cell_id, id, null, null, req);
  persist();
  res.json({ success: true, area_ha: areaHa });
});

app.delete('/api/polygons/:id', requireAuth, requireVerified, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  const poly = queryOne('SELECT * FROM polygons WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado' });

  if (!canDeleteMask(username, poly.created_by)) {
    return res.status(403).json({ error: `Este polígono pertence a ${poly.created_by}. Somente o criador ou um administrador pode excluí-lo.` });
  }

  const cell = queryOne('SELECT * FROM grid_cells WHERE id = ?', [poly.grid_cell_id]);
  if (cell && cell.locked_by && cell.locked_by !== username) {
    return res.status(409).json({ error: `Célula bloqueada por ${cell.locked_by}` });
  }

  // Phase 2: soft-delete — keep the row for audit / restore; hide via deleted_at IS NULL filters.
  const deletedAt = new Date().toISOString();
  runSQL('UPDATE polygons SET deleted_at = ?, deleted_by = ? WHERE id = ?', [deletedAt, username, id]);
  const afterSummary = getCellMaskSummary(poly.grid_cell_id);
  io.emit('polygon:deleted', {
    id,
    grid_cell_id: poly.grid_cell_id,
    cell_mask_count: afterSummary.mask_count,
    cell_mask_area_ha: afterSummary.mask_area_ha,
    cell_mapped_by: afterSummary.mapped_by
  });
  logActivity(username, 'polygon_delete', poly.grid_cell_id, id, { soft: true }, null, req);

  if (cell) {
    const remaining = queryAll('SELECT id, geometry FROM polygons WHERE grid_cell_id = ? AND deleted_at IS NULL', [poly.grid_cell_id]);
    if (remaining.length === 0) {
      if (cell.grid_status === 'finished' || cell.grid_status === 'mapping') {
        const cellGeom = JSON.parse(cell.geometry);
        const cellRings = cellGeom.type === 'MultiPolygon'
          ? cellGeom.coordinates.map(p => p[0])
          : [cellGeom.coordinates[0]];
        const allPoints = queryAll('SELECT geometry FROM occurrence_points');
        const hasPoints = allPoints.some(p => {
          const g = JSON.parse(p.geometry);
          return cellRings.some(ring => pointInPolygon([g.coordinates[0], g.coordinates[1]], ring));
        });
        const newStatus = hasPoints ? 'not_yet_finished' : 'no_points';
        const now = new Date().toISOString();
        runSQL('UPDATE grid_cells SET grid_status = ?, finished_by = NULL, worked_by = NULL, updated_at = ? WHERE id = ?',
          [newStatus, now, poly.grid_cell_id]);
        io.emit('cell:statusChanged', {
          cellId: poly.grid_cell_id,
          status: newStatus,
          username,
          finished_by: null,
          worked_by: null,
          mask_count: 0,
          mask_area_ha: 0,
          mapped_by: null
        });
      } else if (cell.grid_status === 'in_use' && cell.finished_by) {
        const now = new Date().toISOString();
        runSQL('UPDATE grid_cells SET finished_by = NULL, updated_at = ? WHERE id = ?', [now, poly.grid_cell_id]);
      }
    }
  }

  persist();
  res.json({ success: true, cell_summary: afterSummary });
});

// ── Restore a soft-deleted polygon (Super Admin) ──

app.post('/api/admin/polygons/:id/restore', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { id } = req.params;
  const poly = queryOne('SELECT * FROM polygons WHERE id = ?', [id]);
  if (!poly) return res.status(404).json({ error: 'Polígono não encontrado.' });
  if (!poly.deleted_at) return res.status(400).json({ error: 'Polígono não está excluído.' });

  runSQL('UPDATE polygons SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL WHERE id = ?', [id]);
  const summary = getCellMaskSummary(poly.grid_cell_id);
  const geometry = JSON.parse(poly.geometry);
  io.emit('polygon:created', {
    id: poly.id,
    grid_cell_id: poly.grid_cell_id,
    geometry,
    created_by: poly.created_by,
    created_at: poly.created_at,
    updated_at: poly.updated_at,
    area_ha: poly.area_ha || 0,
    cell_mask_count: summary.mask_count,
    cell_mask_area_ha: summary.mask_area_ha,
    cell_mapped_by: summary.mapped_by
  });
  logActivity(req.username, 'polygon_restore', poly.grid_cell_id, id, null, null, req);
  persist();
  res.json({ success: true, cell_summary: summary });
});

// ── Import GeoJSON points (Super Admin) ──

// Dedup by lng/lat rounded to 5 decimals (~1.1m); each new point emits point:created for live clients.
app.post('/api/admin/points/import', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });

  const geojson = req.body;
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    return res.status(400).json({ error: 'GeoJSON inválido. Esperado um FeatureCollection com features.' });
  }

  const features = geojson.features;
  if (features.length === 0) {
    return res.status(400).json({ error: 'Nenhuma feature encontrada no GeoJSON.' });
  }
  if (features.length > 50000) {
    return res.status(400).json({ error: 'Máximo de 50.000 pontos por importação.' });
  }

  const errors = [];
  const validPoints = [];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    if (!f || !f.geometry) { errors.push(`Feature ${i + 1}: sem geometry`); continue; }

    let coords;
    if (f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
      coords = f.geometry.coordinates;
    } else { errors.push(`Feature ${i + 1}: tipo "${f.geometry.type}" não é Point`); continue; }

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (isNaN(lng) || isNaN(lat)) { errors.push(`Feature ${i + 1}: coordenadas inválidas`); continue; }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { errors.push(`Feature ${i + 1}: coordenadas fora do intervalo (lat:${lat}, lng:${lng})`); continue; }

    validPoints.push({ lat, lng });
  }

  if (validPoints.length === 0) {
    return res.status(400).json({ error: 'Nenhum ponto válido encontrado.', details: errors.slice(0, 20) });
  }

  const existingPoints = queryAll('SELECT geometry FROM occurrence_points');
  const existingSet = new Set();
  for (const ep of existingPoints) {
    const g = JSON.parse(ep.geometry);
    const key = `${Number(g.coordinates[0]).toFixed(5)}_${Number(g.coordinates[1]).toFixed(5)}`;
    existingSet.add(key);
  }

  const maxFidRow = queryOne('SELECT MAX(fid) as maxFid FROM occurrence_points');
  let nextFid = (maxFidRow && maxFidRow.maxFid != null) ? maxFidRow.maxFid + 1 : 1;

  let inserted = 0;
  let duplicates = 0;
  const createdPoints = [];
  for (const pt of validPoints) {
    const key = `${pt.lng.toFixed(5)}_${pt.lat.toFixed(5)}`;
    if (existingSet.has(key)) {
      duplicates++;
      continue;
    }
    existingSet.add(key);
    const geometry = { type: 'Point', coordinates: [pt.lng, pt.lat] };
    runSQL(
      'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status, added_by, added_by_role, added_at) VALUES (?, ?, 0, ?, 0, ?, ?, ?)',
      [nextFid, JSON.stringify(geometry), 'crowdmapping', req.username, 'superadmin', new Date().toISOString()]
    );
    const row = queryOne('SELECT id FROM occurrence_points WHERE fid = ?', [nextFid]);
    createdPoints.push({ id: row.id, fid: nextFid, not_valid: 0, status: 0, layer: 'crowdmapping', geometry });
    nextFid++;
    inserted++;
  }

  persist();
  logActivity(req.username, 'import_points', null, null, { count: inserted, duplicates, errors: errors.length }, null, req);

  for (const p of createdPoints) {
    io.emit('point:created', p);
  }

  res.json({
    success: true,
    imported: inserted,
    duplicates,
    skipped: errors.length,
    details: errors.length > 0 ? errors.slice(0, 20) : undefined
  });
});

// ── Deduplicate points (Super Admin) ──

// In-memory backup of deleted duplicates for undo within the same server session
let _dedupUndoBackup = null;

app.get('/api/admin/points/duplicates/preview', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });

  const points = queryAll('SELECT id, fid, geometry, layer, status FROM occurrence_points ORDER BY id ASC');
  const seen = new Map();
  const duplicates = [];

  for (const p of points) {
    const g = JSON.parse(p.geometry);
    const key = `${Number(g.coordinates[0]).toFixed(5)}_${Number(g.coordinates[1]).toFixed(5)}`;
    if (seen.has(key)) {
      duplicates.push({ id: p.id, fid: p.fid, layer: p.layer, lat: g.coordinates[1], lng: g.coordinates[0], kept_id: seen.get(key) });
    } else {
      seen.set(key, p.id);
    }
  }

  res.json({ total_points: points.length, duplicate_count: duplicates.length, duplicates: duplicates.slice(0, 100) });
});

app.post('/api/admin/points/duplicates/remove', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });

  const points = queryAll('SELECT id, fid, geometry, layer, status, not_valid FROM occurrence_points ORDER BY id ASC');
  const seen = new Map();
  const toDelete = [];

  for (const p of points) {
    const g = JSON.parse(p.geometry);
    const key = `${Number(g.coordinates[0]).toFixed(5)}_${Number(g.coordinates[1]).toFixed(5)}`;
    if (seen.has(key)) {
      toDelete.push({ id: p.id, fid: p.fid, geometry: p.geometry, layer: p.layer, status: p.status, not_valid: p.not_valid });
    } else {
      seen.set(key, p.id);
    }
  }

  if (toDelete.length === 0) {
    return res.json({ success: true, removed: 0 });
  }

  _dedupUndoBackup = { timestamp: new Date().toISOString(), username: req.username, points: toDelete };

  const ids = toDelete.map(d => d.id);
  const placeholders = ids.map(() => '?').join(',');
  runSQL(`DELETE FROM occurrence_points WHERE id IN (${placeholders})`, ids);
  persist();

  logActivity(req.username, 'dedup_points', null, null, { removed: toDelete.length }, null, req);

  for (const d of toDelete) {
    io.emit('point:deleted', { id: d.id });
  }

  res.json({ success: true, removed: toDelete.length });
});

app.post('/api/admin/points/duplicates/undo', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });

  if (!_dedupUndoBackup || !_dedupUndoBackup.points || _dedupUndoBackup.points.length === 0) {
    return res.status(400).json({ error: 'Nenhuma deduplicação para desfazer' });
  }

  let restored = 0;
  for (const p of _dedupUndoBackup.points) {
    runSQL(
      'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status) VALUES (?, ?, ?, ?, ?)',
      [p.fid, p.geometry, p.not_valid || 0, p.layer || 'crowdmapping', p.status || 0]
    );
    const row = queryOne('SELECT id FROM occurrence_points WHERE fid = ?', [p.fid]);
    if (row) {
      io.emit('point:created', { id: row.id, fid: p.fid, not_valid: p.not_valid || 0, status: p.status || 0, layer: p.layer || 'crowdmapping', geometry: JSON.parse(p.geometry) });
    }
    restored++;
  }

  persist();
  logActivity(req.username, 'dedup_undo', null, null, { restored }, null, req);

  const backup = _dedupUndoBackup;
  _dedupUndoBackup = null;
  res.json({ success: true, restored, original_timestamp: backup.timestamp });
});

// ── Cleanup contributor points covered by polygons ──

let _coveredUndoBackup = null;

function _findCoveredContributorPoints() {
  const collabPoints = queryAll(
    "SELECT id, fid, geometry, layer, status, not_valid, added_by, added_by_role, added_at FROM occurrence_points WHERE added_by_role = 'contributor' AND layer = 'crowdmapping' ORDER BY id ASC"
  );
  const polys = queryAll('SELECT id, geometry FROM polygons WHERE deleted_at IS NULL');
  const parsedPolys = polys.map(p => ({ id: p.id, geom: JSON.parse(p.geometry) }));

  const covered = [];
  for (const pt of collabPoints) {
    const g = JSON.parse(pt.geometry);
    const [lng, lat] = g.coordinates;
    const inside = parsedPolys.some(poly => {
      const coords = poly.geom.coordinates;
      if (!pointInPolygon([lng, lat], coords[0])) return false;
      for (let i = 1; i < coords.length; i++) {
        if (pointInPolygon([lng, lat], coords[i])) return false;
      }
      return true;
    });
    if (inside) covered.push(pt);
  }
  return { covered, totalChecked: collabPoints.length, totalPolys: polys.length };
}

app.get('/api/admin/points/covered/preview', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { covered, totalChecked, totalPolys } = _findCoveredContributorPoints();
  const sample = covered.slice(0, 20).map(p => {
    const g = JSON.parse(p.geometry);
    return { id: p.id, fid: p.fid, lat: g.coordinates[1], lng: g.coordinates[0], added_by: p.added_by };
  });
  res.json({ covered_count: covered.length, total_checked: totalChecked, total_polys: totalPolys, sample });
});

app.post('/api/admin/points/covered/remove', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });
  const { covered } = _findCoveredContributorPoints();

  if (covered.length === 0) {
    return res.json({ success: true, removed: 0 });
  }

  _coveredUndoBackup = { timestamp: new Date().toISOString(), username: req.username, points: covered };

  const now = new Date().toISOString();
  for (const p of covered) {
    runSQL(
      `INSERT INTO point_deletions (original_point_id, fid, geometry, layer, status, added_by, added_by_role, added_at, deleted_by, deleted_by_role, deleted_at, grid_cell_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.fid, p.geometry, p.layer, p.status, p.added_by, p.added_by_role, p.added_at, req.username, 'superadmin', now, null]
    );
  }

  const ids = covered.map(d => d.id);
  const placeholders = ids.map(() => '?').join(',');
  runSQL(`DELETE FROM occurrence_points WHERE id IN (${placeholders})`, ids);
  persist();

  logActivity(req.username, 'cleanup_covered_points', null, null, { removed: covered.length }, null, req);

  for (const d of covered) {
    io.emit('point:deleted', { id: d.id });
  }

  res.json({ success: true, removed: covered.length });
});

app.post('/api/admin/points/covered/undo', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.username)) return res.status(403).json({ error: 'Super Admin only' });

  if (!_coveredUndoBackup || !_coveredUndoBackup.points || _coveredUndoBackup.points.length === 0) {
    return res.status(400).json({ error: 'Nenhuma limpeza para desfazer' });
  }

  let restored = 0;
  for (const p of _coveredUndoBackup.points) {
    runSQL(
      'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status, added_by, added_by_role, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [p.fid, p.geometry, p.not_valid || 0, p.layer || 'crowdmapping', p.status || 0, p.added_by, p.added_by_role, p.added_at]
    );
    const row = queryOne('SELECT id FROM occurrence_points WHERE fid = ?', [p.fid]);
    if (row) {
      io.emit('point:created', { id: row.id, fid: p.fid, not_valid: p.not_valid || 0, status: p.status || 0, layer: p.layer || 'crowdmapping', geometry: JSON.parse(p.geometry) });
    }
    restored++;
  }

  persist();
  logActivity(req.username, 'cleanup_covered_undo', null, null, { restored }, null, req);

  const backup = _coveredUndoBackup;
  _coveredUndoBackup = null;
  res.json({ success: true, restored, original_timestamp: backup.timestamp });
});

// ── Occurrence points ──

app.get('/api/points', (req, res) => {
  const points = queryAll('SELECT * FROM occurrence_points');
  const features = points.map(p => ({
    type: 'Feature',
    properties: { id: p.id, fid: p.fid, not_valid: p.status || 0, status: p.status || 0, layer: p.layer || 'crowdmapping', added_by: p.added_by || null, added_by_role: p.added_by_role || null, added_at: p.added_at || null },
    geometry: JSON.parse(p.geometry)
  }));
  res.json({ type: 'FeatureCollection', features });
});

app.post('/api/points', requireAuth, requireVerified, (req, res) => {
  const { lat, lng } = req.body;
  const username = req.username;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat e lng obrigatórios' });
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
    return res.status(400).json({ error: 'lat e lng inválidos' });
  }

  const lockedCell = queryOne('SELECT id, geometry FROM grid_cells WHERE locked_by = ? LIMIT 1', [username]);
  if (lockedCell) {
    try {
      const cellGeom = JSON.parse(lockedCell.geometry);
      if (!isLngLatInsideCellGeometry(cellGeom, nLng, nLat)) {
        return res.status(400).json({ error: 'Ponto fora da célula em edição' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao validar célula' });
    }
  }

  const geometry = { type: 'Point', coordinates: [nLng, nLat] };
  const pointStatus = req.body.status != null ? req.body.status : (req.body.not_valid != null ? (req.body.not_valid ? 1 : 0) : 0);
  const pointLayer = req.body.layer || 'crowdmapping';

  const maxFid = queryOne('SELECT MAX(fid) as maxFid FROM occurrence_points');
  const newFid = (maxFid && maxFid.maxFid != null) ? maxFid.maxFid + 1 : 1;
  const addedByRole = getEffectiveRole(username);
  const addedAt = new Date().toISOString();

  runSQL(
    'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status, added_by, added_by_role, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newFid, JSON.stringify(geometry), pointStatus, pointLayer, pointStatus, username, addedByRole, addedAt]
  );

  const inserted = queryOne('SELECT * FROM occurrence_points WHERE fid = ?', [newFid]);

  const gridCell = findGridForPoint(nLng, nLat);
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
    grid_cell_id: gridCell ? gridCell.id : null,
    added_by: username,
    added_by_role: addedByRole,
    added_at: addedAt
  };

  io.emit('point:created', pointData);
  logActivity(username, 'point_create', gridCell ? gridCell.id : null, String(inserted.id), { fid: newFid, lat, lng, layer: pointLayer }, null, req);
  persist();
  res.json(pointData);
});

app.delete('/api/points/:id', requireAuth, requireVerified, (req, res) => {
  const { id } = req.params;
  const username = req.username;

  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Ponto não encontrado' });

  if (!isTeamOrAbove(username) && point.added_by !== username) {
    return res.status(403).json({ error: 'Você só pode excluir pontos que você mesmo adicionou' });
  }

  const ptGeom = JSON.parse(point.geometry);
  const [ptLng, ptLat] = ptGeom.coordinates;
  const gridCell = findGridForPoint(ptLng, ptLat);
  const deletedByRole = getEffectiveRole(username);

  runSQL(
    `INSERT INTO point_deletions (original_point_id, fid, geometry, layer, status, added_by, added_by_role, added_at, deleted_by, deleted_by_role, deleted_at, grid_cell_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [Number(id), point.fid, point.geometry, point.layer, point.status, point.added_by, point.added_by_role, point.added_at,
     username, deletedByRole, new Date().toISOString(), gridCell ? gridCell.id : null]
  );

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
  logActivity(username, 'point_delete', gridCell ? gridCell.id : null, String(id), { fid: point.fid, layer: point.layer }, null, req);
  persist();
  res.json({ success: true, gridStatusChanged });
});

app.get('/api/admin/point-deletions', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) return res.status(403).json({ error: 'Team+ only' });
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const rows = queryAll('SELECT * FROM point_deletions ORDER BY deleted_at DESC LIMIT ?', [limit]);
  res.json(rows);
});

app.put('/api/points/:id/validity', requireAuth, requireVerified, (req, res) => {
  if (!isTeamOrAbove(req.username)) {
    return res.status(403).json({ error: 'Apenas membros e administradores podem alterar a validade de pontos' });
  }
  const { id } = req.params;
  const point = queryOne('SELECT * FROM occurrence_points WHERE id = ?', [Number(id)]);
  if (!point) return res.status(404).json({ error: 'Ponto não encontrado' });

  const currentStatus = point.status || 0;
  // Validity: 0=valid, 1=invalid, 2=uncertain; single field advances mod 3 (mirrored to not_valid).
  const newStatus = (currentStatus + 1) % 3;
  runSQL('UPDATE occurrence_points SET status = ?, not_valid = ? WHERE id = ?', [newStatus, newStatus, Number(id)]);

  io.emit('point:validityChanged', { id: Number(id), not_valid: newStatus, status: newStatus });
  logActivity(req.username, 'point_status_change', null, String(id), { from: currentStatus, to: newStatus }, null, req);
  persist();
  res.json({ id: Number(id), not_valid: newStatus, status: newStatus });
});

// ── Export ──

app.get('/api/export/geojson', requireAuth, (req, res) => {
  if (!isTeamOrAbove(req.username)) {
    return res.status(403).json({ error: 'Exportação de máscaras disponível a partir do segundo semestre de 2026' });
  }
  const polys = queryAll('SELECT * FROM polygons WHERE deleted_at IS NULL');
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
  logActivity(req.username, 'export_masks', null, null, { count: fc.features.length }, null, req);
  res.setHeader('Content-Disposition', 'attachment; filename="leucena_polygons.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

app.get('/api/export/grid-status', (req, res) => {
  const cells = queryAll('SELECT * FROM grid_cells');
  const stRows = queryAll('SELECT grid_cell_id, state FROM grid_cell_states');
  const stMap = {};
  for (const r of stRows) {
    if (!stMap[r.grid_cell_id]) stMap[r.grid_cell_id] = [];
    stMap[r.grid_cell_id].push(r.state);
  }
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
        states: stMap[c.id] || [],
        updated_at: c.updated_at
      },
      geometry: JSON.parse(c.geometry)
    }))
  };
  const uname = getUsernameFromToken(req);
  if (uname) logActivity(uname, 'export_grid', null, null, { count: fc.features.length }, null, req);
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
  logActivity(req.username, 'export_points', null, null, { count: fc.features.length }, null, req);
  res.setHeader('Content-Disposition', 'attachment; filename="leucena_points.geojson"');
  res.setHeader('Content-Type', 'application/geo+json');
  res.json(fc);
});

// ── Connected users ──

app.get('/api/users', (req, res) => {
  res.json(getUniqueUsers());
});

// ── Socket.IO ──

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const session = sessions.get(token);
    if (session) {
      const uname = typeof session === 'string' ? session : session.username;
      if (typeof session !== 'string' && session.expiresAt && Date.now() > session.expiresAt) {
        return next(new Error('SESSION_EXPIRED'));
      }
      socket.username = uname;
    }
  }
  next();
});

// Build a fake `req`-like object from a socket so we can reuse the same
// device-context extractor as the HTTP routes. Socket.IO exposes the original
// upgrade request at `socket.handshake` (with `headers` and `address`), so we
// don't need a separate parser path.
function _socketReqLike(socket) {
  if (!socket || !socket.handshake) return null;
  return {
    headers: socket.handshake.headers || {},
    ip: socket.handshake.address || null,
    connection: { remoteAddress: socket.handshake.address || null }
  };
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.emit('app:buildId', BUILD_ID);
  socket.emit('users:updated', getUniqueUsers());

  socket.on('user:join', (data) => {
    const joinUsername = socket.username || data.username;
    const dbRow = queryOne('SELECT last_location_state FROM users WHERE username = ?', [joinUsername]);
    connectedUsers.set(socket.id, {
      username: joinUsername,
      editingCell: null,
      locationState: (dbRow && dbRow.last_location_state) || null,
      joinedAt: new Date().toISOString()
    });
    runSQL('UPDATE users SET last_active = ? WHERE username = ?', [new Date().toISOString(), joinUsername]);
    // Logged here — gives us a "session start" event with full UA, which is
    // the canonical "what device did this user join from?" datapoint that the
    // user asked for.
    logActivity(joinUsername, 'session_join', null, null, { socket_id: socket.id }, null, _socketReqLike(socket));
    io.emit('users:updated', getUniqueUsers());
    console.log(`User joined: ${joinUsername}`);
  });

  socket.on('user:editingCell', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.editingCell = data.cellId;
      io.emit('users:updated', getUniqueUsers());
    }
  });

  socket.on('user:activity', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const validActivities = ['drawing_polygon', 'adding_points', 'deleting_points', 'editing', 'idle'];
      user.activity = (data.activity && validActivities.includes(data.activity)) ? data.activity : null;
      io.emit('users:updated', getUniqueUsers());
    }
  });

  socket.on('user:locationState', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user && data.state && typeof data.state === 'string') {
      const cleanState = data.state.replace(/[^a-zA-Z0-9\- ]/g, '').substring(0, 10);
      user.locationState = cleanState;
      runSQL('UPDATE users SET last_location_state = ? WHERE username = ?', [cleanState, user.username]);
      io.emit('users:updated', getUniqueUsers());
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      logActivity(user.username, 'disconnect', null, null, { socket_id: socket.id }, null, _socketReqLike(socket));
      const isLastSocket = !userHasOtherSockets(socket.id, user.username);

      if (isLastSocket) {
      const now = new Date().toISOString();
        const locked = queryAll('SELECT id, geometry, grid_id, fid FROM grid_cells WHERE locked_by = ?', [user.username]);
      for (const cell of locked) {
          const newStatus = determineCellStatusOnUnlock(cell.id, cell.geometry);
        runSQL('UPDATE grid_cells SET locked_by = NULL, locked_at = NULL, grid_status = ?, updated_at = ? WHERE id = ?',
          [newStatus, now, cell.id]);
        io.emit('cell:unlocked', { cellId: cell.id, previousUser: user.username, cellName: cell.grid_id || String(cell.fid) });
        io.emit('cell:statusChanged', { cellId: cell.id, status: newStatus, username: user.username });
        logActivity(user.username, 'cell_unlock_disconnect', cell.id, null, { newStatus }, null, _socketReqLike(socket));
      }
      if (locked.length > 0) persist();
      }

      const sessionMs = Date.now() - new Date(user.joinedAt).getTime();
      if (sessionMs > 0 && sessionMs < 86400000) {
        runSQL('UPDATE users SET total_time_ms = COALESCE(total_time_ms, 0) + ?, last_active = ? WHERE username = ?', [sessionMs, new Date().toISOString(), user.username]);
      }

      connectedUsers.delete(socket.id);
      io.emit('users:updated', getUniqueUsers());
      console.log(`User disconnected: ${user.username}${isLastSocket ? ' (last tab)' : ' (other tabs remain)'}`);
    }
  });
});

// ── Start ──

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  _hydrateSessionsFromDisk();

  // Startup backfill: legacy polygons missing area_ha get polygonAreaHa() before API traffic relies on it.
  const emptyArea = queryAll('SELECT id, geometry FROM polygons WHERE deleted_at IS NULL AND (area_ha IS NULL OR area_ha = 0)');
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

  // Backfill welcome inbox messages for existing users who don't have one yet
  const usersWithoutWelcome = queryAll(
    `SELECT username FROM users
     WHERE is_active = 1 AND username != 'deleted'
     AND username NOT IN (SELECT target FROM messages WHERE subject LIKE '%Bem-vindo%leucaena%')`
  );
  if (usersWithoutWelcome.length > 0) {
    for (const u of usersWithoutWelcome) {
      sendWelcomeInboxMessage(u.username);
    }
    persist();
    console.log(`  Backfilled welcome inbox messages for ${usersWithoutWelcome.length} users`);
  }

  purgeExpiredUnverifiedUsers();
  setInterval(purgeExpiredUnverifiedUsers, 24 * 60 * 60 * 1000);

  // Email batch queue: drain on boot, then every EMAIL_QUEUE_TICK_MS so a long
  // overnight gap between sends always picks up the new day's budget quickly.
  drainMessageQueueDueToday().catch(err => console.error('initial queue drain error:', err));
  setInterval(() => {
    drainMessageQueueDueToday().catch(err => console.error('queue drain error:', err));
  }, EMAIL_QUEUE_TICK_MS);

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
