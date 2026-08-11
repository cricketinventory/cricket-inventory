import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import ItemForm from '../components/ItemForm';

const STATUS_LABEL = { have: 'Have', had: 'Had', want_to_buy: 'Want to buy' };
const STATUS_BADGE = { have: 'badge-have', had: 'badge-had', want_to_buy: 'badge-want' };

export default function Dashboard() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null); // item being edited, or {} for new
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [viewUserId, setViewUserId] = useState(null); // admin: whose inventory to view

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .listItems(token, { status: statusFilter || undefined, userId: viewUserId || undefined })
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, statusFilter, viewUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.listUsers(token).then((data) => setUsers(data.users.filter((u) => u.role === 'user')));
    }
  }, [token, user]);

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editing?.id) {
        await api.updateItem(token, editing.id, payload, viewUserId);
      } else {
        await api.createItem(token, payload, viewUserId);
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Remove "${item.name}" from inventory? This will be logged in history.`)) return;
    await api.deleteItem(token, item.id, viewUserId);
    load();
  }

  const counts = items.reduce(
    (acc, it) => {
      acc[it.status] = (acc[it.status] || 0) + (it.quantity || 0);
      return acc;
    },
    { have: 0, had: 0, want_to_buy: 0 }
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h2>Inventory</h2>
          <p style={{ color: 'var(--ink-soft)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
            {viewUserId
              ? `Viewing ${users.find((u) => u.id === viewUserId)?.display_name || 'user'}'s kit`
              : "Your gear — current, past, and wishlist"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          + Add item
        </button>
      </div>

      <div className="seam-divider" />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard label="Have" value={counts.have} tone="var(--pitch-700)" />
        <StatCard label="Had" value={counts.had} tone="var(--ink-soft)" />
        <StatCard label="Want to buy" value={counts.want_to_buy} tone="#8a6c2f" />
      </div>

      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="have">Have</option>
          <option value="had">Had</option>
          <option value="want_to_buy">Want to buy</option>
        </select>

        {user?.role === 'admin' && users.length > 0 && (
          <select
            value={viewUserId || ''}
            onChange={(e) => setViewUserId(e.target.value ? Number(e.target.value) : null)}
            style={selectStyle}
          >
            <option value="">My own inventory</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.username}'s inventory
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '2.5rem' }}>
          Nothing here yet. Add your first item to start tracking your kit.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', textAlign: 'left' }}>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Qty</Th>
                <Th>Price</Th>
                <Th>Notes</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <Td style={{ fontWeight: 600 }}>{item.name}</Td>
                  <Td>{item.category || '—'}</Td>
                  <Td>
                    <span className={`badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                  </Td>
                  <Td style={{ fontFamily: 'var(--font-mono)' }}>{item.quantity}</Td>
                  <Td style={{ fontFamily: 'var(--font-mono)' }}>{item.price != null ? `$${item.price}` : '—'}</Td>
                  <Td style={{ color: 'var(--ink-soft)', maxWidth: 220 }}>{item.notes || '—'}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem' }} onClick={() => setEditing(item)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.35rem 0.7rem' }} onClick={() => handleDelete(item)}>
                        Remove
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ItemForm
          initial={editing.id ? editing : null}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="card" style={{ flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.9rem', fontWeight: 600, color: tone }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{ padding: '0.7rem 1rem', fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
      {children}
    </th>
  );
}
function Td({ children, style }) {
  return <td style={{ padding: '0.7rem 1rem', fontSize: '0.9rem', ...style }}>{children}</td>;
}

const selectStyle = {
  padding: '0.5rem 0.7rem',
  border: '1.5px solid var(--line)',
  borderRadius: 7,
  fontSize: '0.88rem',
  background: 'var(--paper)',
  color: 'var(--ink)',
};
