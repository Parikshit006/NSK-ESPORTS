/**
 * NSK ESPORTS — OCR Scoreboard Upload & Verification Modal
 *
 * Implements a high-precision, administrator-guided workflow:
 * 1. Upload screenshot via Drag-and-Drop, File Browser, or Clipboard Paste (Ctrl+V).
 * 2. Processes two-panel Free Fire MAX layout through `freeFireOcrEngine`.
 * 3. Side-by-side inspection: Original screenshot on left, editable draft table on right.
 * 4. Administrator verifies team mappings, player kills, and squad placements.
 * 5. Applies verified draft to tournament match results (with strict regression safety).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { runFreeFireOcr } from './freeFireOcrEngine.js';
import { calculateMatchPoints } from '../../../utils/scoring.js';

// Pre-packaged base64 or sample image URL for testing / demonstration
const SAMPLE_SCOREBOARD_URL = '/sample-scoreboard.png';

export default function OcrUploadModal({
  isOpen,
  onClose,
  tournament,
  selectedMatch,
  scoring,
  onApplyResults
}) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [ocrResults, setOcrResults] = useState(null);
  const [error, setError] = useState(null);
  const [zoomImage, setZoomImage] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  const confirmedTeams = (tournament?.teams || []).filter(
    t => t.status === 'confirmed' || t.status === 'disqualified'
  );

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setImageFile(null);
      setImagePreview(null);
      setProcessing(false);
      setProgress({ percent: 0, message: '' });
      setOcrResults(null);
      setError(null);
      setDuplicateWarning(null);
    }
  }, [isOpen]);

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid screenshot image (.png, .jpg, .webp).');
      return;
    }
    setError(null);
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    startOcrProcessing(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const startOcrProcessing = async (source) => {
    setProcessing(true);
    setError(null);
    setProgress({ percent: 5, message: 'Initializing OCR engine...' });

    try {
      const parsedSquads = await runFreeFireOcr(
        source,
        confirmedTeams,
        ({ percent, message }) => {
          setProgress({ percent, message });
        }
      );

      setOcrResults(parsedSquads);
      checkDuplicates(parsedSquads);
    } catch (err) {
      console.error('OCR Processing error:', err);
      setError(`Failed to read scoreboard: ${err.message || 'Unknown OCR error'}. You can still enter results manually or try another screenshot.`);
    } finally {
      setProcessing(false);
    }
  };

  // Check for duplicate teams or duplicate placements
  const checkDuplicates = (squads) => {
    const teamCounts = {};
    const placementCounts = {};
    const warnings = [];

    squads.forEach(s => {
      if (s.teamId) {
        teamCounts[s.teamId] = (teamCounts[s.teamId] || 0) + 1;
      }
      placementCounts[s.placement] = (placementCounts[s.placement] || 0) + 1;
    });

    Object.entries(teamCounts).forEach(([teamId, count]) => {
      if (count > 1) {
        const team = confirmedTeams.find(t => t.id === teamId);
        warnings.push(`Team "${team?.teamName || teamId}" is mapped to multiple placements.`);
      }
    });

    Object.entries(placementCounts).forEach(([placement, count]) => {
      if (count > 1) {
        warnings.push(`Placement #${placement} is assigned to multiple rows.`);
      }
    });

    setDuplicateWarning(warnings.length > 0 ? warnings : null);
  };

  // Row update handlers
  const updateSquadField = (index, field, value) => {
    setOcrResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      checkDuplicates(updated);
      return updated;
    });
  };

  const handleTeamChange = (index, teamId) => {
    const selected = confirmedTeams.find(t => t.id === teamId);
    setOcrResults(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        teamId: selected ? selected.id : '',
        teamName: selected ? selected.teamName : '',
        slotNumber: selected ? selected.slotNumber : null,
        confidence: selected ? 'high' : 'none'
      };
      checkDuplicates(updated);
      return updated;
    });
  };

  const updatePlayerKill = (squadIndex, playerIndex, value) => {
    const val = parseInt(value, 10);
    const kills = isNaN(val) ? 0 : Math.max(0, val);

    setOcrResults(prev => {
      const updated = [...prev];
      const squad = { ...updated[squadIndex] };
      const players = [...squad.players];
      players[playerIndex] = { ...players[playerIndex], kills };

      // Re-sum total kills from players unless manually decoupled
      const newTotalKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);

      squad.players = players;
      squad.totalKills = newTotalKills;
      squad.killsOverridden = false;
      updated[squadIndex] = squad;
      return updated;
    });
  };

  const updateSquadTotalKills = (squadIndex, value) => {
    const val = parseInt(value, 10);
    const kills = isNaN(val) ? 0 : Math.max(0, val);

    setOcrResults(prev => {
      const updated = [...prev];
      updated[squadIndex] = {
        ...updated[squadIndex],
        totalKills: kills,
        killsOverridden: true
      };
      return updated;
    });
  };

  const removeSquadRow = (index) => {
    setOcrResults(prev => {
      const updated = prev.filter((_, i) => i !== index);
      checkDuplicates(updated);
      return updated;
    });
  };

  const addSquadRow = () => {
    setOcrResults(prev => {
      const nextPlacement = prev.length + 1;
      const updated = [
        ...prev,
        {
          placement: nextPlacement,
          teamId: '',
          teamName: '',
          confidence: 'none',
          totalKills: 0,
          players: [],
          warnings: []
        }
      ];
      checkDuplicates(updated);
      return updated;
    });
  };

  const handleApply = () => {
    if (!ocrResults || ocrResults.length === 0) {
      setError('No parsed results to apply.');
      return;
    }

    // Filter to squads that have a team mapped
    const mappedSquads = ocrResults.filter(s => s.teamId);
    if (mappedSquads.length === 0) {
      setError('Please map at least one squad to a registered team before applying.');
      return;
    }

    // Pass to parent component
    onApplyResults(ocrResults);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="card"
        style={{
          width: '95vw',
          maxWidth: '1280px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>
                OCR Scoreboard Scanner — Match {selectedMatch}
              </h3>
              <span className="badge badge-info" style={{ fontSize: '11px' }}>
                AI Assistant
              </span>
            </div>
            <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)' }}>
              Upload Free Fire MAX results screenshot. Scores will be reviewed before applying.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            title="Close"
            style={{ fontSize: '1.2rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          {/* UPLOAD ZONE (when no image is being reviewed or want to re-upload) */}
          {!imagePreview && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-accent)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-12) var(--space-6)',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 107, 0, 0.03)',
                transition: 'var(--transition-base)'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>📸</div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Drop Free Fire MAX Scoreboard Screenshot Here</h4>
              <p className="muted-text" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                Drag & drop image, click to browse, or press <kbd style={{ padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-default)' }}>Ctrl + V</kbd> to paste
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  📁 Select Screenshot File
                </button>
              </div>
            </div>
          )}

          {/* PROGRESS BAR */}
          {processing && (
            <div className="card mb-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent-orange)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  ⏳ {progress.message || 'Analyzing Scoreboard...'}
                </span>
                <span className="accent-text" style={{ fontWeight: 700 }}>
                  {progress.percent}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--bg-dark)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress.percent}%`,
                    background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-cyan))',
                    transition: 'width 250ms ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {error && (
            <div
              className="card mb-6"
              style={{
                background: 'var(--color-danger-bg)',
                borderColor: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: 'var(--text-sm)' }}>
                ⚠️ {error}
              </p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* DUPLICATE WARNING */}
          {duplicateWarning && (
            <div
              className="card mb-4"
              style={{
                background: 'var(--color-warning-bg)',
                borderColor: 'var(--color-warning)',
                padding: 'var(--space-3) var(--space-4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span>⚠️</span>
                <strong style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)' }}>
                  Attention: Review potential duplicate assignments:
                </strong>
              </div>
              <ul style={{ margin: '4px 0 0 var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {duplicateWarning.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SIDE-BY-SIDE REVIEW WORKSPACE */}
          {imagePreview && ocrResults && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: zoomImage ? '1fr' : 'minmax(340px, 420px) 1fr',
                gap: 'var(--space-6)',
                alignItems: 'start'
              }}
            >
              {/* LEFT PANE: SCREENSHOT INSPECTOR */}
              <div
                className="card"
                style={{
                  position: zoomImage ? 'static' : 'sticky',
                  top: 0,
                  padding: 'var(--space-4)',
                  background: 'var(--bg-secondary)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-3)'
                  }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    🖼️ Scoreboard Reference
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setZoomImage(!zoomImage)}
                      title={zoomImage ? 'Split view' : 'Enlarge image'}
                    >
                      {zoomImage ? '🗗 Split View' : '🔍 Enlarge'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload different screenshot"
                    >
                      🔄 Re-upload
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    background: '#000',
                    maxHeight: zoomImage ? '600px' : '480px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Free Fire Scoreboard"
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </div>

                <p className="muted-text" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                  Cross-check the extracted values with the screenshot before applying.
                </p>
              </div>

              {/* RIGHT PANE: EDITABLE VERIFICATION TABLE */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-4)'
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>Review & Correct Extracted Placements</h4>
                    <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                      Total {ocrResults.length} squad rows detected. Map each squad to a tournament team.
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={addSquadRow}
                    style={{ fontSize: 'var(--text-xs)' }}
                  >
                    ➕ Add Placement Row
                  </button>
                </div>

                <div className="table-container" style={{ border: '1px solid var(--border-default)' }}>
                  <table className="table" style={{ fontSize: 'var(--text-sm)' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Rank</th>
                        <th>Tournament Team</th>
                        <th>Player Breakdown (Kills)</th>
                        <th style={{ width: 90 }}>Total Kills</th>
                        <th style={{ width: 110 }}>Points</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrResults.map((squad, sIndex) => {
                        const preview = squad.placement && squad.teamId
                          ? calculateMatchPoints(squad.placement, squad.totalKills, scoring)
                          : null;

                        return (
                          <tr
                            key={sIndex}
                            style={{
                              backgroundColor: !squad.teamId
                                ? 'rgba(255, 51, 51, 0.05)'
                                : squad.confidence === 'high'
                                ? 'rgba(0, 255, 136, 0.02)'
                                : 'transparent'
                            }}
                          >
                            {/* Placement */}
                            <td className="rank-cell">
                              <input
                                type="number"
                                min={1}
                                max={24}
                                className="form-input"
                                style={{ width: '54px', padding: '4px', textAlign: 'center' }}
                                value={squad.placement || ''}
                                onChange={(e) =>
                                  updateSquadField(sIndex, 'placement', parseInt(e.target.value, 10) || 0)
                                }
                              />
                            </td>

                            {/* Team Selection */}
                            <td style={{ minWidth: '180px' }}>
                              <select
                                className="form-select"
                                style={{
                                  padding: '6px 8px',
                                  fontSize: 'var(--text-sm)',
                                  borderColor: !squad.teamId
                                    ? 'var(--color-danger)'
                                    : squad.confidence === 'high'
                                    ? 'var(--color-success)'
                                    : 'var(--border-default)'
                                }}
                                value={squad.teamId || ''}
                                onChange={(e) => handleTeamChange(sIndex, e.target.value)}
                              >
                                <option value="">-- Select Team --</option>
                                {confirmedTeams.map(t => (
                                  <option key={t.id} value={t.id}>
                                    #{t.slotNumber} {t.teamName}
                                  </option>
                                ))}
                              </select>

                              {/* Confidence Tag & Candidates */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                {squad.teamId ? (
                                  <span
                                    className={`badge ${
                                      squad.confidence === 'high'
                                        ? 'badge-success'
                                        : squad.confidence === 'medium'
                                        ? 'badge-warning'
                                        : 'badge-danger'
                                    }`}
                                    style={{ fontSize: '10px', padding: '1px 6px' }}
                                  >
                                    {squad.confidence === 'high' ? '🟢 Confirmed Match' : squad.confidence === 'medium' ? '🟡 Likely Match' : '🟠 Low Match'}
                                  </span>
                                ) : (
                                  <span className="badge badge-danger" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                    🔴 Select Team
                                  </span>
                                )}

                                {squad.matchedCount > 0 && (
                                  <span className="muted-text" style={{ fontSize: '10px' }}>
                                    ({squad.matchedCount} IGNs matched)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Player Breakdown */}
                            <td style={{ minWidth: '220px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {squad.players.map((p, pIndex) => (
                                  <div
                                    key={pIndex}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '11px'
                                    }}
                                  >
                                    <input
                                      type="number"
                                      min={0}
                                      max={50}
                                      style={{
                                        width: '38px',
                                        height: '22px',
                                        padding: '0 4px',
                                        background: 'var(--bg-dark)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '3px',
                                        textAlign: 'center',
                                        color: 'var(--text-primary)',
                                        fontSize: '11px'
                                      }}
                                      value={p.kills ?? ''}
                                      onChange={(e) =>
                                        updatePlayerKill(sIndex, pIndex, e.target.value)
                                      }
                                    />
                                    <span
                                      className="muted-text"
                                      title={p.rawIGN}
                                      style={{
                                        maxWidth: '140px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {p.rawIGN}
                                    </span>
                                  </div>
                                ))}

                                {squad.warnings.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: 'var(--color-warning)',
                                      marginTop: '2px'
                                    }}
                                  >
                                    ⚠️ {squad.warnings[0]}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Total Kills */}
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="form-input"
                                style={{
                                  width: '64px',
                                  padding: '4px',
                                  textAlign: 'center',
                                  borderColor: squad.killsOverridden ? 'var(--accent-orange)' : undefined
                                }}
                                title={squad.killsOverridden ? 'Manually modified' : 'Sum of player kills'}
                                value={squad.totalKills ?? 0}
                                onChange={(e) => updateSquadTotalKills(sIndex, e.target.value)}
                              />
                            </td>

                            {/* Live Points Preview */}
                            <td>
                              {preview ? (
                                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)' }}>
                                  <span className="cyan-text">{preview.placementPts}PP</span>
                                  {' + '}
                                  <span className="accent-text">{preview.killPts}KP</span>
                                  {' = '}
                                  <strong style={{ color: '#fff' }}>{preview.totalPts}</strong>
                                </span>
                              ) : (
                                <span className="muted-text">—</span>
                              )}
                            </td>

                            {/* Row Delete */}
                            <td>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ padding: '2px 6px', opacity: 0.6 }}
                                onClick={() => removeSquadRow(sIndex)}
                                title="Remove row"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
            {ocrResults
              ? `${ocrResults.filter(s => s.teamId).length} of ${ocrResults.length} squads assigned to teams`
              : 'Upload a match screenshot to begin'}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>

            {ocrResults && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApply}
                disabled={processing || ocrResults.filter(s => s.teamId).length === 0}
              >
                ✅ Apply to Match Entry ({ocrResults.filter(s => s.teamId).length} Teams)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
