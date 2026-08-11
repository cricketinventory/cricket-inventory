// Ensures an admin account exists on startup, using ADMIN_USERNAME / ADMIN_PASSWORD
// from the environment. Safe to run on every boot — does nothing if an admin
// with that username already exists (so it won't reset your password on redeploys).
const bcrypt = require('bcryptjs');
const db = require('./index');

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123') {
    console.warn(
      '[startup] WARNING: ADMIN_PASSWORD is unset or using the default "admin123". ' +
      'Set a strong ADMIN_PASSWORD in your environment before exposing this app publicly.'
    );
  }

  const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);

  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    await db.run(
      'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)',
      [username, hash, 'admin', 'Administrator']
    );
    console.log(`[startup] Created admin user "${username}". Log in and change the password if this was auto-generated.`);
  }
}

module.exports = { ensureAdmin };
