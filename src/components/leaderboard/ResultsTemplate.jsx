import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import { buildLeaderboard, getScoringConfig } from '../../utils/scoring';

/**
 * PICT Cup Style Results Template
 * Renders the leaderboard in the exact style of the PICT Cup point table template.
 * Designed to be screenshot-friendly for WhatsApp sharing.
 * Supports Export as PNG image.
 */
export default function ResultsTemplate({ tournament, toast }) {
  const templateRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const standings = buildLeaderboard(tournament);
  const scoring = getScoringConfig(tournament);
  const numMatches = parseInt(tournament.schedule?.numMatches) || 0;
  const publishedMatches = (tournament.matches || []).filter(m => m.published);

  if (standings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
        No results to display yet. Publish match results first.
      </div>
    );
  }

  // Rank sorted standings (exclude DQ from display or show at bottom)
  const activeStandings = standings.filter(s => s.status !== 'disqualified');

  const handleExportPNG = async () => {
    if (!templateRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(templateRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2, // 2x for sharper image
        useCORS: true,
        logging: false,
        // Ensure proper rendering
        onclone: (doc) => {
          const el = doc.querySelector('.results-template');
          if (el) {
            el.style.borderRadius = '0';
          }
        }
      });

      // Download
      const link = document.createElement('a');
      link.download = `${tournament.basicInfo?.name || 'results'}_standings.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      if (toast) toast.success('Results image downloaded! 📸');
    } catch (err) {
      console.error('Export failed:', err);
      if (toast) toast.error('Export failed. Try screenshot instead.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(templateRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          if (toast) toast.success('Image copied to clipboard! 📋');
        } catch {
          // Fallback: just download
          handleExportPNG();
        }
        setExporting(false);
      }, 'image/png');
    } catch (err) {
      console.error('Copy failed:', err);
      setExporting(false);
      if (toast) toast.error('Copy failed. Try download instead.');
    }
  };

  return (
    <div className="results-template-wrapper">
      {/* Export Buttons */}
      <div className="flex gap-2 justify-center mb-4" style={{ flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleExportPNG}
          disabled={exporting}
        >
          {exporting ? '⏳ Exporting...' : '📥 Download as PNG'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCopyImage}
          disabled={exporting}
        >
          📋 Copy to Clipboard
        </button>
      </div>

      {/* The actual template — this div gets captured */}
      <div ref={templateRef} className="results-template">
        {/* Dark textured background */}
        <div className="rt-background" />

        {/* Tournament Badge */}
        <div className="rt-badge">
          <img src="/ff-logo.webp" alt="Free Fire Max" className="rt-badge-logo" />
          <div className="rt-badge-title">
            {tournament.basicInfo?.name || 'TOURNAMENT'}
          </div>
          <div className="rt-badge-subtitle">
            {tournament.basicInfo?.organizer || ''} {tournament.schedule?.date ? `• ${new Date(tournament.schedule.date).getFullYear()}` : ''}
          </div>
        </div>

        {/* Results Table */}
        <div className="rt-table-container">
          <table className="rt-table">
            <thead>
              <tr>
                <th className="rt-th rt-th-rank">#</th>
                <th className="rt-th rt-th-team">TEAM NAME</th>
                <th className="rt-th">KILL PTS</th>
                <th className="rt-th">PLACEMENT PTS</th>
                {publishedMatches.map(m => (
                  <th key={m.matchNumber} className="rt-th">MAP {m.matchNumber}</th>
                ))}
                <th className="rt-th rt-th-total">TOTAL POINTS</th>
              </tr>
            </thead>
            <tbody>
              {activeStandings.map((team, idx) => {
                // Aggregate kill pts and placement pts
                let totalKillPts = 0;
                let totalPlacementPts = 0;
                const matchTotals = [];

                for (const mr of team.matchResults) {
                  if (mr.kills !== null) {
                    totalKillPts += mr.killPts || 0;
                    totalPlacementPts += mr.placementPts || 0;
                  }
                }

                // Get per-map totals for published matches only
                publishedMatches.forEach(pm => {
                  const mr = team.matchResults.find(r => r.matchNumber === pm.matchNumber);
                  matchTotals.push(mr?.totalPts ?? '—');
                });

                const rowClass = team.rank === 1 ? 'rt-row-gold'
                  : team.rank === 2 ? 'rt-row-silver'
                  : team.rank === 3 ? 'rt-row-bronze'
                  : idx % 2 === 0 ? 'rt-row-even' : 'rt-row-odd';

                return (
                  <tr key={team.teamId} className={`rt-row ${rowClass}`}>
                    <td className="rt-td rt-td-rank">
                      {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                    </td>
                    <td className="rt-td rt-td-team">{team.teamName}</td>
                    <td className="rt-td">{totalKillPts}</td>
                    <td className="rt-td">{totalPlacementPts}</td>
                    {matchTotals.map((mt, i) => (
                      <td key={i} className="rt-td">{mt}</td>
                    ))}
                    <td className="rt-td rt-td-total">{team.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="rt-footer">
          <span>{tournament.basicInfo?.organizer || 'Tournament Organizer'}</span>
          <span>•</span>
          <span>{tournament.basicInfo?.name}</span>
        </div>
      </div>
    </div>
  );
}
