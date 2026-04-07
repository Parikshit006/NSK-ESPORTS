import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournamentBySlug, getPublicTournaments } from '../services/dataService';
import { formatDate, formatTime, formatCurrency, getCountdown, STATUS_CONFIG } from '../utils/helpers';

export default function HomePage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (slug) {
          const t = await getTournamentBySlug(slug);
          setTournament(t);
        } else {
          const all = await getPublicTournaments();
          setTournaments(all);
        }
      } catch (err) {
        console.error('Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!tournament?.schedule?.matchStartTime || !tournament?.schedule?.date) return;
    const target = `${tournament.schedule.date}T${tournament.schedule.matchStartTime}`;
    const interval = setInterval(() => {
      setCountdown(getCountdown(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [tournament]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  // ====== TOURNAMENT LANDING PAGE ======
  if (slug && tournament) {
    const fee = parseInt(tournament.entry?.fee) || 0;
    const totalSlots = parseInt(tournament.slots?.total) || 0;
    const filledSlots = parseInt(tournament.slots?.filled) || 0;
    const remainingSlots = totalSlots - filledSlots;
    const prizes = tournament.prizes || [];
    const totalPrize = prizes.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);
    const isRegOpen = tournament.status === 'registration_open';

    return (
      <div>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-bg" />
          {tournament.basicInfo?.bannerUrl && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${tournament.basicInfo.bannerUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.15
            }} />
          )}
          <div className="hero-content animate-slideUp">
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
              {tournament.basicInfo?.organizer} PRESENTS
            </div>
            <h1 className="hero-title gradient-text">{tournament.basicInfo?.name}</h1>
            {tournament.basicInfo?.tagline && (
              <p className="hero-tagline">{tournament.basicInfo.tagline}</p>
            )}

            {/* Countdown */}
            {!countdown.expired && (
              <div className="countdown mb-8">
                <div className="countdown-item">
                  <span className="countdown-value">{String(countdown.days).padStart(2, '0')}</span>
                  <span className="countdown-label">Days</span>
                </div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">Hours</span>
                </div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">Min</span>
                </div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">Sec</span>
                </div>
              </div>
            )}
            {countdown.expired && (
              <div className="mb-8">
                <span className="badge badge-orange animate-pulse" style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-2) var(--space-4)' }}>
                  🔴 LIVE NOW
                </span>
              </div>
            )}

            <div className="hero-actions">
              {isRegOpen && (
                <Link to={`/tournament/${slug}/register`} className="btn btn-primary btn-lg">
                  ⚔️ Register Your Squad
                </Link>
              )}
              <Link to={`/tournament/${slug}/leaderboard`} className="btn btn-secondary btn-lg">
                🏆 View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        <div className="container">
          {/* Info Cards */}
          <section className="section">
            <div className="info-grid">
              <div className="card card-glow info-card animate-slideUp delay-1">
                <div className="info-icon">💰</div>
                <div className="info-value">{formatCurrency(fee)}</div>
                <div className="info-label">Entry Fee</div>
              </div>
              <div className="card card-glow info-card animate-slideUp delay-2">
                <div className="info-icon">🏆</div>
                <div className="info-value">{totalPrize > 0 ? `₹${totalPrize.toLocaleString('en-IN')}` : 'No Prizes'}</div>
                <div className="info-label">Prize Pool</div>
              </div>
              <div className="card card-glow info-card animate-slideUp delay-3">
                <div className="info-icon">🗺️</div>
                <div className="info-value">{tournament.schedule?.numMatches || 0} Maps</div>
                <div className="info-label">Format</div>
              </div>
              <div className="card card-glow info-card animate-slideUp delay-4">
                <div className="info-icon">👥</div>
                <div className="info-value">4 Players</div>
                <div className="info-label">Squad</div>
              </div>
            </div>
          </section>

          {/* Prize Section */}
          {prizes.length > 0 && totalPrize > 0 && (
            <section className="section">
              <div className="section-title">
                <h2>🏆 Prize Pool</h2>
                <div className="section-divider" />
              </div>
              <div className="prize-grid">
                {prizes.map((prize, i) => (
                  <div key={i} className="card card-glow prize-card animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="prize-position">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}
                    </div>
                    <div className="prize-amount">₹{parseInt(prize.amount).toLocaleString('en-IN')}</div>
                    <div className="prize-label">{prize.label}</div>
                  </div>
                ))}
              </div>
              {tournament.qualifier?.enabled && (
                <div className="card mt-6 text-center" style={{ borderColor: 'var(--rank-gold)', borderWidth: 2 }}>
                  <span style={{ fontSize: '24px' }}>⭐</span>
                  <h4 style={{ marginTop: 'var(--space-2)' }}>
                    Top {tournament.qualifier.topN} teams qualify for {tournament.qualifier.roundName}
                  </h4>
                </div>
              )}
            </section>
          )}

          {/* Slot Tracker */}
          {isRegOpen && (
            <section className="section">
              <div className="section-title">
                <h2>📊 Slot Tracker</h2>
                <div className="section-divider" />
              </div>
              <div className="card">
                <div className="flex justify-between mb-2">
                  <span style={{ fontWeight: 600 }}>{filledSlots}/{totalSlots} Slots Filled</span>
                  <span className="accent-text" style={{ fontWeight: 700 }}>
                    ⚡ {remainingSlots > 0 ? `Only ${remainingSlots} remaining` : 'FULL!'}
                  </span>
                </div>
                <div className="slot-bar">
                  <div className="slot-bar-fill" style={{ width: `${totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0}%` }} />
                </div>
                <div className="slot-icons mt-4">
                  {Array.from({ length: totalSlots }, (_, i) => (
                    <div key={i} className={`slot-icon ${i < filledSlots ? 'filled' : 'empty'}`}>
                      {i < filledSlots ? '👥' : '·'}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Schedule */}
          <section className="section">
            <div className="section-title">
              <h2>📅 Schedule</h2>
              <div className="section-divider" />
            </div>
            <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="card info-card">
                <div className="info-icon">📝</div>
                <div className="info-value" style={{ fontSize: 'var(--text-lg)' }}>{formatDate(tournament.schedule?.regDeadline)}</div>
                <div className="info-label">Reg. Deadline</div>
              </div>
              <div className="card info-card">
                <div className="info-icon">🚪</div>
                <div className="info-value" style={{ fontSize: 'var(--text-lg)' }}>{formatTime(tournament.schedule?.roomReleaseTime)}</div>
                <div className="info-label">Room Release</div>
              </div>
              <div className="card info-card">
                <div className="info-icon">🎮</div>
                <div className="info-value" style={{ fontSize: 'var(--text-lg)' }}>{formatTime(tournament.schedule?.matchStartTime)}</div>
                <div className="info-label">Match Start</div>
              </div>
            </div>
          </section>

          {/* Contact */}
          {(tournament.contact?.whatsapp || tournament.contact?.discord || tournament.contact?.instagram) && (
            <section className="section">
              <div className="section-title">
                <h2>📞 Contact</h2>
                <div className="section-divider" />
              </div>
              <div className="flex gap-4 justify-center" style={{ flexWrap: 'wrap' }}>
                {tournament.contact.whatsapp && (
                  <a href={`https://wa.me/${tournament.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-success">
                    📱 WhatsApp
                  </a>
                )}
                {tournament.contact.whatsappGroup && (
                  <a href={tournament.contact.whatsappGroup} target="_blank" rel="noopener noreferrer" className="btn btn-success">
                    👥 Join Group
                  </a>
                )}
                {tournament.contact.discord && (
                  <a href={tournament.contact.discord} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    🎮 Discord
                  </a>
                )}
                {tournament.contact.instagram && (
                  <a href={tournament.contact.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    📸 Instagram
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ====== GLOBAL LANDING (no slug) ======
  return (
    <div className="page">
      <section className="hero" style={{ minHeight: '60vh' }}>
        <div className="hero-bg" />
        <div className="hero-content animate-slideUp">
          <img src="/ff-logo.webp" alt="Free Fire Max" style={{ height: 64, margin: '0 auto var(--space-6)' }} />
          <h1 className="hero-title gradient-text">Free Fire Max Tournaments</h1>
          <p className="hero-tagline">College esports tournament management made easy</p>
          <div className="hero-actions">
            <Link to="/admin" className="btn btn-primary btn-lg">⚡ Admin Panel</Link>
          </div>
        </div>
      </section>

      <div className="container">
        {tournaments.length > 0 && (
          <section className="section">
            <div className="section-title">
              <h2>🔥 Active Tournaments</h2>
              <div className="section-divider" />
            </div>
            <div className="flex flex-col gap-4">
              {tournaments.map(t => (
                <Link key={t.id} to={`/tournament/${t.slug}`} className="card card-glow"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', color: 'inherit' }}>
                  <div>
                    <h3 style={{ marginBottom: 'var(--space-1)' }}>{t.basicInfo?.name}</h3>
                    <div className="flex gap-4 muted-text" style={{ fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
                      <span>🏫 {t.basicInfo?.organizer}</span>
                      <span>📅 {formatDate(t.schedule?.date)}</span>
                      <span>💰 {formatCurrency(t.entry?.fee)}</span>
                    </div>
                  </div>
                  <span className={`badge ${(STATUS_CONFIG[t.status] || {}).color || 'badge-info'}`}>
                    {(STATUS_CONFIG[t.status] || {}).label || t.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
