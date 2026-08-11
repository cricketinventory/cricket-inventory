require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin123';

const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

if (existing) {
  console.log(`Admin user "${username}" already exists. Skipping.`);
} else {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)'
  ).run(username, hash, 'admin', 'Administrator');
  console.log(`Admin user created: username="${username}" password="${password}"`);
  console.log('IMPORTANT: log in and consider this the only time the password is shown here.');
}
