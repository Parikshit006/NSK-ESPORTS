import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournamentBySlug, registerTeam } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import { useToast } from '../contexts/ToastContext';

export default function RegistrationPage() {
  const { slug } = useParams();
  const [tournament, setTournament] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const [form, setForm] = useState({
    teamName: '',
    leaderName: '',
    leaderWhatsapp: '',
    college: '',
    players: [
      { ign: '', uid: '', role: 'Leader' },
      { ign: '', uid: '', role: 'Member' },
      { ign: '', uid: '', role: 'Member' },
      { ign: '', uid: '', role: 'Member' },
    ],
    payment: { transactionId: '', screenshotData: '' },
    agreedRules: false,
    agreedIGN: false,
  });

  useEffect(() => {
    setTournament(getTournamentBySlug(slug));
  }, [slug]);

  if (!tournament) {
    return <div className="page"><div className="container text-center"><h2>Tournament not found</h2></div></div>;
  }

  const fee = parseInt(tournament.entry?.fee) || 0;
  const isRegOpen = tournament.status === 'registration_open';
  const totalSlots = parseInt(tournament.slots?.total) || 0;
  const filledSlots = (tournament.teams || []).filter(t => t.status !== 'rejected').length;
  const slotsFull = filledSlots >= totalSlots;

  if (!isRegOpen) {
    return (
      <div className="page">
        <div className="container container-sm text-center">
          <div className="card" style={{ padding: 'var(--space-12)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>🔒</div>
            <h2>Registration Closed</h2>
            <p className="muted-text mt-4">Registration is not currently open for this tournament.</p>
            <Link to={`/tournament/${slug}`} className="btn btn-primary mt-6">← Back to Tournament</Link>
          </div>
        </div>
      </div>
    );
  }

  if (slotsFull) {
    return (
      <div className="page">
        <div className="container container-sm text-center">
          <div className="card" style={{ padding: 'var(--space-12)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>😞</div>
            <h2>Slots Full</h2>
            <p className="muted-text mt-4">Sorry, all {totalSlots} slots have been filled.</p>
            <Link to={`/tournament/${slug}`} className="btn btn-primary mt-6">← Back to Tournament</Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page">
        <div className="container container-sm text-center">
          <div className="card" style={{ padding: 'var(--space-12)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>✅</div>
            <h2 className="gradient-text">Registration Received!</h2>
            <p className="mt-4" style={{ fontSize: 'var(--text-lg)' }}>
              Your registration is <span className="accent-text" style={{ fontWeight: 700 }}>pending confirmation</span>.
            </p>
            <p className="muted-text mt-2">
              You'll be contacted on WhatsApp once your slot is confirmed.
            </p>
            {tournament.contact?.whatsapp && (
              <p className="mt-4">
                For queries: <a href={`https://wa.me/${tournament.contact.whatsapp}`} target="_blank" rel="noopener">
                  📱 WhatsApp Organizer
                </a>
              </p>
            )}
            <Link to={`/tournament/${slug}`} className="btn btn-primary mt-6">← Back to Tournament</Link>
          </div>
        </div>
      </div>
    );
  }

  const updatePlayer = (index, field, value) => {
    const players = [...form.players];
    players[index] = { ...players[index], [field]: value };
    setForm(prev => ({ ...prev, players }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({
        ...prev,
        payment: { ...prev.payment, screenshotData: reader.result },
      }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.teamName.trim()) e.teamName = 'Team name is required';
    if (!form.leaderName.trim()) e.leaderName = 'Leader name is required';
    if (!form.leaderWhatsapp.trim()) e.leaderWhatsapp = 'WhatsApp number is required';

    form.players.forEach((p, i) => {
      if (!p.ign.trim()) e[`player${i}_ign`] = 'IGN is required';
      if (!p.uid.trim()) e[`player${i}_uid`] = 'UID is required';
    });

    if (fee > 0) {
      if (!form.payment.transactionId.trim()) e.transactionId = 'Transaction ID is required';
      if (!form.payment.screenshotData) e.screenshot = 'Payment screenshot is required';
    }

    if (!form.agreedRules) e.agreedRules = 'You must agree to the rules';
    if (!form.agreedIGN) e.agreedIGN = 'You must confirm IGN accuracy';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors above');
      return;
    }

    try {
      registerTeam(tournament.id, {
        teamName: form.teamName.trim(),
        leaderName: form.leaderName.trim(),
        leaderWhatsapp: form.leaderWhatsapp.trim(),
        college: form.college.trim(),
        players: form.players.map(p => ({
          ign: p.ign.trim(),
          uid: p.uid.trim(),
          role: p.role,
        })),
        payment: fee > 0 ? {
          transactionId: form.payment.transactionId.trim(),
          screenshotData: form.payment.screenshotData,
        } : null,
      });
      setSubmitted(true);
      toast.success('Registration submitted! ⚔️');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="page-header">
          <h1 className="page-title gradient-text">Register Your Squad</h1>
          <p className="page-subtitle">Fill all details carefully — IGN must be exactly as in-game</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Team Info */}
          <div className="card mb-6 animate-slideUp">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>👥 Team Info</h3>

            <div className="form-group">
              <label className="form-label">Team Name <span className="required">*</span></label>
              <input className="form-input" value={form.teamName} placeholder="Enter your team name"
                onChange={e => setForm(prev => ({ ...prev, teamName: e.target.value }))} />
              {errors.teamName && <div className="form-error">{errors.teamName}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Team Leader Name <span className="required">*</span></label>
                <input className="form-input" value={form.leaderName} placeholder="Leader's real name"
                  onChange={e => setForm(prev => ({ ...prev, leaderName: e.target.value }))} />
                {errors.leaderName && <div className="form-error">{errors.leaderName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Leader WhatsApp <span className="required">*</span></label>
                <input className="form-input" value={form.leaderWhatsapp} placeholder="e.g. 9876543210"
                  onChange={e => setForm(prev => ({ ...prev, leaderWhatsapp: e.target.value }))} />
                {errors.leaderWhatsapp && <div className="form-error">{errors.leaderWhatsapp}</div>}
              </div>
            </div>

            {tournament.regFields?.college && (
              <div className="form-group">
                <label className="form-label">College / Department</label>
                <input className="form-input" value={form.college} placeholder="e.g. PICT - Computer Engineering"
                  onChange={e => setForm(prev => ({ ...prev, college: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Player Details */}
          <div className="card mb-6 animate-slideUp delay-2">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>🎮 Player Details</h3>

            {form.players.map((player, i) => (
              <div key={i} className="card" style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h5 style={{ margin: 0 }}>Player {i + 1}</h5>
                  <select className="form-select" value={player.role}
                    onChange={e => updatePlayer(i, 'role', e.target.value)}
                    style={{ width: 'auto', padding: 'var(--space-1) var(--space-8) var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)' }}>
                    <option value="Leader">Leader</option>
                    <option value="Member">Member</option>
                    <option value="Substitute">Substitute</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">IGN <span className="required">*</span></label>
                    <input className="form-input" value={player.ign}
                      placeholder="Exactly as shown in Free Fire"
                      onChange={e => updatePlayer(i, 'ign', e.target.value)} />
                    {errors[`player${i}_ign`] && <div className="form-error">{errors[`player${i}_ign`]}</div>}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">UID <span className="required">*</span></label>
                    <input className="form-input" value={player.uid}
                      placeholder="Free Fire UID"
                      onChange={e => updatePlayer(i, 'uid', e.target.value)} />
                    {errors[`player${i}_uid`] && <div className="form-error">{errors[`player${i}_uid`]}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          {fee > 0 && (
            <div className="card mb-6 animate-slideUp delay-3">
              <h3 style={{ marginBottom: 'var(--space-5)' }}>💳 Payment</h3>

              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(0,207,255,0.05))',
                borderColor: 'var(--accent-orange)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-5)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent-orange)' }}>
                  Pay {formatCurrency(fee)}
                </div>
                <div className="muted-text mt-2">
                  UPI: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{tournament.entry?.upiId}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">UPI Transaction ID <span className="required">*</span></label>
                <input className="form-input" value={form.payment.transactionId}
                  placeholder="Enter your UPI transaction ID"
                  onChange={e => setForm(prev => ({
                    ...prev,
                    payment: { ...prev.payment, transactionId: e.target.value },
                  }))} />
                {errors.transactionId && <div className="form-error">{errors.transactionId}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Screenshot <span className="required">*</span></label>
                <input type="file" accept="image/*" className="form-input"
                  onChange={handleFileUpload}
                  style={{ padding: 'var(--space-2)' }} />
                {errors.screenshot && <div className="form-error">{errors.screenshot}</div>}
                {form.payment.screenshotData && (
                  <img src={form.payment.screenshotData} alt="Payment screenshot"
                    style={{ maxWidth: 200, borderRadius: 'var(--radius-md)', marginTop: 'var(--space-2)' }} />
                )}
              </div>
            </div>
          )}

          {/* Agreement */}
          <div className="card mb-6 animate-slideUp delay-4">
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={form.agreedRules}
                  onChange={e => setForm(prev => ({ ...prev, agreedRules: e.target.checked }))} />
                <span>I have read and agree to all <Link to={`/tournament/${slug}/rules`} target="_blank">tournament rules</Link> <span className="required">*</span></span>
              </label>
              {errors.agreedRules && <div className="form-error">{errors.agreedRules}</div>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-checkbox">
                <input type="checkbox" checked={form.agreedIGN}
                  onChange={e => setForm(prev => ({ ...prev, agreedIGN: e.target.checked }))} />
                <span>All player IGNs provided are accurate <span className="required">*</span></span>
              </label>
              {errors.agreedIGN && <div className="form-error">{errors.agreedIGN}</div>}
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginBottom: 'var(--space-12)' }}>
            ⚔️ Lock In My Squad
          </button>
        </form>
      </div>
    </div>
  );
}
