import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournamentBySlug } from '../services/dataService';
import { buildLeaderboard } from '../utils/scoring';
import { formatTime, TEAM_STATUS_CONFIG, copyToClipboard, timeAgo } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';

export default function TeamPortalPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    setTournament(getTournamentBySlug(slug));
  }, [slug]);

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Tournament not found</h2></div></div>;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    const found = (tournament.teams || []).find(
      t => t.teamName.toLowerCase() === teamName.toLowerCase().trim() &&
           t.leaderWhatsapp === phone.trim()
    );
    if (found) {
      setTeam(found);
      setError('');
    } else {
      setError('Team not found. Check name and phone number.');
    }
  };

  // LOGIN VIEW
  if (!team) {
    return (
      <div className="page">
        <div className="container container-sm">
          <div className="card" style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>👤</div>
            <h2 style={{ marginBottom: 'var(--space-2)' }}>Team Portal</h2>
            <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>Enter your team name and leader phone number</p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <input className="form-input" placeholder="Team Name" value={teamName}
                  onChange={e => { setTeamName(e.target.value); setError(''); }} />
              </div>
              <div className="form-group">
                <input className="form-input" placeholder="Leader WhatsApp Number" value={phone}
                  onChange={e => { setPhone(e.target.value); setError(''); }} />
              </div>
              {error && <div className="form-error mb-4">{error}</div>}
              <button type="submit" className="btn btn-primary w-full">🔓 Access Portal</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL VIEW
  const sc = TEAM_STATUS_CONFIG[team.status] || {};
  const standings = buildLeaderboard(tournament);
  const teamStanding = standings.find(s => s.teamId === team.id);
  const relevantMatches = (tournament.matches || []).filter(m => m.roomReleased);

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="page-header">
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-2)' }}>⚔️</div>
          <h1 className="page-title">{team.teamName}</h1>
          <div className="flex gap-3 justify-center items-center">
            <span className={`badge ${sc.color}`}>{sc.label}</span>
            {team.slotNumber && <span className="badge badge-orange">Slot #{team.slotNumber}</span>}
          </div>
        </div>

        {/* Team Info */}
        <div className="card mb-4 animate-slideUp">
          <h4 style={{ marginBottom: 'var(--space-4)' }}>👥 Your Squad</h4>
          {(team.players || []).map((p, i) => (
            <div key={i} className="flex justify-between items-center" style={{
              padding: 'var(--space-3)',
              borderBottom: i < team.players.length - 1 ? '1px solid var(--border-default)' : 'none'
            }}>
              <div>
                <span style={{ fontWeight: 600 }}>{p.ign}</span>
                <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}> — UID: {p.uid}</span>
              </div>
              <span className="badge badge-info">{p.role}</span>
            </div>
          ))}
        </div>

        {/* Room Info */}
        <div className="card mb-4 animate-slideUp delay-1">
          <h4 style={{ marginBottom: 'var(--space-4)' }}>🚪 Room Info</h4>
          {relevantMatches.length === 0 ? (
            <div className="text-center" style={{ padding: 'var(--space-4)' }}>
              <div style={{ fontSize: '36px', marginBottom: 'var(--space-2)' }}>🔒</div>
              <p className="muted-text">Room ID will be released at {formatTime(tournament.schedule?.roomReleaseTime)}</p>
            </div>
          ) : (
            relevantMatches.map(m => (
              <div key={m.matchNumber} className="card" style={{
                background: 'var(--bg-secondary)', padding: 'var(--space-4)',
                marginBottom: 'var(--space-3)', borderColor: 'rgba(0,255,136,0.2)'
              }}>
                <div className="flex justify-between items-center">
                  <h5>Match {m.matchNumber}</h5>
                  <span className="badge badge-success">🔓 Released</span>
                </div>
                <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <div className="form-label">Room ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--accent-orange)' }}>
                      {m.roomId || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="form-label">Password</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {m.password || '—'}
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm mt-3" onClick={() => {
                  copyToClipboard(`Room ID: ${m.roomId} | Pass: ${m.password}`);
                  toast.success('Copied!');
                }}>📋 Copy</button>
              </div>
            ))
          )}
        </div>

        {/* Team Stats */}
        {teamStanding && (
          <div className="card mb-4 animate-slideUp delay-2">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>📊 Your Stats</h4>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="text-center">
                <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-orange)' }}>
                  #{teamStanding.rank > 0 ? teamStanding.rank : '—'}
                </div>
                <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Current Rank</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-cyan)' }}>
                  {teamStanding.totalKills}
                </div>
                <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Total Kills</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {teamStanding.totalPoints}
                </div>
                <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Total Points</div>
              </div>
            </div>

            {/* Match Breakdown */}
            <div className="mt-4">
              {teamStanding.matchResults.map((mr, i) => (
                <div key={i} className="flex justify-between items-center" style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--border-default)'
                }}>
                  <span>Map {mr.matchNumber}</span>
                  {mr.kills !== null ? (
                    <span style={{ fontFamily: 'var(--font-heading)' }}>
                      #{mr.placement} • {mr.kills}K • <span className="accent-text">{mr.totalPts} pts</span>
                    </span>
                  ) : (
                    <span className="muted-text">Not played</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Announcements */}
        {(tournament.announcements || []).length > 0 && (
          <div className="card animate-slideUp delay-3">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>📢 Announcements</h4>
            {tournament.announcements.map(a => (
              <div key={a.id} style={{
                padding: 'var(--space-3)',
                borderBottom: '1px solid var(--border-default)'
              }}>
                <p>{a.text}</p>
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <button className="btn btn-ghost w-full mt-6" onClick={() => setTeam(null)}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
