/**
 * SibaInvest at /invest. Same camouflage as /cmq: not linked from the public
 * site, X-Robots-Tag + meta robots noindex, optional Basic Auth (INVEST_PASSWORD).
 * Static files live in deleteme_invest/. Market cache is written under
 * {DATA_PATH}/invest when DATA_PATH is set.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const INVEST_DIR = path.join(__dirname, 'deleteme_invest');
const SEED_DATA_DIR = path.join(INVEST_DIR, 'data');
const CACHE_TTL = 4 * 60 * 60 * 1000;
const SI_TTL = 6 * 60 * 60 * 1000;
const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_MAX = 20;

const memCache = {
  acoes: { data: null, ts: 0 },
  fiis: { data: null, ts: 0 },
};
const siCache = { acao: new Map(), fii: new Map() };
const aiBuckets = new Map();

function investDataDir() {
  const raw = process.env.INVEST_DATA_DIR || process.env.DATA_PATH || '';
  if (!raw) return SEED_DATA_DIR;
  const base = path.resolve(raw);
  return path.basename(base).toLowerCase() === 'invest' ? base : path.join(base, 'invest');
}

function loadFileCache(key) {
  const file = path.join(investDataDir(), `cache-${key}.json`);
  const seed = path.join(SEED_DATA_DIR, `cache-${key}.json`);
  try {
    if (!fs.existsSync(file) && file !== seed && fs.existsSync(seed)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(seed, file);
    }
    const parsed = JSON.parse(fs.readFileSync(fs.existsSync(file) ? file : seed, 'utf8'));
    if (parsed && parsed.data && parsed.data.length && parsed.ts) {
      memCache[key] = parsed;
    }
  } catch (_) { /* seed is optional */ }
}

function saveFileCache(key) {
  try {
    const dir = investDataDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `cache-${key}.json`), JSON.stringify(memCache[key]));
  } catch (e) {
    console.warn(`[invest] falha ao salvar cache ${key}:`, e.message);
  }
}

loadFileCache('acoes');
loadFileCache('fiis');

function parseBRNum(str) {
  if (!str || str === '-' || String(str).trim() === '') return null;
  const text = String(str);
  const isPct = text.includes('%');
  const n = parseFloat(text.replace('%', '').replace(/\./g, '').replace(',', '.').trim());
  if (!Number.isFinite(n)) return null;
  return isPct ? n / 100 : n;
}

function fetchHtml(url, encoding = 'latin1') {
  return new Promise((resolve, reject) => {
    let referer = '';
    try { referer = new URL(url).origin + '/'; } catch (_) { /* ignore */ }
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        ...(referer ? { Referer: referer } : {}),
      },
    };
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHtml(res.headers.location, encoding).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)));
    }).on('error', reject);
  });
}

function parseHtmlTable(html, tableId = 'resultado') {
  const re = new RegExp(`id="${tableId}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i');
  const tableMatch = html.match(re);
  if (!tableMatch) return null;
  const tableHtml = tableMatch[1];
  const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (!theadMatch) return null;
  const headers = [];
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let m;
  while ((m = thRe.exec(theadMatch[1])) !== null) {
    headers.push(m[1].replace(/<[^>]+>/g, '').trim());
  }
  if (headers.length === 0) return null;
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return [];
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  while ((m = trRe.exec(tbodyMatch[1])) !== null) {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(m[1])) !== null) {
      cells.push(td[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length === 0) continue;
    const row = {};
    headers.forEach((h, i) => {
      const raw = cells[i] ?? '';
      const num = parseBRNum(raw);
      row[h] = num !== null ? num : raw;
    });
    rows.push(row);
  }
  return rows;
}

async function scrapeFundamentusAcoes() {
  const html = await fetchHtml('https://www.fundamentus.com.br/resultado.php');
  const data = parseHtmlTable(html);
  if (!data || data.length === 0) throw new Error('Tabela de ações não encontrada no HTML');
  return data;
}

async function scrapeFundamentusFiis() {
  const html = await fetchHtml('https://www.fundamentus.com.br/fii_resultado.php');
  const data = parseHtmlTable(html, 'tabelaResultado');
  if (!data || data.length === 0) throw new Error('Tabela de FIIs não encontrada no HTML');
  return data;
}

async function getWithCache(key, scraper, force) {
  const now = Date.now();
  if (!force && memCache[key].data && now - memCache[key].ts < CACHE_TTL) return memCache[key].data;
  try {
    const data = await scraper();
    memCache[key] = { data, ts: now };
    saveFileCache(key);
    return data;
  } catch (err) {
    if (memCache[key].data) return memCache[key].data;
    throw err;
  }
}

setTimeout(() => {
  getWithCache('acoes', scrapeFundamentusAcoes).catch(() => {});
  getWithCache('fiis', scrapeFundamentusFiis).catch(() => {});
}, 2000);

function siExtract(html, label) {
  const low = html.toLowerCase();
  const lab = label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = low.match(new RegExp(`>\\s*${lab}\\s*</`));
  if (!m) return null;
  const sub = html.slice(m.index, m.index + 700);
  const sm = sub.match(/<strong[^>]*class="value[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
  return sm ? sm[1].replace(/<[^>]+>/g, '').trim() : null;
}

function siNum(s) {
  if (!s) return null;
  return parseBRNum(s.replace(/[^\d.,%-]/g, ''));
}

function siValorAbs(s) {
  if (!s) return null;
  const t = s.trim();
  const mult = /M$/.test(t) ? 1e6 : /B$/.test(t) ? 1e9 : /K$/.test(t) ? 1e3 : 1;
  const n = parseBRNum(t.replace(/[^\d.,-]/g, ''));
  return n === null ? null : n * mult;
}

function siGridLatest(grid, labelIncludes) {
  for (const r of grid || []) {
    const cols = r.columns || [];
    const label = cols[0] && cols[0].value;
    if (label && label.includes(labelIncludes)) {
      const datas = cols.filter((c) => c.name === 'DATA').map((c) => c.value);
      return datas.length ? datas[0] : null;
    }
  }
  return null;
}

function fetchSiJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: 'https://statusinvest.com.br/',
      },
    };
    https.get(url, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchFclPorAcao(ticker, lpa) {
  if (!Number.isFinite(lpa) || lpa <= 0) return null;
  try {
    const t = ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = `https://statusinvest.com.br/acao/getfluxocaixa?code=${t}&category=1&range.min=2008&range.max=2025&type=0`;
    const j = await fetchSiJson(url);
    const grid = j && j.data && j.data.grid;
    const fclTotal = siValorAbs(siGridLatest(grid, 'Fluxo de Caixa Livre'));
    const lucroTotal = siValorAbs(siGridLatest(grid, 'Lucro Líquido'));
    if (fclTotal && lucroTotal) return (fclTotal * lpa) / lucroTotal;
  } catch (_) { /* best-effort */ }
  return null;
}

async function scrapeStatusInvestAcao(ticker) {
  const t = ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
  const html = await fetchHtml(`https://statusinvest.com.br/acoes/${t}`, 'utf8');
  const get = (lab) => siNum(siExtract(html, lab));
  const out = {
    cotacao: get('Valor atual'),
    dy: get('D.Y'),
    pl: get('P/L'),
    pvp: get('P/VP'),
    lpa: get('LPA'),
    vpa: get('VPA'),
    roe: get('ROE'),
    roic: get('ROIC'),
    evEbitda: get('EV/EBITDA'),
    cagrLucros5: get('CAGR Lucros 5 anos'),
    cagrReceitas5: get('CAGR Receitas 5 anos'),
  };
  if (Object.values(out).every((v) => v === null)) {
    throw new Error('Ação não encontrada no StatusInvest');
  }
  out.fclPorAcao = await fetchFclPorAcao(ticker, out.lpa);
  return out;
}

async function scrapeStatusInvestFii(ticker) {
  const t = ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
  const html = await fetchHtml(`https://statusinvest.com.br/fundos-imobiliarios/${t}`, 'utf8');
  const get = (lab) => siNum(siExtract(html, lab));
  const out = {
    cotacao: get('Valor atual'),
    pvp: get('P/VP'),
    dy: get('Dividend Yield'),
    ultimoRendimento: get('Último rendimento'),
  };
  if (out.cotacao === null && out.ultimoRendimento === null) {
    throw new Error('FII não encontrado no StatusInvest');
  }
  return out;
}

async function getStatusInvest(kind, ticker) {
  const key = ticker.toUpperCase();
  const cache = siCache[kind];
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < SI_TTL) return hit.data;
  const data = kind === 'fii' ? await scrapeStatusInvestFii(key) : await scrapeStatusInvestAcao(key);
  cache.set(key, { data, ts: Date.now() });
  return data;
}

function callAI(messages) {
  const AI_API_KEY = process.env.AI_API_KEY || '';
  const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';
  return new Promise((resolve, reject) => {
    if (!AI_API_KEY) return reject(new Error('AI_API_KEY não configurada'));
    const body = JSON.stringify({ model: AI_MODEL, messages, max_tokens: 1500 });
    const endpoint = new URL('/chat/completions', AI_BASE_URL);
    const opts = {
      method: 'POST',
      hostname: endpoint.hostname,
      path: endpoint.pathname,
      port: endpoint.port || 443,
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const indicatorFallback = {
  ipcaTwentyYearAverage: 0.0552,
  ipcaLastTwelveMonths: 0.0439,
  cdiAnnual: 0.1415,
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

function parseBcbValue(value) {
  return Number(String(value).replace(',', '.')) / 100;
}

async function getIndicators() {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 21);
  const fmt = (d) =>
    `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  const [ipcaSeries, cdiSeries] = await Promise.all([
    fetchJson(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`),
    fetchJson(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`),
  ]);
  const ipcaRates = ipcaSeries.map((i) => parseBcbValue(i.valor)).filter(Number.isFinite);
  const cdiRates = cdiSeries.map((i) => parseBcbValue(i.valor)).filter(Number.isFinite);
  const last12Ipca = ipcaRates.slice(-12).reduce((f, r) => f * (1 + r), 1) - 1;
  const last240 = ipcaRates.slice(-240);
  const ipcaTwentyYearAverage = Math.pow(last240.reduce((f, r) => f * (1 + r), 1), 12 / Math.max(last240.length, 1)) - 1;
  const last252Cdi = cdiRates.slice(-252);
  const cdiAnnual = last252Cdi.reduce((f, r) => f * (1 + r), 1) - 1;
  return {
    ipcaTwentyYearAverage: Number.isFinite(ipcaTwentyYearAverage) ? ipcaTwentyYearAverage : indicatorFallback.ipcaTwentyYearAverage,
    ipcaLastTwelveMonths: Number.isFinite(last12Ipca) ? last12Ipca : indicatorFallback.ipcaLastTwelveMonths,
    cdiAnnual: Number.isFinite(cdiAnnual) ? cdiAnnual : indicatorFallback.cdiAnnual,
  };
}

function investGuard(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Cache-Control', 'no-store');
  const password = process.env.INVEST_PASSWORD || '';
  if (!password) return next();
  const hdr = req.headers.authorization || '';
  if (hdr.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(hdr.slice(6), 'base64').toString('utf8');
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      if (pass === password) return next();
    } catch (_) { /* ignore */ }
  }
  res.set('WWW-Authenticate', 'Basic realm="Invest", charset="UTF-8"');
  return res.status(401).send('Authentication required.');
}

function aiRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const hits = (aiBuckets.get(ip) || []).filter((t) => t > now - AI_WINDOW_MS);
  if (hits.length >= AI_MAX) {
    return res.status(429).json({ ok: false, error: 'Muitas consultas de IA. Tente de novo em alguns minutos.' });
  }
  hits.push(now);
  aiBuckets.set(ip, hits);
  next();
}

function insideInvest(filePath) {
  const root = path.resolve(INVEST_DIR);
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
}

// req.path keeps a leading slash. path.join on Linux treats that as absolute
// and drops INVEST_DIR, so resolve the relative pieces explicitly.
function safeInvestFile(rel) {
  const cleaned = String(rel || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('\0')) return null;
  if (cleaned === 'data' || cleaned.startsWith('data/')) return null;
  const parts = cleaned.split('/');
  if (parts.some((p) => !p || p === '..')) return null;
  const filePath = path.resolve(INVEST_DIR, ...parts);
  if (!insideInvest(filePath)) return null;
  return filePath;
}

function sendInvestHtml(res, filePath) {
  if (!insideInvest(filePath) || !fs.existsSync(filePath)) {
    return res.status(404).type('text').send('Página não encontrada');
  }
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('name="robots"')) {
    html = html.replace(
      '<head>',
      '<head>\n    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />\n    <meta name="referrer" content="no-referrer" />'
    );
  }
  res.set('Cache-Control', 'no-store');
  return res.type('html').send(html);
}

function registerInvest(app) {
  app.use('/invest', investGuard);

  app.get('/invest/api/indicators', (_req, res) => {
    getIndicators()
      .catch(() => indicatorFallback)
      .then((indicators) => {
        res.set('Cache-Control', 'private, max-age=3600');
        res.json(indicators);
      });
  });

  app.get('/invest/api/fundamentus/acoes', async (req, res) => {
    try {
      const data = await getWithCache('acoes', scrapeFundamentusAcoes, req.query.refresh === '1');
      const age = Math.round((Date.now() - memCache.acoes.ts) / 60000);
      res.json({ ok: true, count: data.length, cacheAgeMinutes: age, data });
    } catch (e) {
      res.status(503).json({ ok: false, error: e.message });
    }
  });

  app.get('/invest/api/fundamentus/fiis', async (req, res) => {
    try {
      const data = await getWithCache('fiis', scrapeFundamentusFiis, req.query.refresh === '1');
      const age = Math.round((Date.now() - memCache.fiis.ts) / 60000);
      res.json({ ok: true, count: data.length, cacheAgeMinutes: age, data });
    } catch (e) {
      res.status(503).json({ ok: false, error: e.message });
    }
  });

  app.get('/invest/api/statusinvest/acao', async (req, res) => {
    const ticker = String(req.query.ticker || '').trim();
    if (!ticker) return res.status(400).json({ ok: false, error: 'ticker obrigatório' });
    try {
      const data = await getStatusInvest('acao', ticker);
      res.json({ ok: true, ticker: ticker.toUpperCase(), data });
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  app.get('/invest/api/statusinvest/fii', async (req, res) => {
    const ticker = String(req.query.ticker || '').trim();
    if (!ticker) return res.status(400).json({ ok: false, error: 'ticker obrigatório' });
    try {
      const data = await getStatusInvest('fii', ticker);
      res.json({ ok: true, ticker: ticker.toUpperCase(), data });
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  app.post('/invest/api/ai/chat', aiRateLimit, async (req, res) => {
    try {
      const body = req.body || {};
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return res.status(400).json({ ok: false, error: 'messages array obrigatório' });
      }
      const result = await callAI(body.messages);
      if (result.error) {
        return res.status(502).json({ ok: false, error: result.error.message || 'Erro da API de IA' });
      }
      const text = (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) || '';
      res.json({ ok: true, text });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get(['/invest', '/invest/'], (req, res) => {
    if (req.path === '/invest') {
      const q = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(302, '/invest/' + q);
    }
    return sendInvestHtml(res, path.join(INVEST_DIR, 'index.html'));
  });

  app.use('/invest', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return res.status(404).json({ ok: false, error: 'Não encontrado' });
    const rel = req.path || '/';
    if (rel === '/' || rel === '') return sendInvestHtml(res, path.join(INVEST_DIR, 'index.html'));
    const filePath = safeInvestFile(rel);
    if (!filePath) return res.status(404).end();
    let stat = null;
    try { stat = fs.statSync(filePath); } catch (_) { stat = null; }
    if (!stat) return res.status(404).end();
    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      if (fs.existsSync(index)) return sendInvestHtml(res, index);
      return res.status(404).end();
    }
    if (filePath.toLowerCase().endsWith('.html')) return sendInvestHtml(res, filePath);
    next();
  }, require('express').static(INVEST_DIR, { dotfiles: 'deny', index: false }));
}

module.exports = { registerInvest };
