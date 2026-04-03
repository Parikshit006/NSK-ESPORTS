import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { getAllTournaments, verifyAdminPin, isAdminPinSet } from '../../services/dataService';
import AdminDashboard from './AdminDashboard';
import CreateTournament from './CreateTournament';
import ManageTournament from './ManageTournament';

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (verifyAdminPin(pin)) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Invalid PIN');
    }
  };

  if (!authenticated) {
    return (
      <div className="page">
        <div className="container container-sm">
          <div className="card" style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔒</div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Admin Panel</h2>
            <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>
              {isAdminPinSet() ? 'Enter your 4-digit PIN' : 'Set a 4-digit admin PIN'}
            </p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-input"
                  placeholder="● ● ● ●"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPin(v);
                    setError('');
                  }}
                  style={{
                    textAlign: 'center',
                    fontSize: 'var(--text-3xl)',
                    letterSpacing: '0.5em',
                    fontFamily: 'var(--font-heading)',
                  }}
                  autoFocus
                />
                {error && <div className="form-error">{error}</div>}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full">
                {isAdminPinSet() ? '🔓 Unlock' : '🔐 Set PIN & Enter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="create" element={<CreateTournament />} />
      <Route path="tournament/:tournamentId/*" element={<ManageTournament />} />
    </Routes>
  );
}
