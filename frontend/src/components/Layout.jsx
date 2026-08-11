import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: 'var(--pitch-900)',
          color: 'var(--cream)',
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ color: 'var(--cream)', fontSize: '1.15rem', letterSpacing: '0.01em' }}>
            🏏 Kit &amp; Caboodle
          </h1>
          <nav style={{ display: 'flex', gap: '1.2rem' }}>
            <StyledLink to="/">Inventory</StyledLink>
            <StyledLink to="/history">History</StyledLink>
            {user?.role === 'admin' && <StyledLink to="/admin">Manage users</StyledLink>}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
            {user?.display_name || user?.username} · {user?.role}
          </span>
          <button
            className="btn btn-secondary"
            style={{ color: 'var(--cream)', borderColor: 'var(--pitch-300)' }}
            onClick={() => setShowChangePassword(true)}
          >
            Change password
          </button>
          <button className="btn btn-secondary" style={{ color: 'var(--cream)', borderColor: 'var(--pitch-300)' }} onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}

function StyledLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        color: isActive ? 'var(--willow)' : 'var(--cream)',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '0.92rem',
        opacity: isActive ? 1 : 0.85,
      })}
    >
      {children}
    </NavLink>
  );
}
