import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllTournaments, deleteTournament, updateTournamentStatus } from '../../services/dataService';
import { formatDate, STATUS_CONFIG } from '../../utils/helpers';
import { useToast } from '../../contexts/ToastContext';

export default function AdminDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadTournaments = async () => {
    try {
      const data = await getAllTournaments();
      setTournaments(data);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleDelete = async (id, name) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      try {
        await deleteTournament(id);
        await loadTournaments();
        toast.success('Tournament deleted');
      } catch (err) {
        toast.error(err.message || 'Failed to delete tournament');
      }
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTournamentStatus(id, status);
      await loadTournaments();
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="flex justify-between items-center mb-8" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="page-title" style={{ textAlign: 'left' }}>⚡ My Tournaments</h1>
            <p className="muted-text">Manage your tournaments</p>
          </div>
          <Link to="/admin/create" className="btn btn-primary btn-lg">
            ➕ Create Tournament
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="card text-center" style={{ padding: 'var(--space-16)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>🎮</div>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>No Tournaments Yet</h3>
            <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>
              Create your first tournament to get started!
            </p>
            <Link to="/admin/create" className="btn btn-primary">
              🚀 Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tournaments.map(t => {
              const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
              const filledSlots = parseInt(t.slots?.filled) || 0;
              const totalSlots = parseInt(t.slots?.total) || 0;

              return (
                <div key={t.id} className="card card-glow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 style={{ margin: 0 }}>{t.basicInfo?.name || 'Untitled'}</h3>
                      <span className={`badge ${statusConf.color}`}>{statusConf.label}</span>
                    </div>
                    <div className="flex gap-4 muted-text" style={{ fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
                      <span>🏫 {t.basicInfo?.organizer || '—'}</span>
                      <span>📅 {formatDate(t.schedule?.date)}</span>
                      <span>👥 {filledSlots}/{totalSlots} teams</span>
                      <span>🗺️ {t.schedule?.numMatches || 0} maps</span>
                    </div>
                  </div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <select
                      className="form-select"
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      style={{ width: 'auto', fontSize: 'var(--text-sm)' }}
                    >
                      <option value="draft">Draft</option>
                      <option value="registration_open">Reg. Open</option>
                      <option value="registration_closed">Reg. Closed</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <Link to={`/admin/tournament/${t.id}`} className="btn btn-primary btn-sm">
                      ⚙️ Manage
                    </Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id, t.basicInfo?.name)}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
