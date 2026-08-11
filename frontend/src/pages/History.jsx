import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const ACTION_LABEL = {
  created: 'Added',
  status_changed: 'Status changed',
  quantity_changed: 'Quantity changed',
  deleted: 'Removed',
};

export default function History() {
  const { token, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [viewUserId, setViewUserId] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.listUsers(token).then((data) => setUsers(data.users.filter((u) => u.role === 'user')));
    }
  }, [token, user]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .allHistory(token, viewUserId || undefined)
      .then((data) => setHistory(data.history))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, viewUserId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h2>History</h2>
          <p style={{ color: 'var(--ink-soft)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
            A running log of what was added, changed, or removed
          </p>
        </div>
        {user?.role === 'admin' && users.length > 0 && (
          <select
            value={viewUserId || ''}
            onChange={(e) => setViewUserId(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '0.5rem 0.7rem',
              border: '1.5px solid var(--line)',
              borderRadius: 7,
              fontSize: '0.88rem',
              background: 'var(--paper)',
            }}
          >
            <option value="">My own history</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.username}'s history
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="seam-divider" />

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '2.5rem' }}>
          No activity logged yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {history.map((h) => (
            <div key={h.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {ACTION_LABEL[h.action] || h.action} · {h.item_name}
                </div>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: '0.15rem' }}>{h.details}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                {h.created_at}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
