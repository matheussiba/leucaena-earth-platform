const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_PATH || path.join(__dirname, 'data');
const DB_PATH = path.join(dataDir, 'leucena.db');
const BUNDLED_DB = path.join(__dirname, 'data', 'leucena.db');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();

  fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else if (process.env.DATA_PATH && fs.existsSync(BUNDLED_DB)) {
    console.log('Persistent disk empty — copying bundled DB to', DB_PATH);
    const buffer = fs.readFileSync(BUNDLED_DB);
    fs.writeFileSync(DB_PATH, buffer);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS grid_cells (
      id INTEGER PRIMARY KEY,
      fid INTEGER,
      grid_id TEXT,
      geometry TEXT NOT NULL,
      grid_status TEXT NOT NULL DEFAULT 'not_yet_finished',
      numpoints INTEGER DEFAULT 0,
      locked_by TEXT,
      locked_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS polygons (
      id TEXT PRIMARY KEY,
      grid_cell_id INTEGER,
      geometry TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (grid_cell_id) REFERENCES grid_cells(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS occurrence_points (
      id INTEGER PRIMARY KEY,
      fid INTEGER,
      geometry TEXT NOT NULL,
      not_valid INTEGER DEFAULT 0,
      layer TEXT DEFAULT 'crowdmapping',
      status INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS site_stats (
      key TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      username TEXT,
      action TEXT NOT NULL,
      cell_id INTEGER,
      object_id TEXT,
      details TEXT
    )
  `);

  const viewRow = db.exec("SELECT value FROM site_stats WHERE key = 'view_count'");
  if (viewRow.length === 0 || viewRow[0].values.length === 0) {
    db.run("INSERT OR IGNORE INTO site_stats (key, value) VALUES ('view_count', 0)");
  }

  try { db.run('ALTER TABLE grid_cells ADD COLUMN worked_by TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE grid_cells ADD COLUMN finished_by TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE grid_cells ADD COLUMN grid_id TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE grid_cells ADD COLUMN numpoints INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE occurrence_points ADD COLUMN layer TEXT DEFAULT \'crowdmapping\''); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE occurrence_points ADD COLUMN status INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN description TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN photo TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN total_time_ms INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN linkedin TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN scholar TEXT'); } catch (e) { /* already exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'contributor'"); } catch (e) { /* already exists */ }

  try { db.run("UPDATE users SET role = 'admin' WHERE username IN ('msb', 'mpf') AND (role IS NULL OR role = 'contributor')"); } catch (e) {}
  try { db.run("UPDATE users SET role = 'team' WHERE username IN ('rafael.perin', 'judith.alves') AND (role IS NULL OR role = 'contributor')"); } catch (e) {}

  const socialLinks = [
    { username: 'msb', linkedin: 'https://www.linkedin.com/in/msbarrosgis/', scholar: 'https://scholar.google.com/citations?user=YxpVjt0AAAAJ&hl=en' },
    { username: 'mpf', linkedin: 'https://www.linkedin.com/in/matheus-pinheiro-ferreira-02a04123/', scholar: 'https://scholar.google.com/citations?user=Ype1B9wAAAAJ&hl=pt-BR' },
    { username: 'rafael.perin', linkedin: 'https://www.linkedin.com/in/rafael-perin-menassi-7b591139a/', scholar: null }
  ];
  for (const s of socialLinks) {
    try {
      const row = db.exec(`SELECT linkedin FROM users WHERE username = '${s.username}'`);
      if (row.length && (!row[0].values[0][0])) {
        db.run('UPDATE users SET linkedin = ?, scholar = ? WHERE username = ?', [s.linkedin, s.scholar, s.username]);
      }
    } catch (e) { /* ignore */ }
  }

  // Migrate not_valid → status for existing rows that haven't been migrated
  try {
    db.run('UPDATE occurrence_points SET status = not_valid WHERE status IS NULL OR (status = 0 AND not_valid = 1)');
  } catch (e) { /* ignore */ }

  const crypto = require('crypto');
  function seedHash(pw) { return crypto.createHash('sha256').update(pw + '***REDACTED_SALT***').digest('hex'); }

  const adminUsers = [
    { username: 'msb', password: '***REDACTED***' },
    { username: 'mpf', password: '***REDACTED***' }
  ];
  for (const u of adminUsers) {
    const exists = db.exec(`SELECT id FROM users WHERE username = '${u.username}'`);
    if (exists.length === 0 || exists[0].values.length === 0) {
      const hash = seedHash(u.password);
      const now = new Date().toISOString();
      db.run('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)', [u.username, hash, now]);
    }
  }

  const delExists = db.exec("SELECT id FROM users WHERE username = 'deleted'");
  if (delExists.length === 0 || delExists[0].values.length === 0) {
    const now = new Date().toISOString();
    db.run("INSERT INTO users (username, password_hash, created_at) VALUES ('deleted', 'nologin', ?)", [now]);
  }

  persist();
  return db;
}

function persist() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSQL(sql, params = []) {
  db.run(sql, params);
  persist();
}

module.exports = { initDB, getDB, persist, queryAll, queryOne, runSQL, DB_PATH };
