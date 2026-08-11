const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
const MAX_USERS = 10; // max number of non-admin user accounts

router.use(requireAuth, requireAdmin);

// List all users (admin only)
router.get('/', asyncHandler(async (req, res) => {
  const users = await db.all(
    'SELECT id, username, role, display_name, created_at, active FROM users ORDER BY created_at ASC'
  );
  res.json({ users });
}));

// Create a new user (admin only, capped at MAX_USERS non-admin accounts)
router.post('/', asyncHandler(async (req, res) => {
  const { username, password, display_name } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const countRow = await db.get("SELECT COUNT(*) as c FROM users WHERE role = 'user'");
  if (Number(countRow.c) >= MAX_USERS) {
    return res.status(400).json({ error: `User limit reached (max ${MAX_USERS} users)` });
  }

  const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(400).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const info = await db.run(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)',
    [username, hash, 'user', display_name || username]
  );

  res.status(201).json({ id: info.lastInsertRowid, username, role: 'user', display_name: display_name || username });
}));

// Deactivate / reactivate a user (soft delete, preserves their inventory + history)
router.patch('/:id/active', asyncHandler(async (req, res) => {
  const { active } = req.body || {};
  const id = Number(req.params.id);
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot deactivate admin' });

  await db.run('UPDATE users SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  res.json({ ok: true });
}));

// Reset a user's password (admin only)
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { newPassword } = req.body || {};
  const id = Number(req.params.id);
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  res.json({ ok: true });
}));

// Permanently delete a user and their inventory (admin only)
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });

  await db.run('DELETE FROM users WHERE id = ?', [id]); // cascades to items + history
  res.json({ ok: true });
}));

module.exports = router;
