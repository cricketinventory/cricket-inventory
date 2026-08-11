const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

async function logHistory(itemId, userId, action, details) {
  await db.run(
    'INSERT INTO item_history (item_id, user_id, action, details) VALUES (?, ?, ?, ?)',
    [itemId, userId, action, details || null]
  );
}

// Determine which user's inventory to operate on.
// Regular users always act on their own inventory.
// Admin can pass ?user_id=<id> to view/manage a specific user's inventory,
// or omit it to see their own (admin's own inventory, if they keep one).
function targetUserId(req) {
  if (req.user.role === 'admin' && req.query.user_id) {
    return Number(req.query.user_id);
  }
  return req.user.id;
}

// List items for the target inventory
router.get('/', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const { status } = req.query;
  let query = 'SELECT * FROM items WHERE user_id = ?';
  const params = [uid];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY updated_at DESC';
  const items = await db.all(query, params);
  res.json({ items });
}));

// Admin-only: list items across ALL users at once
router.get('/all', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const items = await db.all(
    `SELECT items.*, users.username, users.display_name
     FROM items JOIN users ON users.id = items.user_id
     ORDER BY items.updated_at DESC`
  );
  res.json({ items });
}));

// Get full history for the target inventory
// (declared before /:id routes so "history" isn't captured as an :id param)
router.get('/history/all', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const history = await db.all(
    `SELECT item_history.*, items.name as item_name
     FROM item_history JOIN items ON items.id = item_history.item_id
     WHERE item_history.user_id = ?
     ORDER BY item_history.created_at DESC`,
    [uid]
  );
  res.json({ history });
}));

// Get a single item (must belong to target inventory)
router.get('/:id', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, uid]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ item });
}));

// Create item
router.post('/', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const { name, category, status, quantity, price, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const finalStatus = status || 'have';
  const info = await db.run(
    `INSERT INTO items (user_id, name, category, status, quantity, price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uid, name, category || null, finalStatus, quantity ?? 1, price ?? null, notes || null]
  );

  await logHistory(info.lastInsertRowid, uid, 'created', `Added "${name}" (status: ${finalStatus})`);
  const item = await db.get('SELECT * FROM items WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json({ item });
}));

// Update item (tracks status/quantity changes in history)
router.put('/:id', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const existing = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, uid]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const { name, category, status, quantity, price, notes } = req.body || {};
  const updated = {
    name: name ?? existing.name,
    category: category ?? existing.category,
    status: status ?? existing.status,
    quantity: quantity ?? existing.quantity,
    price: price ?? existing.price,
    notes: notes ?? existing.notes,
  };

  await db.run(
    `UPDATE items SET name=?, category=?, status=?, quantity=?, price=?, notes=?, updated_at=datetime('now')
     WHERE id=?`,
    [updated.name, updated.category, updated.status, updated.quantity, updated.price, updated.notes, existing.id]
  );

  if (status && status !== existing.status) {
    await logHistory(existing.id, uid, 'status_changed', `${existing.status} -> ${status}`);
  }
  if (quantity !== undefined && Number(quantity) !== Number(existing.quantity)) {
    await logHistory(existing.id, uid, 'quantity_changed', `${existing.quantity} -> ${quantity}`);
  }

  const item = await db.get('SELECT * FROM items WHERE id = ?', [existing.id]);
  res.json({ item });
}));

// Delete item (logs removal before deleting)
router.delete('/:id', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const existing = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, uid]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  await logHistory(existing.id, uid, 'deleted', `Removed "${existing.name}"`);
  await db.run('DELETE FROM items WHERE id = ?', [existing.id]);
  res.json({ ok: true });
}));

// Get history for one item
router.get('/:id/history', asyncHandler(async (req, res) => {
  const uid = targetUserId(req);
  const item = await db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, uid]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const history = await db.all('SELECT * FROM item_history WHERE item_id = ? ORDER BY created_at DESC', [req.params.id]);
  res.json({ history });
}));

module.exports = router;
