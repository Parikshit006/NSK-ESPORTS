import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournamentBySlug } from '../services/dataService';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { getScoringConfig } from '../utils/scoring';
import { copyToClipboard, openWhatsApp, timeAgo } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';
import ResultsTemplate from '../components/leaderboard/ResultsTemplate';

export default function LeaderboardPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const tableRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const t = await getTournamentBySlug(slug);
      setTournament(t);
    }
    load();
  }, [slug]);

  const { leaderboard: standings, loading, lastUpdated, refetch } = useLeaderboard(tournament?.id);

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Loading...</h2></div></div>;
  }

  const scoring = getScoringConfig(tournament);
  const numMatches = parseInt(tournament.schedule?.numMatches) || 0;
  const qualifierEnabled = tournament.qualifier?.enabled;
  const topN = parseInt(tournament.qualifier?.topN) || 0;

  // Convert leaderboard matchResults from object to array for table display
  const standingsForTable = standings.map(team => {
    const matchResultsArray = [];
    for (let i = 1; i <= numMatches; i++) {
      const mr = team.matchResults?.[i];
      if (mr) {
        matchResultsArray.push(mr);
      } else {
        matchResultsArray.push({ matchNumber: i, placement: null, kills: null, placementPts: null, killPts: null, totalPts: null });
      }
    }
    return { ...team, matchResults: matchResultsArray };
  });

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/tournament/${slug}/leaderboard`;
    const text = `🏆 ${tournament.basicInfo?.name} — Live Standings\n\n${url}`;
    openWhatsApp(text);
  };

  return (
    <div className={`page ${screenshotMode ? 'screenshot-mode' : ''}`} ref={tableRef}>
      <div className="container container-lg">
        <div className="page-header">
          <h1 className="page-title gradient-text" style={{ fontSize: 'var(--text-3xl)' }}>
            {tournament.basicInfo?.name}
          </h1>
          <p className="page-subtitle">
            {screenshotMode ? '' : (
              <>
                {numMatches} Maps Total
                {lastUpdated && ` • Updated ${timeAgo(lastUpdated.toISOString())}`}
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        {!screenshotMode && (
          <div className="flex gap-2 justify-center mb-6 no-screenshot" style={{ flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden',
              border: '1px solid var(--border-default)'
            }}>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
                style={{ borderRadius: 0, border: 'none' }}
              >
                📊 Table
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'template' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('template')}
                style={{ borderRadius: 0, border: 'none' }}
              >
                🏆 Results Card
              </button>
            </div>

            <button className="btn btn-ghost btn-sm" onClick={() => setScreenshotMode(true)}>
              📸 Screenshot Mode
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleShareWhatsApp}>
              📤 Share WhatsApp
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              refetch();
              toast.success('Leaderboard refreshed!');
            }}>
              🔄 Refresh
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLegend(!showLegend)}>
              📊 {showLegend ? 'Hide' : 'Show'} Scoring
            </button>
          </div>
        )}

        {screenshotMode && (
          <button className="btn btn-primary btn-sm no-screenshot" onClick={() => setScreenshotMode(false)}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 999 }}>
            ✕ Exit Screenshot Mode
          </button>
        )}

        {/* Scoring Legend */}
        {showLegend && !screenshotMode && (
          <div className="card mb-6 animate-fadeIn">
            <h4 style={{ marginBottom: 'var(--space-3)' }}>📊 Scoring System — {tournament.scoring?.preset?.toUpperCase()}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              <div>
                <h5 className="muted-text" style={{ marginBottom: 'var(--space-2)' }}>Placement Points</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4, fontSize: 'var(--text-sm)' }}>
                  {Object.entries(scoring.placementPoints || {}).map(([pos, pts]) => (
                    <div key={pos}>
                      <span className="muted-text">#{pos}:</span> <span className="accent-text">{pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="muted-text" style={{ marginBottom: 'var(--space-2)' }}>Kill Points</h5>
                <p>{scoring.killPointValue || 1} per kill {scoring.killCap ? `(cap: ${scoring.killCap})` : '(no cap)'}</p>
              </div>
              <div>
                <h5 className="muted-text" style={{ marginBottom: 'var(--space-2)' }}>Tiebreaker</h5>
                <p>{scoring.tiebreaker?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* ====== TEMPLATE VIEW ====== */}
        {viewMode === 'template' && (
          <ResultsTemplate tournament={tournament} toast={toast} />
        )}

        {/* ====== TABLE VIEW ====== */}
        {viewMode === 'table' && (
          <>
            {standingsForTable.length === 0 ? (
              <div className="card text-center" style={{ padding: 'var(--space-12)' }}>
                <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>📊</div>
                <h3>No Results Yet</h3>
                <p className="muted-text mt-2">The leaderboard will update once match results are published.</p>
              </div>
            ) : (
              <div className="table-container" style={{
                borderColor: screenshotMode ? 'var(--accent-orange)' : undefined,
              }}>
                {screenshotMode && (
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))',
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    borderBottom: '2px solid var(--accent-orange)'
                  }}>
                    <h3 className="gradient-text" style={{ margin: 0 }}>
                      🏆 {tournament.basicInfo?.name} — STANDINGS
                    </h3>
                    <p className="muted-text" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                      {tournament.basicInfo?.organizer}
                    </p>
                  </div>
                )}

                <table className="table">
                  <thead>
                    <tr>
                      <th className="sticky-col sticky-col-rank" style={{ textAlign: 'center' }}>Rank</th>
                      <th className="sticky-col sticky-col-team">Team Name</th>
                      {Array.from({ length: numMatches }, (_, i) => (
                        <th key={i} style={{ textAlign: 'center' }}>M{i + 1}</th>
                      ))}
                      <th style={{ textAlign: 'center' }}>Total Kills</th>
                      <th style={{ textAlign: 'center' }}>Total Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsForTable.map((team) => {
                      const isQualified = qualifierEnabled && team.rank > 0 && team.rank <= topN;
                      const isDQ = team.status === 'disqualified';
                      const rankClass = isDQ ? 'dq' : team.rank === 1 ? 'rank-1' : team.rank === 2 ? 'rank-2' : team.rank === 3 ? 'rank-3' : '';

                      return (
                        <tr key={team.teamId || team.id} className={rankClass}>
                          <td className="rank-cell sticky-col sticky-col-rank">
                            {isDQ ? (
                              <span className="badge badge-danger">DQ</span>
                            ) : (
                              <span style={{
                                color: team.rank === 1 ? 'var(--rank-gold)' : team.rank === 2 ? 'var(--rank-silver)' : team.rank === 3 ? 'var(--rank-bronze)' : 'inherit',
                                textShadow: team.rank <= 3 ? `0 0 10px currentColor` : 'none',
                              }}>
                                {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `#${team.rank}`}
                              </span>
                            )}
                          </td>
                          <td className="team-cell sticky-col sticky-col-team">
                            <div>
                              {team.teamName}
                              {isQualified && <span className="badge badge-qualified" style={{ marginLeft: 8, fontSize: '9px' }}>⭐ QUALIFIED</span>}
                              {isDQ && <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: '9px' }}>DISQUALIFIED</span>}
                            </div>
                          </td>
                          {team.matchResults.map((mr, j) => (
                            <td key={j} className="match-cell">
                              {mr.kills !== null ? (
                                <div>
                                  <span style={{ color: 'var(--accent-orange)' }}>{mr.kills}K</span>
                                  <span style={{ color: 'var(--text-muted)' }}> + </span>
                                  <span style={{ color: 'var(--accent-cyan)' }}>{mr.placementPts}P</span>
                                  <div style={{ fontWeight: 700, marginTop: 2 }}>{mr.totalPts}</div>
                                </div>
                              ) : (
                                <span className="muted-text">—</span>
                              )}
                            </td>
                          ))}
                          <td className="total-cell" style={{ color: 'var(--accent-cyan)' }}>
                            {team.totalKills}
                          </td>
                          <td className="total-cell">
                            {team.totalPoints}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {screenshotMode && (
              <div className="text-center mt-4" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                {tournament.basicInfo?.organizer} • {tournament.basicInfo?.name}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
