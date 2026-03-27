#!/usr/bin/env node
//
// Creates the first superadmin user in a fresh database.
//
// Usage:
//   node create-admin.js <username> <password> [email]
//
// Example:
//   node create-admin.js admin mySecurePass123 admin@example.com
//
// This only needs to run once. After the first superadmin exists,
// all other users can be created from the admin panel in the browser.

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Load .env if present (same logic as server.js)
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
} catch (e) { /* no .env */ }

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node create-admin.js <username> <password> [email]');
  console.log('Example: node create-admin.js admin myPass123 admin@example.com');
  process.exit(1);
}

const [username, password, email] = args;

if (username.length < 2 || username.length > 30) {
  console.error('Error: username must be 2-30 characters.');
  process.exit(1);
}
if (password.length < 3) {
  console.error('Error: password must be at least 3 characters.');
  process.exit(1);
}

const PASSWORD_SALT = process.env.PASSWORD_SALT || 'default_salt';

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + PASSWORD_SALT).digest('hex');
}

async function main() {
  const { initDB, getDB, persist } = require('./db');
  await initDB();
  const db = getDB();

  const existing = db.exec(`SELECT id FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    console.error(`Error: user "${username}" already exists.`);
    process.exit(1);
  }

  const hash = hashPassword(password);
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO users (username, password_hash, created_at, role, email) VALUES (?, ?, ?, ?, ?)',
    [username, hash, now, 'superadmin', email || null]
  );
  persist();

  console.log(`Superadmin "${username}" created successfully.`);
  console.log('You can now log in at http://localhost:3000 and manage users from the admin panel.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
