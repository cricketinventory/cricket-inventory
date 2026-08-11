const { createClient } = require('@libsql/client');
const path = require('path');

// TURSO_DATABASE_URL + TURSO_AUTH_TOKEN connect to a hosted Turso database (production).
// If unset, falls back to a local SQLite file so local dev needs zero setup.
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', '..', 'data.sqlite')}`;
const authToken = process.env.TURSO_AUTH_TOKEN; // not needed for local file mode

const client = createClient(authToken ? { url, authToken } : { url });

// Thin helpers so route files read almost like the old better-sqlite3 API,
// just with awaits (network calls are async, unlike a local file).
async function get(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows[0] || undefined;
}

async function all(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows;
}

async function run(sql, args = []) {
  const res = await client.execute({ sql, args });
  return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.rowsAffected };
}

async function exec(sql) {
  // For multi-statement schema setup
  await client.executeMultiple(sql);
}

module.exports = { client, get, all, run, exec };
