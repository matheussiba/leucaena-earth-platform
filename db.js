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
  try { db.run('ALTER TABLE occurrence_points ADD COLUMN added_by TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE occurrence_points ADD COLUMN added_by_role TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE occurrence_points ADD COLUMN added_at TEXT'); } catch (e) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS point_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_point_id INTEGER,
      fid INTEGER,
      geometry TEXT,
      layer TEXT,
      status INTEGER,
      added_by TEXT,
      added_by_role TEXT,
      added_at TEXT,
      deleted_by TEXT,
      deleted_by_role TEXT,
      deleted_at TEXT NOT NULL,
      grid_cell_id INTEGER
    )
  `);
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
  try { db.run('ALTER TABLE users ADD COLUMN referral_source TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN referral_detail TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN last_location_state TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE users ADD COLUMN last_edited_state TEXT'); } catch (e) { /* already exists */ }

  try { db.run('ALTER TABLE activity_logs ADD COLUMN role TEXT'); } catch (e) { /* already exists */ }
  // Device telemetry per logged event so we can debug "this user could not
  // do X" reports without asking them what device/OS they were on. Stored as
  // small string columns so they're cheap to index/filter on. ip is stored
  // truncated (last octet zeroed) for very rough geo without keeping
  // identifiable data.
  try { db.run('ALTER TABLE activity_logs ADD COLUMN device_type TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE activity_logs ADD COLUMN os TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE activity_logs ADD COLUMN browser TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE activity_logs ADD COLUMN user_agent TEXT'); } catch (e) { /* already exists */ }
  try { db.run('ALTER TABLE activity_logs ADD COLUMN ip TEXT'); } catch (e) { /* already exists */ }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_activity_logs_username_ts ON activity_logs(username, timestamp DESC)'); } catch (e) { /* ignore */ }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)'); } catch (e) { /* ignore */ }

  // Sessions: persisted so users stay logged in across server redeploys.
  // The in-memory Map in server.js stays as the hot cache; this table is the source of truth on boot.
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);
  try { db.run('CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username)'); } catch (e) { /* ignore */ }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)'); } catch (e) { /* ignore */ }

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

  // ── Message email queue ──
  // Resend (and similar providers) cap us at ~100 emails/day on the free tier.
  // When an admin batch-sends to >100 collaborators we cannot just blast them
  // all in one shot, so each recipient becomes a row here, scheduled across
  // multiple days and processed in order of `priority` (mask_count) within
  // each day. The actual `messages` row is created once per batch — this
  // table only tracks per-recipient *email delivery*.
  db.run(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      recipient_username TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_full_name TEXT,
      scheduled_for TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `);
  try { db.run('CREATE INDEX IF NOT EXISTS idx_msgq_status_due ON message_queue(status, scheduled_for)'); } catch (e) { /* ignore */ }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_msgq_message ON message_queue(message_id)'); } catch (e) { /* ignore */ }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_msgq_priority ON message_queue(scheduled_for, priority DESC)'); } catch (e) { /* ignore */ }

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

  // Migration: remove 42 sea tiles (no_points) that fall outside land in SP
  try {
    const seaTiles = ['754','782','783','810','811','812','838','839','840','867','868','895','896','897','923','924','925','953','980','981','982','1010','1011','1037','1038','1039','1067','1068','1096','1124','1125','1153','1154','1181','1182','1209','1210','1211','1237','1238','1239','1267'];
    const ph = seaTiles.map(() => '?').join(',');
    const hits = db.exec(`SELECT id FROM grid_cells WHERE grid_id IN (${ph})`, seaTiles);
    if (hits.length > 0 && hits[0].values.length > 0) {
      const ids = hits[0].values.map(r => r[0]);
      const idPh = ids.map(() => '?').join(',');
      db.run(`DELETE FROM grid_cell_states WHERE grid_cell_id IN (${idPh})`, ids);
      db.run(`DELETE FROM grid_cells WHERE id IN (${idPh})`, ids);
      console.log(`Migration: removed ${ids.length} sea tiles from grid_cells`);
    }
  } catch (e) { console.error('Sea-tile migration error:', e.message); }

  // Migration: rename grid_ids from numeric to hierarchical (idempotent)
  try {
    const gridIdMap = {
      "14":"KV-318-1","15":"KV-318-3","42":"KU-318-4","43":"KV-318-2","44":"KV-318-4",
      "71":"KU-319-3","72":"KV-319-1","73":"KV-319-3","98":"KT-319-4","99":"KU-319-2",
      "100":"KU-319-4","101":"KV-319-2","102":"KV-319-4","126":"KT-320-1","127":"KT-320-3",
      "128":"KU-320-1","129":"KU-320-3","130":"KV-320-1","131":"KV-320-3","154":"KS-320-4",
      "155":"KT-320-2","156":"KT-320-4","157":"KU-320-2","158":"KU-320-4","159":"KV-320-2",
      "160":"KV-320-4","180":"KR-321-1","181":"KR-321-3","182":"KS-321-1","183":"KS-321-3",
      "184":"KT-321-1","185":"KT-321-3","186":"KU-321-1","187":"KU-321-3","188":"KV-321-1",
      "189":"KV-321-3","207":"KQ-321-2","208":"KQ-321-4","209":"KR-321-2","210":"KR-321-4",
      "211":"KS-321-2","212":"KS-321-4","213":"KT-321-2","214":"KT-321-4","215":"KU-321-2",
      "216":"KU-321-4","217":"KV-321-2","218":"KV-321-4","235":"KP-322-3","237":"KQ-322-3",
      "238":"KR-322-1","239":"KR-322-3","240":"KS-322-1","241":"KS-322-3","242":"KT-322-1",
      "243":"KT-322-3","244":"KU-322-1","245":"KU-322-3","246":"KV-322-1","247":"KV-322-3",
      "264":"KP-322-4","265":"KQ-322-2","266":"KQ-322-4","267":"KR-322-2","268":"KR-322-4",
      "269":"KS-322-2","270":"KS-322-4","271":"KT-322-2","272":"KT-322-4","273":"KU-322-2",
      "274":"KU-322-4","275":"KV-322-2","276":"KV-322-4","292":"KP-323-1","293":"KP-323-3",
      "294":"KQ-323-1","295":"KQ-323-3","296":"KR-323-1","297":"KR-323-3","298":"KS-323-1",
      "299":"KS-323-3","300":"KT-323-1","301":"KT-323-3","302":"KU-323-1","303":"KU-323-3",
      "304":"KV-323-1","305":"KV-323-3","306":"KW-323-1","320":"KO-323-4","321":"KP-323-2",
      "322":"KP-323-4","323":"KQ-323-2","324":"KQ-323-4","325":"KR-323-2","326":"KR-323-4",
      "327":"KS-323-2","328":"KS-323-4","329":"KT-323-2","330":"KT-323-4","331":"KU-323-2",
      "332":"KU-323-4","333":"KV-323-2","334":"KV-323-4","335":"KW-323-2","349":"KO-324-3",
      "350":"KP-324-1","351":"KP-324-3","352":"KQ-324-1","353":"KQ-324-3","354":"KR-324-1",
      "355":"KR-324-3","356":"KS-324-1","357":"KS-324-3","358":"KT-324-1","359":"KT-324-3",
      "360":"KU-324-1","361":"KU-324-3","362":"KV-324-1","363":"KV-324-3","364":"KW-324-1",
      "378":"KO-324-4","379":"KP-324-2","380":"KP-324-4","381":"KQ-324-2","382":"KQ-324-4",
      "383":"KR-324-2","384":"KR-324-4","385":"KS-324-2","386":"KS-324-4","387":"KT-324-2",
      "388":"KT-324-4","389":"KU-324-2","390":"KU-324-4","391":"KV-324-2","392":"KV-324-4",
      "393":"KW-324-2","407":"KO-325-3","408":"KP-325-1","409":"KP-325-3","410":"KQ-325-1",
      "411":"KQ-325-3","412":"KR-325-1","413":"KR-325-3","414":"KS-325-1","415":"KS-325-3",
      "416":"KT-325-1","417":"KT-325-3","418":"KU-325-1","419":"KU-325-3","420":"KV-325-1",
      "421":"KV-325-3","422":"KW-325-1","436":"KO-325-4","437":"KP-325-2","438":"KP-325-4",
      "439":"KQ-325-2","440":"KQ-325-4","441":"KR-325-2","442":"KR-325-4","443":"KS-325-2",
      "444":"KS-325-4","445":"KT-325-2","446":"KT-325-4","447":"KU-325-2","448":"KU-325-4",
      "449":"KV-325-2","450":"KV-325-4","451":"KW-325-2","452":"KW-325-4","465":"KO-326-3",
      "466":"KP-326-1","467":"KP-326-3","468":"KQ-326-1","469":"KQ-326-3","470":"KR-326-1",
      "471":"KR-326-3","472":"KS-326-1","473":"KS-326-3","474":"KT-326-1","475":"KT-326-3",
      "476":"KU-326-1","477":"KU-326-3","478":"KV-326-1","479":"KV-326-3","480":"KW-326-1",
      "481":"KW-326-3","494":"KO-326-4","495":"KP-326-2","496":"KP-326-4","497":"KQ-326-2",
      "498":"KQ-326-4","499":"KR-326-2","500":"KR-326-4","501":"KS-326-2","502":"KS-326-4",
      "503":"KT-326-2","504":"KT-326-4","505":"KU-326-2","506":"KU-326-4","507":"KV-326-2",
      "508":"KV-326-4","509":"KW-326-2","510":"KW-326-4","511":"KX-326-2","512":"KX-326-4",
      "513":"KY-326-2","514":"KY-326-4","523":"KO-327-3","524":"KP-327-1","525":"KP-327-3",
      "526":"KQ-327-1","527":"KQ-327-3","528":"KR-327-1","529":"KR-327-3","530":"KS-327-1",
      "531":"KS-327-3","532":"KT-327-1","533":"KT-327-3","534":"KU-327-1","535":"KU-327-3",
      "536":"KV-327-1","537":"KV-327-3","538":"KW-327-1","539":"KW-327-3","540":"KX-327-1",
      "541":"KX-327-3","542":"KY-327-1","543":"KY-327-3","544":"KZ-327-1","545":"KZ-327-3",
      "546":"LA-327-1","547":"LA-327-3","552":"KO-327-4","553":"KP-327-2","554":"KP-327-4",
      "555":"KQ-327-2","556":"KQ-327-4","557":"KR-327-2","558":"KR-327-4","559":"KS-327-2",
      "560":"KS-327-4","561":"KT-327-2","562":"KT-327-4","563":"KU-327-2","564":"KU-327-4",
      "565":"KV-327-2","566":"KV-327-4","567":"KW-327-2","568":"KW-327-4","569":"KX-327-2",
      "570":"KX-327-4","571":"KY-327-2","572":"KY-327-4","573":"KZ-327-2","574":"KZ-327-4",
      "575":"LA-327-2","576":"LA-327-4","582":"KP-328-1","583":"KP-328-3","584":"KQ-328-1",
      "585":"KQ-328-3","586":"KR-328-1","587":"KR-328-3","588":"KS-328-1","589":"KS-328-3",
      "590":"KT-328-1","591":"KT-328-3","592":"KU-328-1","594":"KV-328-1","595":"KV-328-3",
      "596":"KW-328-1","597":"KW-328-3","598":"KX-328-1","599":"KX-328-3","600":"KY-328-1",
      "601":"KY-328-3","602":"KZ-328-1","603":"KZ-328-3","604":"LA-328-1","605":"LA-328-3",
      "611":"KP-328-2","612":"KP-328-4","613":"KQ-328-2","614":"KQ-328-4","615":"KR-328-2",
      "616":"KR-328-4","617":"KS-328-2","618":"KS-328-4","619":"KT-328-2","620":"KT-328-4",
      "621":"KU-328-2","622":"KU-328-4","623":"KV-328-2","624":"KV-328-4","625":"KW-328-2",
      "626":"KW-328-4","627":"KX-328-2","628":"KX-328-4","629":"KY-328-2","631":"KZ-328-2",
      "632":"KZ-328-4","633":"LA-328-2","634":"LA-328-4","640":"KP-329-1","641":"KP-329-3",
      "642":"KQ-329-1","643":"KQ-329-3","644":"KR-329-1","645":"KR-329-3","646":"KS-329-1",
      "647":"KS-329-3","648":"KT-329-1","649":"KT-329-3","650":"KU-329-1","651":"KU-329-3",
      "652":"KV-329-1","653":"KV-329-3","654":"KW-329-1","655":"KW-329-3","656":"KX-329-1",
      "657":"KX-329-3","658":"KY-329-1","659":"KY-329-3","660":"KZ-329-1","661":"KZ-329-3",
      "662":"LA-329-1","663":"LA-329-3","664":"LB-329-1","665":"LB-329-3","669":"KP-329-2",
      "670":"KP-329-4","671":"KQ-329-2","672":"KQ-329-4","673":"KR-329-2","674":"KR-329-4",
      "675":"KS-329-2","676":"KS-329-4","677":"KT-329-2","678":"KT-329-4","679":"KU-329-2",
      "680":"KU-329-4","681":"KV-329-2","682":"KV-329-4","684":"KW-329-4","685":"KX-329-2",
      "686":"KX-329-4","687":"KY-329-2","688":"KY-329-4","689":"KZ-329-2","690":"KZ-329-4",
      "691":"LA-329-2","692":"LA-329-4","693":"LB-329-2","694":"LB-329-4","698":"KP-330-1",
      "699":"KP-330-3","700":"KQ-330-1","701":"KQ-330-3","702":"KR-330-1","703":"KR-330-3",
      "704":"KS-330-1","705":"KS-330-3","706":"KT-330-1","708":"KU-330-1","709":"KU-330-3",
      "710":"KV-330-1","711":"KV-330-3","712":"KW-330-1","713":"KW-330-3","714":"KX-330-1",
      "715":"KX-330-3","716":"KY-330-1","717":"KY-330-3","718":"KZ-330-1","719":"KZ-330-3",
      "720":"LA-330-1","721":"LA-330-3","722":"LB-330-1","723":"LB-330-3","724":"LC-330-1",
      "727":"KP-330-2","728":"KP-330-4","729":"KQ-330-2","730":"KQ-330-4","731":"KR-330-2",
      "732":"KR-330-4","733":"KS-330-2","734":"KS-330-4","735":"KT-330-2","736":"KT-330-4",
      "737":"KU-330-2","738":"KU-330-4","739":"KV-330-2","740":"KV-330-4","741":"KW-330-2",
      "742":"KW-330-4","743":"KX-330-2","744":"KX-330-4","745":"KY-330-2","746":"KY-330-4",
      "747":"KZ-330-2","748":"KZ-330-4","749":"LA-330-2","750":"LA-330-4","751":"LB-330-2",
      "752":"LB-330-4","753":"LC-330-2","755":"KO-331-3","756":"KP-331-1","757":"KP-331-3",
      "758":"KQ-331-1","759":"KQ-331-3","760":"KR-331-1","762":"KS-331-1","763":"KS-331-3",
      "764":"KT-331-1","765":"KT-331-3","766":"KU-331-1","767":"KU-331-3","768":"KV-331-1",
      "769":"KV-331-3","770":"KW-331-1","771":"KW-331-3","772":"KX-331-1","773":"KX-331-3",
      "774":"KY-331-1","775":"KY-331-3","776":"KZ-331-1","777":"KZ-331-3","778":"LA-331-1",
      "779":"LA-331-3","780":"LB-331-1","781":"LB-331-3","784":"KO-331-4","785":"KP-331-2",
      "786":"KP-331-4","787":"KQ-331-2","788":"KQ-331-4","789":"KR-331-2","790":"KR-331-4",
      "791":"KS-331-2","792":"KS-331-4","793":"KT-331-2","794":"KT-331-4","795":"KU-331-2",
      "796":"KU-331-4","799":"KW-331-2","800":"KW-331-4","801":"KX-331-2","802":"KX-331-4",
      "803":"KY-331-2","804":"KY-331-4","805":"KZ-331-2","806":"KZ-331-4","807":"LA-331-2",
      "808":"LA-331-4","809":"LB-331-2","813":"KO-332-3","814":"KP-332-1","815":"KP-332-3",
      "816":"KQ-332-1","817":"KQ-332-3","818":"KR-332-1","819":"KR-332-3","820":"KS-332-1",
      "821":"KS-332-3","822":"KT-332-1","823":"KT-332-3","824":"KU-332-1","825":"KU-332-3",
      "826":"KV-332-1","830":"KX-332-1","832":"KY-332-1","833":"KY-332-3","834":"KZ-332-1",
      "835":"KZ-332-3","836":"LA-332-1","837":"LA-332-3","843":"KP-332-2","844":"KP-332-4",
      "845":"KQ-332-2","846":"KQ-332-4","847":"KR-332-2","848":"KR-332-4","849":"KS-332-2",
      "850":"KS-332-4","851":"KT-332-2","852":"KT-332-4","853":"KU-332-2","854":"KU-332-4",
      "855":"KV-332-2","859":"KX-332-2","860":"KX-332-4","861":"KY-332-2","862":"KY-332-4",
      "863":"KZ-332-2","864":"KZ-332-4","865":"LA-332-2","866":"LA-332-4","875":"KQ-333-3",
      "878":"KS-333-1","879":"KS-333-3","880":"KT-333-1","881":"KT-333-3","882":"KU-333-1",
      "883":"KU-333-3","884":"KV-333-1","885":"KV-333-3","888":"KX-333-1","889":"KX-333-3",
      "890":"KY-333-1","891":"KY-333-3","892":"KZ-333-1","893":"KZ-333-3","894":"LA-333-1",
      "907":"KS-333-2","908":"KS-333-4","909":"KT-333-2","910":"KT-333-4","911":"KU-333-2",
      "912":"KU-333-4","913":"KV-333-2","914":"KV-333-4","915":"KW-333-2","916":"KW-333-4",
      "920":"KY-333-4","921":"KZ-333-2","922":"KZ-333-4","936":"KS-334-1","937":"KS-334-3",
      "938":"KT-334-1","939":"KT-334-3","940":"KU-334-1","941":"KU-334-3","942":"KV-334-1",
      "943":"KV-334-3","944":"KW-334-1","945":"KW-334-3","946":"KX-334-1","949":"KY-334-3",
      "950":"KZ-334-1","951":"KZ-334-3","952":"LA-334-1","966":"KS-334-4","971":"KV-334-2",
      "972":"KV-334-4","973":"KW-334-2","974":"KW-334-4","975":"KX-334-2","978":"KY-334-4",
      "979":"KZ-334-2","1002":"KW-335-1","1003":"KW-335-3","1004":"KX-335-1","1005":"KX-335-3",
      "1006":"KY-335-1","1007":"KY-335-3","1008":"KZ-335-1","1009":"KZ-335-3","1031":"KW-335-2",
      "1032":"KW-335-4","1033":"KX-335-2","1034":"KX-335-4","1035":"KY-335-2","1036":"KY-335-4",
      "1058":"KV-336-1","1059":"KV-336-3","1060":"KW-336-1","1061":"KW-336-3","1062":"KX-336-1",
      "1063":"KX-336-3","1064":"KY-336-1","1065":"KY-336-3","1066":"KZ-336-1","1087":"KV-336-2",
      "1088":"KV-336-4","1089":"KW-336-2","1090":"KW-336-4","1091":"KX-336-2","1092":"KX-336-4",
      "1093":"KY-336-2","1094":"KY-336-4","1095":"KZ-336-2","1117":"KV-337-3","1118":"KW-337-1",
      "1119":"KW-337-3","1120":"KX-337-1","1121":"KX-337-3","1122":"KY-337-1","1123":"KY-337-3",
      "1145":"KV-337-2","1146":"KV-337-4","1147":"KW-337-2","1148":"KW-337-4","1149":"KX-337-2",
      "1150":"KX-337-4","1151":"KY-337-2","1152":"KY-337-4","1174":"KV-338-1","1175":"KV-338-3",
      "1176":"KW-338-1","1177":"KW-338-3","1178":"KX-338-1","1180":"KY-338-1","1203":"KV-338-2",
      "1204":"KV-338-4","1205":"KW-338-2","1206":"KW-338-4","1207":"KX-338-2","1208":"KX-338-4",
      "1232":"KV-339-1","1233":"KV-339-3","1234":"KW-339-1","1261":"KV-339-2","1262":"KV-339-4",
      "1263":"KW-339-2","1291":"KV-340-3","1292":"KW-340-1","976-1":"KX-334-43","976-2":"KX-334-44",
      "976-3":"KX-334-41","976-4":"KX-334-42","977-1":"KY-334-23","977-2":"KY-334-24","977-3":"KY-334-21",
      "977-4":"KY-334-22","707-1":"KT-330-33","707-2":"KT-330-34","707-3":"KT-330-31","707-4":"KT-330-32",
      "683-1-1":"KW-329-233","683-1-2":"KW-329-234","683-1-3":"KW-329-231","683-1-4":"KW-329-232","683-2":"KW-329-24",
      "683-3-1":"KW-329-213","683-3-2":"KW-329-214","683-3-3":"KW-329-211","683-3-4":"KW-329-212","683-4":"KW-329-22",
      "593-1":"KU-328-33","593-2":"KU-328-34","593-3":"KU-328-31","593-4":"KU-328-32","630-1":"KY-328-43",
      "630-2":"KY-328-44","630-3":"KY-328-41","630-4":"KY-328-42","797-1":"KV-331-23","797-2":"KV-331-24",
      "797-3":"KV-331-21","797-4-1":"KV-331-223","797-4-2":"KV-331-224","797-4-3":"KV-331-221","797-4-4":"KV-331-222",
      "798-1-1":"KV-331-433","798-1-2":"KV-331-434","798-1-3":"KV-331-431","798-1-4":"KV-331-432","798-2-1":"KV-331-443",
      "798-2-2":"KV-331-444","798-2-3":"KV-331-441","798-2-4":"KV-331-442","798-3":"KV-331-41","798-4":"KV-331-42",
      "827-1":"KV-332-33","827-2":"KV-332-34","827-3":"KV-332-31","827-4":"KV-332-32","828-1-1":"KW-332-133",
      "828-1-2":"KW-332-134","828-1-3":"KW-332-131","828-1-4":"KW-332-132","828-2":"KW-332-14","828-3":"KW-332-11",
      "828-4":"KW-332-12","829-1":"KW-332-33","829-2":"KW-332-34","829-3":"KW-332-31","829-4":"KW-332-32",
      "831-1-1":"KX-332-333","831-1-2":"KX-332-334","831-1-3":"KX-332-331","831-1-4":"KX-332-332","831-2":"KX-332-34",
      "831-3":"KX-332-31","831-4":"KX-332-32","761-1-1":"KR-331-333","761-1-2":"KR-331-334","761-1-3":"KR-331-331",
      "761-1-4":"KR-331-332","761-2":"KR-331-34","761-3":"KR-331-31","761-4":"KR-331-32","1179-1":"KX-338-33",
      "1179-2":"KX-338-34","1179-3":"KX-338-31","1179-4":"KX-338-32","236-1":"KQ-322-13","236-2":"KQ-322-14",
      "236-3":"KQ-322-11","236-4-1":"KQ-322-123","236-4-2":"KQ-322-124","236-4-3":"KQ-322-121","236-4-4":"KQ-322-122",
      "919-1":"KY-333-23","919-2":"KY-333-24","919-3":"KY-333-21","919-4":"KY-333-22","917-1":"KX-333-23",
      "917-2":"KX-333-24","917-3":"KX-333-21","917-4":"KX-333-22","918-1":"KX-333-43","918-2-1":"KX-333-443",
      "918-2-2":"KX-333-444","918-2-3":"KX-333-441","918-2-4":"KX-333-442","918-3":"KX-333-41","918-4":"KX-333-42",
      "947-1-1":"KX-334-333","947-1-2":"KX-334-334","947-1-3":"KX-334-331","947-1-4":"KX-334-332","947-2-1":"KX-334-343",
      "947-2-2":"KX-334-344","947-2-3":"KX-334-341","947-2-4":"KX-334-342","947-3":"KX-334-31","947-4":"KX-334-32",
      "948-1":"KY-334-13","948-2":"KY-334-14","948-3-1":"KY-334-113","948-3-2":"KY-334-114","948-3-3":"KY-334-111",
      "948-3-4":"KY-334-112","948-4-1":"KY-334-123","948-4-2":"KY-334-124","948-4-3":"KY-334-121","948-4-4":"KY-334-122",
      "856-1":"KV-332-43","856-2":"KV-332-44","856-3":"KV-332-41","856-4":"KV-332-42","857-1":"KW-332-23",
      "857-2-1":"KW-332-243","857-2-2":"KW-332-244","857-2-3":"KW-332-241","857-2-4":"KW-332-242","857-3":"KW-332-21",
      "857-4":"KW-332-22","858-1-1":"KW-332-433","858-1-2":"KW-332-434","858-1-3":"KW-332-431","858-1-4":"KW-332-432",
      "858-2":"KW-332-44","858-3":"KW-332-41","858-4":"KW-332-42","887-1":"KW-333-33","887-2":"KW-333-34",
      "887-3":"KW-333-31","887-4":"KW-333-32","886-1-1":"KW-333-133","886-1-2":"KW-333-134","886-1-3":"KW-333-131",
      "886-1-4":"KW-333-132","886-2-1":"KW-333-143","886-2-2":"KW-333-144","886-2-3":"KW-333-141","886-2-4":"KW-333-142",
      "886-3-1":"KW-333-113","886-3-2":"KW-333-114","886-3-3":"KW-333-111","886-3-4":"KW-333-112","886-4":"KW-333-12"
    };
    let renamed = 0;
    for (const [oldId, newId] of Object.entries(gridIdMap)) {
      const check = db.exec("SELECT id FROM grid_cells WHERE grid_id = ?", [oldId]);
      if (check.length > 0 && check[0].values.length > 0) {
        db.run("UPDATE grid_cells SET grid_id = ? WHERE grid_id = ?", [newId, oldId]);
        renamed++;
      }
    }
    if (renamed > 0) console.log(`Migration: renamed ${renamed} grid_ids to hierarchical format`);
  } catch (e) { console.error('Grid-id rename migration error:', e.message); }

  // Migration: add missing junction entries for SP border cells (multi-state)
  try {
    const spBorderStates = {"KV-334-2":"MG","KV-334-4":"MG","KW-334-2":"MG","KW-335-1":"MG","LA-329-3":"PR","LB-329-1":"PR","LB-329-3":"PR","KP-329-2":"MG","KP-330-1":"MG","LA-329-4":"PR","LB-329-2":"PR","LB-329-4":"PR","LA-328-3":"PR","KP-328-2":"MG","KP-328-4":"MG","KQ-328-2":"MG","KP-328-3":"MG","KQ-328-1":"MG","LA-328-4":"PR","KP-329-1":"MG","KO-331-4":"MG","KP-331-2":"MG","KO-332-3":"MG","KP-332-1":"MG","KP-330-2":"MG","LB-330-1":"PR","LB-330-3":"PR","LC-330-1":"PR","LC-330-2":"PR","KO-331-3":"MG","KP-331-1":"MG","KO-325-3":"MG","KW-325-1":"PR","KW-324-2":"PR","KW-325-2":"PR","KW-325-4":"PR","KO-325-4":"MG","KO-324-3":"MG","KW-323-2":"PR","KO-324-4":"MG","KW-324-1":"PR","KY-327-3":"PR","KZ-327-1":"PR","KZ-327-3":"PR","LA-327-1":"PR","LA-327-3":"PR","KO-327-3":"MG","KP-327-1":"MG","KZ-327-4":"PR","LA-327-2":"PR","LA-327-4":"PR","KP-328-1":"MG","KO-327-4":"MG","KP-327-2":"MG","KP-327-4":"MG","KW-326-3":"PR","KO-326-3":"MG","KW-326-4":"PR","KX-326-2":"PR","KX-326-4":"PR","KY-326-2":"PR","KY-326-4":"PR","KO-326-4":"MG","KS-320-4":"MS","KT-320-2":"MS","KV-320-2":"PR","KV-320-4":"PR","KS-321-3":"MS","KV-321-3":"PR","KV-338-1":"MG","KX-338-2":"RJ","KR-321-1":"MS","KR-321-3":"MS","KS-321-1":"MS","KV-338-2":"MG,RJ","KW-338-2":"RJ","KW-338-4":"RJ","KT-319-4":"MS","KU-319-2":"MS","KU-319-4":"MS","KV-337-3":"MG","KV-319-4":"PR","KU-319-3":"MS","KV-319-1":"PR","KV-319-3":"PR","KT-320-1":"MS","KT-320-3":"MS","KV-337-2":"MG","KV-337-4":"MG","KV-320-1":"PR","KV-320-3":"PR","KP-323-1":"MG,MS","KP-323-3":"MS","KP-322-4":"MS","KV-340-3":"RJ","KW-340-1":"RJ","KV-322-4":"PR","KO-323-4":"MG","KP-323-2":"MG","KV-323-3":"PR","KW-323-1":"PR","KV-321-4":"PR","KQ-321-2":"MS","KQ-321-4":"MS","KR-321-2":"MS","KV-322-3":"PR","KV-339-1":"RJ","KV-339-3":"RJ","KW-339-1":"RJ","KP-322-3":"MS","KQ-322-13":"MS","KQ-322-11":"MS","KQ-322-123":"MS","KQ-322-121":"MS","KV-339-2":"RJ","KV-339-4":"RJ","KW-339-2":"RJ","KS-333-2":"MG","KS-333-4":"MG","KU-333-2":"MG","KU-333-4":"MG","KS-334-4":"MG","KS-334-1":"MG","KS-334-3":"MG","KT-334-1":"MG","KT-334-3":"MG","KU-334-1":"MG","KU-334-3":"MG","KV-334-1":"MG","KP-332-2":"MG","KP-332-4":"MG","KQ-332-2":"MG","KQ-332-4":"MG","KR-332-2":"MG","KR-332-4":"MG","KS-332-2":"MG","KQ-333-3":"MG","KS-333-1":"MG","KS-333-3":"MG","KV-336-1":"MG","KV-336-3":"MG","KW-336-1":"MG","KV-318-1":"MS,PR","KW-335-2":"MG","KV-318-3":"MS,PR","KV-336-2":"MG","KV-336-4":"MG","KU-318-4":"MS","KV-318-2":"MS,PR","KV-318-4":"PR"};
    let borderAdded = 0;
    for (const [gridId, statesStr] of Object.entries(spBorderStates)) {
      const row = db.exec("SELECT id FROM grid_cells WHERE grid_id = ?", [gridId]);
      if (row.length === 0 || row[0].values.length === 0) continue;
      const cellId = row[0].values[0][0];
      for (const uf of statesStr.split(',')) {
        db.run("INSERT OR IGNORE INTO grid_cell_states (grid_cell_id, state) VALUES (?, ?)", [cellId, uf]);
        borderAdded++;
      }
    }
    if (borderAdded > 0) console.log(`Migration: added ${borderAdded} border-state junction entries for SP cells`);
  } catch (e) { console.error('SP border-state migration error:', e.message); }

  // Auto-seed Brazil-wide grid cells if missing
  try {
    const nonSPCount = db.exec("SELECT COUNT(*) FROM grid_cells WHERE state != 'SP'");
    const hasNonSP = nonSPCount.length > 0 && nonSPCount[0].values[0][0] > 100;
    if (!hasNonSP) {
      const seedPath = path.join(__dirname, 'seed-data', 'brazil_grid_non_sp.json');
      if (fs.existsSync(seedPath)) {
        console.log('Migration: seeding Brazil-wide grid cells...');
        const { cells, junctions } = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        const existingIds = new Set(
          (db.exec('SELECT grid_id FROM grid_cells') || [{}])[0]?.values?.map(r => r[0]) || []
        );
        const maxRow = db.exec('SELECT COALESCE(MAX(id), 0) FROM grid_cells');
        let nextId = (maxRow[0]?.values[0]?.[0] || 0) + 1;
        const oldToNew = {};
        let inserted = 0;

        db.run('BEGIN');
        for (const c of cells) {
          if (existingIds.has(c.grid_id)) continue;
          oldToNew[c.id] = nextId;
          db.run(
            'INSERT INTO grid_cells (id, fid, grid_id, geometry, grid_status, numpoints, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nextId, nextId, c.grid_id, c.geometry, c.grid_status || 'no_points', c.numpoints || 0, c.state, c.updated_at || new Date().toISOString()]
          );
          nextId++;
          inserted++;
        }
        let jInserted = 0;
        for (const j of junctions) {
          const newId = oldToNew[j.grid_cell_id];
          if (!newId) continue;
          db.run('INSERT OR IGNORE INTO grid_cell_states (grid_cell_id, state) VALUES (?, ?)', [newId, j.state]);
          jInserted++;
        }
        db.run('COMMIT');
        console.log(`Migration: inserted ${inserted} Brazil grid cells (${jInserted} junction rows)`);
      }
    }
  } catch (e) { console.error('Brazil grid seed migration error:', e.message); }

  // Auto-seed occurrence points from seed-data if DB has significantly fewer points
  try {
    const ptCountRow = db.exec('SELECT COUNT(*) FROM occurrence_points');
    const ptCount = ptCountRow.length > 0 ? ptCountRow[0].values[0][0] : 0;
    const seedPtsPath = path.join(__dirname, 'seed-data', 'leucaena-points.geojson');
    if (ptCount < 2000 && fs.existsSync(seedPtsPath)) {
      console.log(`Migration: seeding occurrence points (current: ${ptCount})...`);
      const { features } = JSON.parse(fs.readFileSync(seedPtsPath, 'utf8'));

      const existingCoords = new Set();
      const existingPts = (db.exec('SELECT geometry FROM occurrence_points') || [{}])[0];
      if (existingPts && existingPts.values) {
        for (const row of existingPts.values) {
          const g = JSON.parse(row[0]);
          existingCoords.add(`${Number(g.coordinates[0]).toFixed(5)}_${Number(g.coordinates[1]).toFixed(5)}`);
        }
      }

      const maxFidRow = db.exec('SELECT COALESCE(MAX(fid), 0) FROM occurrence_points');
      let nextFid = (maxFidRow[0]?.values[0]?.[0] || 0) + 1;
      let inserted = 0;

      db.run('BEGIN');
      for (const f of features) {
        if (!f.geometry || f.geometry.type !== 'Point') continue;
        const [lng, lat] = f.geometry.coordinates;
        const key = `${Number(lng).toFixed(5)}_${Number(lat).toFixed(5)}`;
        if (existingCoords.has(key)) continue;
        existingCoords.add(key);
        const layer = (f.properties && f.properties.layer) || 'crowdmapping';
        const status = (f.properties && f.properties.status) || 0;
        db.run(
          'INSERT INTO occurrence_points (fid, geometry, not_valid, layer, status) VALUES (?, ?, ?, ?, ?)',
          [nextFid, JSON.stringify(f.geometry), status, layer, status]
        );
        nextFid++;
        inserted++;
      }
      db.run('COMMIT');
      console.log(`Migration: inserted ${inserted} occurrence points`);
    }
  } catch (e) { console.error('Points seed migration error:', e.message); }

  // Auto-update grid cell numpoints + grid_status based on current points
  try {
    const ptTotal = db.exec('SELECT COUNT(*) FROM occurrence_points');
    const total = ptTotal.length > 0 ? ptTotal[0].values[0][0] : 0;
    const numpointsCheck = db.exec("SELECT COUNT(*) FROM grid_cells WHERE numpoints > 0 AND state != 'SP'");
    const nonSPWithPoints = numpointsCheck.length > 0 ? numpointsCheck[0].values[0][0] : 0;
    if (total > 0 && nonSPWithPoints < 10) {
      console.log('Migration: recalculating grid cell numpoints...');
      const allPts = (db.exec('SELECT geometry FROM occurrence_points') || [{}])[0];
      const ptCoords = [];
      if (allPts && allPts.values) {
        for (const row of allPts.values) {
          const g = JSON.parse(row[0]);
          ptCoords.push([g.coordinates[0], g.coordinates[1]]);
        }
      }

      function pipCheck(point, ring) {
        const [px, py] = point;
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i];
          const [xj, yj] = ring[j];
          if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
      }

      const cellRows = (db.exec('SELECT id, geometry, grid_status FROM grid_cells') || [{}])[0];
      if (cellRows && cellRows.values) {
        let updated = 0;
        db.run('BEGIN');
        for (const row of cellRows.values) {
          const cId = row[0];
          const geom = JSON.parse(row[1]);
          const cStatus = row[2];
          const rings = geom.type === 'MultiPolygon' ? geom.coordinates.map(p => p[0]) : [geom.coordinates[0]];
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const ring of rings) { for (const c of ring) { if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]; if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]; } }
          let count = 0;
          for (const [px, py] of ptCoords) {
            if (px < minX || px > maxX || py < minY || py > maxY) continue;
            if (rings.some(ring => pipCheck([px, py], ring))) count++;
          }
          db.run('UPDATE grid_cells SET numpoints = ? WHERE id = ?', [count, cId]);
          if (count > 0 && cStatus === 'no_points') {
            db.run("UPDATE grid_cells SET grid_status = 'not_yet_finished', updated_at = ? WHERE id = ?", [new Date().toISOString(), cId]);
          }
          updated++;
        }
        db.run('COMMIT');
        console.log(`Migration: updated numpoints for ${updated} cells`);
      }
    }
  } catch (e) { console.error('Numpoints migration error:', e.message); }

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
