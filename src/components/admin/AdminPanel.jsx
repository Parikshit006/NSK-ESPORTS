import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import ManageTournament from './ManageTournament';
import CreateTournament from './CreateTournament';

export default function AdminPanel() {
  const { user: admin, isAdmin, loading, signInWithEmail: signIn, signInWithGoogle, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Checking session...</p>
      </div>
    );
  }

  if (admin && !isAdmin) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h2 style={{ color: 'var(--accent-orange)' }}>Access Denied</h2>
        <p className="muted-text mb-4">Your account ({admin.email}) does not have admin privileges.</p>
        <button className="btn btn-secondary" onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  if (!admin) {
    async function handleLogin(e) {
      e.preventDefault();
      setError('');
      setSubmitting(true);
      try {
        await signIn(email, password);
      } catch (err) {
        console.error('Login error:', err);
        setError(err.message || 'Invalid email or password');
      } finally {
        setSubmitting(false);
      }
    }

    async function handleGoogleLogin() {
      setError('');
      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('Google login error:', err);
        setError(err.message || 'Google sign-in failed');
      }
    }

    return (
      <div className="page">
        <div className="container container-sm">
          <div className="card" style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <img src="/ff-logo.webp" alt="NSK Esports" style={{ height: 56, margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Admin Portal</h2>
            <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>
              Sign in to manage tournaments
            </p>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              className="btn btn-lg w-full"
              style={{
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: 600,
                fontSize: 'var(--text-base)',
                marginBottom: 'var(--space-6)',
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)'
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
              <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
            </div>

            {/* Email/Password */}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@nsk-esports.in"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={submitting}
              >
                {submitting ? 'Signing in...' : '🔓 Sign In with Email'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'var(--space-3) var(--space-6)',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)'
      }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-orange)' }}>
          NSK ESPORTS ADMIN
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
            {admin.email}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="create" element={<CreateTournament />} />
        <Route path="tournament/:tournamentId/*" element={<ManageTournament />} />
        <Route path="*" element={<Navigate to="/admin/" replace />} />
      </Routes>
    </div>
  );
}
