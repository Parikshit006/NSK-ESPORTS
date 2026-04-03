import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTournamentBySlug } from '../services/dataService';

export default function RulesPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    setTournament(getTournamentBySlug(slug));
  }, [slug]);

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Tournament not found</h2></div></div>;
  }

  const rules = tournament.rules || [];

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="page-header">
          <h1 className="page-title gradient-text">Tournament Rules</h1>
          <p className="page-subtitle">{tournament.basicInfo?.name}</p>
        </div>

        <div className="flex flex-col gap-4">
          {rules.map((rule, i) => (
            <div key={i} className="card card-glow animate-slideUp" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex gap-4 items-start">
                <div style={{
                  width: 40, height: 40, minWidth: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-orange-dark))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-lg)'
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.6, paddingTop: 8 }}>{rule}</p>
              </div>
            </div>
          ))}
        </div>

        {rules.length === 0 && (
          <div className="card text-center" style={{ padding: 'var(--space-12)' }}>
            <p className="muted-text">No rules configured for this tournament.</p>
          </div>
        )}

        <div className="card text-center mt-8" style={{
          background: 'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(0,207,255,0.04))',
          borderColor: 'var(--accent-orange)'
        }}>
          <p style={{ fontSize: 'var(--text-lg)' }}>
            ⚠️ By joining, you agree to all rules. Good luck! 🔥
          </p>
        </div>
      </div>
    </div>
  );
}
