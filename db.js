const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_PATH || path.join(__dirname, 'data');
const DB_PATH = path.join(dataDir, 'leucaena-earth.db');
const OLD_DB_PATH = path.join(dataDir, 'leucena.db');

let db = null;

async function initDB() {
  const SQL = await initSqlJs();

  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(DB_PATH) && fs.existsSync(OLD_DB_PATH)) {
    console.log('Migrating database: leucena.db → leucaena-earth.db');
    fs.renameSync(OLD_DB_PATH, DB_PATH);
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
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
  try { db.run('ALTER TABLE grid_cells ADD COLUMN state TEXT'); } catch (e) { /* already exists */ }
  try {
    db.run("UPDATE grid_cells SET state = 'SP' WHERE state IS NULL OR TRIM(COALESCE(state, '')) = ''");
  } catch (e) { /* ignore */ }

  db.run(`CREATE TABLE IF NOT EXISTS grid_cell_states (
    grid_cell_id INTEGER NOT NULL,
    state TEXT NOT NULL,
    PRIMARY KEY (grid_cell_id, state),
    FOREIGN KEY (grid_cell_id) REFERENCES grid_cells(id)
  )`);
  try { db.run('CREATE INDEX IF NOT EXISTS idx_gcs_state ON grid_cell_states(state)'); } catch (e) { /* ignore */ }
  // Migrate legacy state column into junction table (one-time backfill)
  try {
    db.run(`INSERT OR IGNORE INTO grid_cell_states (grid_cell_id, state)
            SELECT id, state FROM grid_cells
            WHERE state IS NOT NULL AND TRIM(state) != ''`);
  } catch (e) { /* ignore */ }
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
  try { db.run('ALTER TABLE polygons ADD COLUMN area_ha REAL DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN tester_mode TEXT DEFAULT 'contributor'"); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN is_founder INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN email TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN last_active TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN google_id TEXT'); } catch (e) { /* already exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'"); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN verification_token TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN verification_expires TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN reset_token_expires TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN occupation TEXT'); } catch (e) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT 'all',
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_reads (
      message_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      read_at TEXT NOT NULL,
      PRIMARY KEY (message_id, username),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `);

  try { db.run('ALTER TABLE messages ADD COLUMN reply_to INTEGER'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE messages ADD COLUMN allow_reply INTEGER DEFAULT 1'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE messages ADD COLUMN images TEXT'); } catch (e) { /* already exists */ }

  // One-time: mark pre-existing local users as email_verified so they aren't locked out
  try {
    db.run("UPDATE users SET email_verified = 1 WHERE email_verified = 0 AND verification_token IS NULL AND (auth_provider IS NULL OR auth_provider = 'local')");
  } catch (e) { /* ignore */ }

  // Migrate not_valid → status for existing rows that haven't been migrated
  try {
    db.run('UPDATE occurrence_points SET status = not_valid WHERE status IS NULL OR (status = 0 AND not_valid = 1)');
  } catch (e) { /* ignore */ }

  // Ensure the placeholder "deleted" user exists (masks are transferred here on permanent user deletion)
  const delExists = db.exec("SELECT id FROM users WHERE username = 'deleted'");
  if (delExists.length === 0 || delExists[0].values.length === 0) {
    const now = new Date().toISOString();
    db.run("INSERT INTO users (username, password_hash, created_at, is_active) VALUES ('deleted', 'nologin', ?, 0)", [now]);
  } else {
    db.run("UPDATE users SET is_active = 0 WHERE username = 'deleted'");
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
