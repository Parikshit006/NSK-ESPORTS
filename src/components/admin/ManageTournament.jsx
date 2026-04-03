import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTournamentById, updateTournament, approveTeam, rejectTeam,
  disqualifyTeam, updateTeam, saveMatchResults, updateRoomInfo,
  toggleRoomRelease, addAnnouncement, deleteAnnouncement, lookupIGN, searchIGN
} from '../../services/dataService';
import { buildLeaderboard, calculateMatchPoints, getScoringConfig } from '../../utils/scoring';
import {
  formatDate, formatTime, formatCurrency, timeAgo, TEAM_STATUS_CONFIG,
  STATUS_CONFIG, generateApprovalMessage, generateResultsAnnouncement,
  generateRoomMessage, copyToClipboard, openWhatsApp
} from '../../utils/helpers';
import { useToast } from '../../contexts/ToastContext';
import ResultsTemplate from '../leaderboard/ResultsTemplate';

const TABS = [
  { key: 'overview', label: '📊 Overview', icon: '📊' },
  { key: 'teams', label: '👥 Teams', icon: '👥' },
  { key: 'results', label: '🎯 Results', icon: '🎯' },
  { key: 'rooms', label: '🚪 Rooms', icon: '🚪' },
  { key: 'announce', label: '📢 Announce', icon: '📢' },
  { key: 'export', label: '📤 Export', icon: '📤' },
];

export default function ManageTournament() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const toast = useToast();

  const reload = () => setTournament(getTournamentById(tournamentId));

  useEffect(() => { reload(); }, [tournamentId]);

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Tournament not found</h2></div></div>;
  }

  const confirmed = (tournament.teams || []).filter(t => t.status === 'confirmed');
  const pending = (tournament.teams || []).filter(t => t.status === 'pending');

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <Link to="/admin" className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>← Back to Dashboard</Link>
            <h2 style={{ marginTop: 'var(--space-2)' }}>{tournament.basicInfo?.name}</h2>
            <span className={`badge ${(STATUS_CONFIG[tournament.status] || {}).color}`}>
              {(STATUS_CONFIG[tournament.status] || {}).label}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const url = `${window.location.origin}/tournament/${tournament.slug}`;
              copyToClipboard(url);
              toast.success('Tournament link copied!');
            }}>🔗 Copy Link</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-sidebar" style={{
          position: 'relative', top: 0, height: 'auto', width: '100%',
          display: 'flex', overflowX: 'auto', gap: 'var(--space-1)',
          padding: 'var(--space-2)', marginBottom: 'var(--space-6)',
          borderRight: 'none', borderBottom: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)'
        }}>
          {TABS.map(tab => (
            <button key={tab.key}
              className={`admin-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ borderLeft: 'none', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab tournament={tournament} />}
        {activeTab === 'teams' && <TeamsTab tournament={tournament} reload={reload} toast={toast} />}
        {activeTab === 'results' && <ResultsTab tournament={tournament} reload={reload} toast={toast} />}
        {activeTab === 'rooms' && <RoomsTab tournament={tournament} reload={reload} toast={toast} />}
        {activeTab === 'announce' && <AnnouncementsTab tournament={tournament} reload={reload} toast={toast} />}
        {activeTab === 'export' && <ExportTab tournament={tournament} toast={toast} />}
      </div>
    </div>
  );
}

// ====== OVERVIEW TAB ======
function OverviewTab({ tournament }) {
  const confirmed = (tournament.teams || []).filter(t => t.status === 'confirmed').length;
  const pending = (tournament.teams || []).filter(t => t.status === 'pending').length;
  const published = (tournament.matches || []).filter(m => m.published).length;
  const total = parseInt(tournament.slots?.total) || 0;

  return (
    <div className="animate-fadeIn">
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-icon orange">👥</div>
          <div><div className="stat-value">{confirmed}/{total}</div><div className="stat-label">Teams Confirmed</div></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon cyan">⏳</div>
          <div><div className="stat-value">{pending}</div><div className="stat-label">Pending</div></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon green">🗺️</div>
          <div><div className="stat-value">{published}/{tournament.schedule?.numMatches || 0}</div><div className="stat-label">Matches Published</div></div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon orange">💰</div>
          <div><div className="stat-value">{formatCurrency(tournament.entry?.fee)}</div><div className="stat-label">Entry Fee</div></div>
        </div>
      </div>

      <div className="card mt-4">
        <h4 style={{ marginBottom: 'var(--space-4)' }}>Tournament Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
          <div><span className="muted-text">Organizer:</span> {tournament.basicInfo?.organizer}</div>
          <div><span className="muted-text">Date:</span> {formatDate(tournament.schedule?.date)}</div>
          <div><span className="muted-text">Match Start:</span> {formatTime(tournament.schedule?.matchStartTime)}</div>
          <div><span className="muted-text">Room Release:</span> {formatTime(tournament.schedule?.roomReleaseTime)}</div>
          <div><span className="muted-text">Maps:</span> {tournament.schedule?.numMatches}</div>
          <div><span className="muted-text">Scoring:</span> {tournament.scoring?.preset?.toUpperCase()}</div>
          <div><span className="muted-text">Tiebreaker:</span> {tournament.scoring?.tiebreaker?.replace(/_/g, ' ')}</div>
          <div>
            <span className="muted-text">Public Link:</span>{' '}
            <a href={`/tournament/${tournament.slug}`} target="_blank" rel="noopener noreferrer">
              /tournament/{tournament.slug}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== TEAMS TAB ======
function TeamsTab({ tournament, reload, toast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTeam, setViewTeam] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [dqReason, setDqReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [showDqModal, setShowDqModal] = useState(null);

  const teams = tournament.teams || [];
  const ignResults = searchQuery.trim() ? searchIGN(tournament.id, searchQuery) : [];

  const handleApprove = (teamId) => {
    try {
      const team = approveTeam(tournament.id, teamId);
      const msg = generateApprovalMessage(team, getTournamentById(tournament.id));
      copyToClipboard(msg);
      toast.success('Team approved! WhatsApp message copied 📋');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = () => {
    try {
      rejectTeam(tournament.id, showRejectModal, rejectReason);
      toast.success('Team rejected');
      setShowRejectModal(null);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDq = () => {
    try {
      disqualifyTeam(tournament.id, showDqModal, dqReason);
      toast.success('Team disqualified');
      setShowDqModal(null);
      setDqReason('');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* IGN Lookup */}
      <div className="card mb-6">
        <h4 style={{ marginBottom: 'var(--space-3)' }}>🔍 IGN Lookup</h4>
        <input className="form-input" placeholder="Search by IGN..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {ignResults.length > 0 && (
          <div className="mt-4">
            {ignResults.map((r, i) => (
              <div key={i} className="card" style={{
                marginTop: 'var(--space-2)', padding: 'var(--space-3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-secondary)'
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{r.player.ign}</span>
                  <span className="muted-text"> → </span>
                  <span className="accent-text" style={{ fontWeight: 700 }}>{r.teamName}</span>
                  {r.slotNumber && <span className="muted-text"> (Slot #{r.slotNumber})</span>}
                </div>
                <span className={`badge ${(TEAM_STATUS_CONFIG[r.status] || {}).color}`}>
                  {(TEAM_STATUS_CONFIG[r.status] || {}).label}
                </span>
              </div>
            ))}
          </div>
        )}
        {searchQuery.trim() && ignResults.length === 0 && (
          <p className="muted-text mt-2">No players found matching "{searchQuery}"</p>
        )}
      </div>

      {/* Team Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Team Name</th>
              <th>Leader</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No teams registered yet</td></tr>
            ) : (
              teams.map(team => {
                const sc = TEAM_STATUS_CONFIG[team.status] || {};
                return (
                  <tr key={team.id}>
                    <td className="rank-cell">{team.slotNumber || '—'}</td>
                    <td className="team-cell">{team.teamName}</td>
                    <td>{team.leaderName}</td>
                    <td>{team.leaderWhatsapp}</td>
                    <td><span className={`badge ${sc.color}`}>{sc.label}</span></td>
                    <td>
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewTeam(team)}>👁️</button>
                        {team.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(team.id)}>✅</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(team.id)}>❌</button>
                          </>
                        )}
                        {team.status === 'confirmed' && (
                          <button className="btn btn-danger btn-sm" onClick={() => setShowDqModal(team.id)}>🚫 DQ</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Team Modal */}
      {viewTeam && (
        <div className="modal-backdrop" onClick={() => setViewTeam(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>📋 {viewTeam.teamName}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewTeam(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="mb-4">
                <span className={`badge ${(TEAM_STATUS_CONFIG[viewTeam.status] || {}).color}`}>
                  {(TEAM_STATUS_CONFIG[viewTeam.status] || {}).label}
                </span>
                {viewTeam.slotNumber && <span className="badge badge-orange" style={{ marginLeft: 8 }}>Slot #{viewTeam.slotNumber}</span>}
              </div>
              <p><strong>Leader:</strong> {viewTeam.leaderName}</p>
              <p><strong>WhatsApp:</strong> {viewTeam.leaderWhatsapp}</p>
              {viewTeam.college && <p><strong>College:</strong> {viewTeam.college}</p>}

              <h4 className="mt-4 mb-2">Players</h4>
              {(viewTeam.players || []).map((p, i) => (
                <div key={i} className="card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)', background: 'var(--bg-secondary)' }}>
                  <div className="flex justify-between">
                    <div>
                      <span style={{ fontWeight: 600 }}>{p.ign}</span>
                      <span className="muted-text"> — UID: {p.uid}</span>
                    </div>
                    <span className="badge badge-info">{p.role || 'Member'}</span>
                  </div>
                </div>
              ))}

              {viewTeam.payment?.transactionId && (
                <>
                  <h4 className="mt-4 mb-2">Payment</h4>
                  <p><strong>Transaction ID:</strong> {viewTeam.payment.transactionId}</p>
                  {viewTeam.payment.screenshotData && (
                    <img src={viewTeam.payment.screenshotData} alt="Payment screenshot"
                      style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-2)' }} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-backdrop" onClick={() => setShowRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>❌ Reject Team</h3></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Rejection Reason</label>
                <textarea className="form-textarea" value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid payment screenshot" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* DQ Modal */}
      {showDqModal && (
        <div className="modal-backdrop" onClick={() => setShowDqModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>🚫 Disqualify Team</h3></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">DQ Reason</label>
                <textarea className="form-textarea" value={dqReason}
                  onChange={e => setDqReason(e.target.value)}
                  placeholder="e.g. Using hacks / emulator" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDqModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDq}>Disqualify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====== RESULTS TAB ======
function ResultsTab({ tournament, reload, toast }) {
  const [selectedMatch, setSelectedMatch] = useState(1);
  const [results, setResults] = useState({});
  const [mode, setMode] = useState('team'); // team or ign

  const scoring = getScoringConfig(tournament);
  const confirmedTeams = (tournament.teams || []).filter(t => t.status === 'confirmed' || t.status === 'disqualified');
  const match = (tournament.matches || []).find(m => m.matchNumber === selectedMatch);

  useEffect(() => {
    // Load existing results
    if (match?.results?.length > 0) {
      const r = {};
      match.results.forEach(res => {
        r[res.teamId] = { placement: res.placement, kills: res.kills };
      });
      setResults(r);
    } else {
      setResults({});
    }
  }, [selectedMatch, tournament]);

  const updateResult = (teamId, field, value) => {
    setResults(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: parseInt(value) || 0 },
    }));
  };

  const getPreview = (teamId) => {
    const r = results[teamId];
    if (!r || !r.placement) return null;
    return calculateMatchPoints(r.placement, r.kills || 0, scoring);
  };

  const handlePublish = () => {
    const resultArray = Object.entries(results).map(([teamId, data]) => {
      const pts = calculateMatchPoints(data.placement || 0, data.kills || 0, scoring);
      return {
        teamId,
        placement: data.placement || 0,
        kills: data.kills || 0,
        placementPts: pts.placementPts,
        killPts: pts.killPts,
        totalPts: pts.totalPts,
      };
    }).filter(r => r.placement > 0);

    if (resultArray.length === 0) {
      toast.error('Enter at least one team result');
      return;
    }

    try {
      saveMatchResults(tournament.id, selectedMatch, resultArray);
      toast.success(`Match ${selectedMatch} results published! ✅`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Match Selector */}
      <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
        {(tournament.matches || []).map(m => (
          <button key={m.matchNumber}
            className={`btn ${selectedMatch === m.matchNumber ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setSelectedMatch(m.matchNumber)}>
            Map {m.matchNumber}
            {m.published && ' ✅'}
          </button>
        ))}
      </div>

      {match?.published && (
        <div className="card mb-4" style={{ borderColor: 'var(--color-success)', background: 'var(--color-success-bg)' }}>
          <p className="success-text">✅ Match {selectedMatch} results are published</p>
          <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
            Published {timeAgo(match.publishedAt)}. You can still edit and re-publish.
          </p>
        </div>
      )}

      {/* Team-wise Entry */}
      <div className="card">
        <h4 style={{ marginBottom: 'var(--space-4)' }}>🎯 Match {selectedMatch} — Enter Results</h4>

        {confirmedTeams.length === 0 ? (
          <p className="muted-text">No confirmed teams. Approve teams first.</p>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Team</th>
                    <th style={{ width: 120 }}>Placement</th>
                    <th style={{ width: 100 }}>Kills</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedTeams
                    .sort((a, b) => (a.slotNumber || 99) - (b.slotNumber || 99))
                    .map(team => {
                      const preview = getPreview(team.id);
                      return (
                        <tr key={team.id} className={team.status === 'disqualified' ? 'dq' : ''}>
                          <td className="rank-cell">#{team.slotNumber}</td>
                          <td className="team-cell">{team.teamName}</td>
                          <td>
                            <input type="number" className="form-input" min={1}
                              style={{ padding: 'var(--space-2)' }}
                              placeholder="Position"
                              value={results[team.id]?.placement || ''}
                              onChange={e => updateResult(team.id, 'placement', e.target.value)}
                              disabled={team.status === 'disqualified'} />
                          </td>
                          <td>
                            <input type="number" className="form-input" min={0}
                              style={{ padding: 'var(--space-2)' }}
                              placeholder="Kills"
                              value={results[team.id]?.kills || ''}
                              onChange={e => updateResult(team.id, 'kills', e.target.value)}
                              disabled={team.status === 'disqualified'} />
                          </td>
                          <td>
                            {preview ? (
                              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)' }}>
                                <span className="cyan-text">{preview.placementPts}PP</span>
                                {' + '}
                                <span className="accent-text">{preview.killPts}KP</span>
                                {' = '}
                                <span style={{ fontWeight: 700 }}>{preview.totalPts}</span>
                              </span>
                            ) : (
                              <span className="muted-text">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-6">
              <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
                {Object.values(results).filter(r => r.placement > 0).length} / {confirmedTeams.length} teams entered
              </div>
              <button className="btn btn-primary" onClick={handlePublish}>
                📢 {match?.published ? 'Update & Re-Publish' : 'Publish Results'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ====== ROOMS TAB ======
function RoomsTab({ tournament, reload, toast }) {
  const handleSaveRoom = (matchNumber, roomId, password) => {
    updateRoomInfo(tournament.id, matchNumber, roomId, password);
    reload();
    toast.success(`Room info saved for Match ${matchNumber}`);
  };

  const handleToggle = (matchNumber) => {
    const released = toggleRoomRelease(tournament.id, matchNumber);
    reload();
    toast.success(released ? `Room ${matchNumber} released to teams! 🚪` : `Room ${matchNumber} hidden`);
  };

  return (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>🚪 Room Management</h3>
      {(tournament.matches || []).map(match => (
        <RoomCard key={match.matchNumber} match={match}
          onSave={(rid, pwd) => handleSaveRoom(match.matchNumber, rid, pwd)}
          onToggle={() => handleToggle(match.matchNumber)}
          toast={toast}
        />
      ))}
    </div>
  );
}

function RoomCard({ match, onSave, onToggle, toast }) {
  const [roomId, setRoomId] = useState(match.roomId || '');
  const [password, setPassword] = useState(match.password || '');

  return (
    <div className="card mb-4" style={{
      borderColor: match.roomReleased ? 'rgba(0, 255, 136, 0.3)' : 'var(--border-default)'
    }}>
      <div className="flex justify-between items-center mb-4">
        <h4>Match {match.matchNumber}</h4>
        <span className={`badge ${match.roomReleased ? 'badge-success' : 'badge-warning'}`}>
          {match.roomReleased ? '🔓 Released' : '🔒 Hidden'}
        </span>
      </div>
      <div className="form-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Room ID</label>
          <input className="form-input" value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Enter Room ID" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Password</label>
          <input className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Password" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn btn-primary btn-sm" onClick={() => onSave(roomId, password)}>💾 Save</button>
        <button className={`btn ${match.roomReleased ? 'btn-danger' : 'btn-success'} btn-sm`}
          onClick={onToggle}>
          {match.roomReleased ? '🔒 Hide' : '🔓 Release to Teams'}
        </button>
        {match.roomId && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            copyToClipboard(generateRoomMessage(match));
            toast.success('Room info copied for WhatsApp!');
          }}>📋 Copy for WhatsApp</button>
        )}
      </div>
    </div>
  );
}

// ====== ANNOUNCEMENTS TAB ======
function AnnouncementsTab({ tournament, reload, toast }) {
  const [text, setText] = useState('');

  const handlePost = () => {
    if (!text.trim()) return;
    addAnnouncement(tournament.id, text.trim());
    setText('');
    reload();
    toast.success('Announcement posted! 📢');
  };

  const handleDelete = (id) => {
    deleteAnnouncement(tournament.id, id);
    reload();
    toast.success('Announcement deleted');
  };

  return (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-4)' }}>📢 Announcements</h3>

      <div className="card mb-6">
        <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
          <textarea className="form-textarea" value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your announcement here..." rows={3} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={handlePost}>📢 Post Announcement</button>
      </div>

      {(tournament.announcements || []).map(a => (
        <div key={a.id} className="card mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p>{a.text}</p>
            <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>{timeAgo(a.createdAt)}</span>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(a.id)}>🗑️</button>
        </div>
      ))}

      {(tournament.announcements || []).length === 0 && (
        <p className="muted-text text-center">No announcements yet</p>
      )}
    </div>
  );
}

// ====== EXPORT TAB ======
function ExportTab({ tournament, toast }) {
  const standings = buildLeaderboard(tournament);

  const handleCopyResults = () => {
    const msg = generateResultsAnnouncement(tournament, standings);
    copyToClipboard(msg);
    toast.success('Results copied to clipboard! 📋');
  };

  const handleShareWhatsApp = () => {
    const msg = generateResultsAnnouncement(tournament, standings);
    openWhatsApp(msg);
  };

  const handleExportCSV = () => {
    const matches = tournament.matches || [];
    let csv = 'Rank,Team Name,Slot';
    matches.forEach((_, i) => csv += `,Map${i + 1} Kills,Map${i + 1} Pts`);
    csv += ',Total Kills,Total Points\n';

    standings.forEach(team => {
      csv += `${team.rank},${team.teamName},${team.slotNumber}`;
      team.matchResults.forEach(mr => {
        csv += `,${mr.kills ?? ''},${mr.totalPts ?? ''}`;
      });
      csv += `,${team.totalKills},${team.totalPoints}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.basicInfo?.name || 'tournament'}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded! 📁');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/tournament/${tournament.slug}/leaderboard`;
    copyToClipboard(url);
    toast.success('Leaderboard link copied! 🔗');
  };

  return (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>📤 Export & Share</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card text-center" style={{ cursor: 'pointer' }} onClick={handleExportCSV}>
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>📊</div>
          <h4>Export CSV</h4>
          <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Download as spreadsheet</p>
        </div>

        <div className="card text-center" style={{ cursor: 'pointer' }} onClick={handleCopyResults}>
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>📋</div>
          <h4>Copy Results</h4>
          <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Auto-generated announcement</p>
        </div>

        <div className="card text-center" style={{ cursor: 'pointer' }} onClick={handleShareWhatsApp}>
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>📱</div>
          <h4>Share WhatsApp</h4>
          <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Send results via WhatsApp</p>
        </div>

        <div className="card text-center" style={{ cursor: 'pointer' }} onClick={handleCopyLink}>
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>🔗</div>
          <h4>Share Link</h4>
          <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>Copy leaderboard URL</p>
        </div>
      </div>

      {/* PICT Cup Style Results Card */}
      {standings.length > 0 && (
        <>
          <div className="mt-8 mb-4">
            <h3 style={{ marginBottom: 'var(--space-2)' }}>🏆 Results Card (Screenshot this!)</h3>
            <p className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
              This matches your point table template. Take a screenshot and share on WhatsApp/Instagram.
            </p>
          </div>
          <ResultsTemplate tournament={tournament} toast={toast} />

          {/* Preview the auto-generated text announcement */}
          <div className="card mt-6">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>📝 Preview Results Announcement</h4>
            <div style={{
              background: 'var(--bg-secondary)', padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap',
              fontFamily: 'monospace', fontSize: 'var(--text-sm)', lineHeight: 1.6
            }}>
              {generateResultsAnnouncement(tournament, standings)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
