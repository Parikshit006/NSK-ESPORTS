import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getTournamentBySlug, getTeamByNameAndPhone,
  getMatchesByTournament, getLeaderboard, getAnnouncements
} from '../services/dataService';
import { formatTime, TEAM_STATUS_CONFIG, copyToClipboard, timeAgo } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import { usePolling } from '../hooks/usePolling';

export default function TeamPortalPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const toast = useToast();

  // Load tournament
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const t = await getTournamentBySlug(slug);
        setTournament(t);
      } catch (err) {
        console.error('Failed to load tournament:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Poll for matches, standings, and announcements when team is logged in
  const fetchPortalData = useCallback(async () => {
    if (!tournament?.id || !team) return;
    try {
      const [m, lb, ann] = await Promise.all([
        getMatchesByTournament(tournament.id),
        getLeaderboard(tournament.id),
        getAnnouncements(tournament.id),
      ]);
      setMatches(m);
      setStandings(lb);
      setAnnouncements(ann);
    } catch (err) {
      console.error('Portal data fetch error:', err);
    }
  }, [tournament?.id, team]);

  usePolling(fetchPortalData, 10000, !!tournament?.id && !!team);

  if (loading) {
    return (
      <div className="page">
        <div className="container text-center" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Tournament not found</h2></div></div>;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');
    try {
      const found = await getTeamByNameAndPhone(
        tournament.id,
        teamName.trim(),
        phone.trim()
      );
      if (found) {
        setTeam(found);
      } else {
        setError('Team not found. Check name and phone number.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoginLoading(false);
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
              <button type="submit" className="btn btn-primary w-full" disabled={loginLoading}>
                {loginLoading ? '⏳ Checking...' : '🔓 Access Portal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL VIEW
  const sc = TEAM_STATUS_CONFIG[team.status] || {};
  const teamStanding = standings.find(s => (s.teamId || s.id) === team.id);
  const relevantMatches = matches.filter(m => m.roomReleased);

  // Build per-match breakdown for the team from standings
  const numMatches = parseInt(tournament.schedule?.numMatches) || 0;
  const matchBreakdown = [];
  if (teamStanding) {
    for (let i = 1; i <= numMatches; i++) {
      const mr = teamStanding.matchResults?.[i] || teamStanding.matchResults?.find?.(r => r.matchNumber === i);
      if (mr && mr.kills !== null && mr.kills !== undefined) {
        matchBreakdown.push({
          matchNumber: i,
          placement: mr.placement,
          kills: mr.kills,
          totalPts: mr.totalPts || mr.total || 0
        });
      } else {
        matchBreakdown.push({ matchNumber: i, placement: null, kills: null, totalPts: null });
      }
    }
  }

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
              <div key={m.matchNumber || m.id} className="card" style={{
                background: 'var(--bg-secondary)', padding: 'var(--space-4)',
                marginBottom: 'var(--space-3)', borderColor: 'rgba(0,255,136,0.2)'
              }}>
                <div className="flex justify-between items-center">
                  <h5>Match {m.matchNumber || m.match_number}</h5>
                  <span className="badge badge-success">🔓 Released</span>
                </div>
                <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <div className="form-label">Room ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--accent-orange)' }}>
                      {m.roomId || m.room_id || '—'}
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
                  const rid = m.roomId || m.room_id || '';
                  const pwd = m.password || '';
                  copyToClipboard(`Room ID: ${rid} | Pass: ${pwd}`);
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
                  {teamStanding.totalPoints || teamStanding.totalPts}
                </div>
                <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Total Points</div>
              </div>
            </div>

            {/* Match Breakdown */}
            {matchBreakdown.length > 0 && (
              <div className="mt-4">
                {matchBreakdown.map((mr, i) => (
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
            )}
          </div>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="card animate-slideUp delay-3">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>📢 Announcements</h4>
            {announcements.map(a => (
              <div key={a.id} style={{
                padding: 'var(--space-3)',
                borderBottom: '1px solid var(--border-default)'
              }}>
                <p>{a.text}</p>
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>{timeAgo(a.created_at)}</span>
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
