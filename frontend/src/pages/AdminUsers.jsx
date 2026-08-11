import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const MAX_USERS = 10;

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', display_name: '' });
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    api
      .listUsers(token)
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  const regularUsers = users.filter((u) => u.role === 'user');
  const atLimit = regularUsers.length >= MAX_USERS;

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.createUser(token, form);
      setForm({ username: '', password: '', display_name: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u) {
    await api.setUserActive(token, u.id, u.active ? 0 : 1);
    load();
  }

  async function handleResetPassword(u) {
    const newPassword = prompt(`New password for ${u.username} (min 6 characters):`);
    if (!newPassword) return;
    try {
      await api.resetUserPassword(token, u.id, newPassword);
      alert('Password updated.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Permanently delete "${u.username}" and their entire inventory? This cannot be undone.`)) return;
    await api.deleteUser(token, u.id);
    load();
  }

  return (
    <div>
      <h2>Manage users</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
        {regularUsers.length} of {MAX_USERS} team accounts used
      </p>
      <div className="seam-divider" />

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <form className="card" onSubmit={handleCreate}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add a user</h3>
          <div className="field">
            <label htmlFor="uname">Username</label>
            <input id="uname" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="dname">Display name</label>
            <input id="dname" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="upass">Temporary password</label>
            <input
              id="upass"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating || atLimit}>
            {atLimit ? 'User limit reached' : creating ? 'Creating…' : 'Create user'}
          </button>
        </form>

        <div>
          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {users.map((u) => (
                <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {u.display_name || u.username}{' '}
                      {u.role === 'admin' && (
                        <span className="badge badge-have" style={{ marginLeft: '0.4rem' }}>
                          Admin
                        </span>
                      )}
                      {u.role === 'user' && !u.active && (
                        <span className="badge badge-had" style={{ marginLeft: '0.4rem' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                      @{u.username} · joined {u.created_at?.slice(0, 10)}
                    </div>
                  </div>
                  {u.role === 'user' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem' }} onClick={() => handleResetPassword(u)}>
                        Reset password
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem' }} onClick={() => toggleActive(u)}>
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.35rem 0.7rem' }} onClick={() => handleDelete(u)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
