import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../../services/dataService';
import { DEFAULT_RULES } from '../../utils/helpers';
import { SCORING_PRESETS } from '../../utils/scoring';
import { useToast } from '../../contexts/ToastContext';

const STEPS = [
  { key: 'basic', label: 'Basic Info', icon: '📝' },
  { key: 'schedule', label: 'Schedule', icon: '📅' },
  { key: 'slots', label: 'Slots & Fee', icon: '🎫' },
  { key: 'prizes', label: 'Prizes', icon: '🏆' },
  { key: 'scoring', label: 'Scoring', icon: '📊' },
  { key: 'rules', label: 'Rules', icon: '📜' },
  { key: 'fields', label: 'Fields', icon: '📋' },
  { key: 'contact', label: 'Contact', icon: '📞' },
];

const INITIAL_FORM = {
  basicInfo: {
    name: '',
    organizer: '',
    tagline: '',
    bannerUrl: '',
    game: 'Free Fire Max',
    teamFormat: 'Squad – 4 Players',
  },
  schedule: {
    date: '',
    regDeadline: '',
    roomReleaseTime: '',
    matchStartTime: '',
    numMatches: 3,
  },
  slots: { total: 12, filled: 0 },
  entry: { fee: 0, upiId: '' },
  prizes: [
    { position: 1, label: '1st Place', amount: '' },
  ],
  qualifier: { enabled: false, topN: 4, roundName: '' },
  scoring: {
    preset: 'pict',
    placementPoints: {},
    defaultPoints: 0,
    killPointValue: 1,
    killCap: 0,
    tiebreaker: 'total_kills',
  },
  rules: DEFAULT_RULES.map(r => r),
  regFields: {
    college: false,
    transactionId: true,
    paymentScreenshot: true,
  },
  contact: {
    whatsapp: '',
    whatsappGroup: '',
    discord: '',
    instagram: '',
  },
};

export default function CreateTournament() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const toast = useToast();

  const updateField = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
    setErrors(prev => ({ ...prev, [`${section}.${field}`]: null }));
  };

  const validateStep = () => {
    const e = {};
    switch (STEPS[step].key) {
      case 'basic':
        if (!form.basicInfo.name.trim()) e['basicInfo.name'] = 'Tournament name is required';
        if (!form.basicInfo.organizer.trim()) e['basicInfo.organizer'] = 'Organizer name is required';
        break;
      case 'schedule':
        if (!form.schedule.date) e['schedule.date'] = 'Date is required';
        if (!form.schedule.regDeadline) e['schedule.regDeadline'] = 'Registration deadline required';
        if (!form.schedule.matchStartTime) e['schedule.matchStartTime'] = 'Match start time required';
        if (!form.schedule.numMatches || form.schedule.numMatches < 1)
          e['schedule.numMatches'] = 'At least 1 match required';
        break;
      case 'slots':
        if (!form.slots.total || form.slots.total < 2) e['slots.total'] = 'Min 2 slots';
        if (form.entry.fee > 0 && !form.entry.upiId.trim()) e['entry.upiId'] = 'UPI ID required for paid tournaments';
        break;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    try {
      // Auto-handle payment fields based on fee
      const finalForm = { ...form };
      if (parseInt(form.entry.fee) === 0) {
        finalForm.regFields = {
          ...finalForm.regFields,
          transactionId: false,
          paymentScreenshot: false,
        };
        finalForm.entry.upiId = '';
      } else {
        finalForm.regFields = {
          ...finalForm.regFields,
          transactionId: true,
          paymentScreenshot: true,
        };
      }

      const tournament = createTournament(finalForm);
      toast.success('Tournament created successfully! 🎮');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Failed to create tournament');
    }
  };

  const renderError = (key) => errors[key] ? <div className="form-error">{errors[key]}</div> : null;

  // ---------- STEP RENDERERS ----------

  const renderBasicInfo = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>📝 Basic Information</h3>

      <div className="form-group">
        <label className="form-label">Tournament Name <span className="required">*</span></label>
        <input className="form-input" placeholder='e.g. "FREE FIRE MAX – BATTLE ROYALE"'
          value={form.basicInfo.name} onChange={e => updateField('basicInfo', 'name', e.target.value)} />
        {renderError('basicInfo.name')}
      </div>

      <div className="form-group">
        <label className="form-label">Organizer / College Name <span className="required">*</span></label>
        <input className="form-input" placeholder='e.g. "PICT College"'
          value={form.basicInfo.organizer} onChange={e => updateField('basicInfo', 'organizer', e.target.value)} />
        {renderError('basicInfo.organizer')}
      </div>

      <div className="form-group">
        <label className="form-label">Tagline <span className="form-hint">(optional)</span></label>
        <input className="form-input" placeholder={`e.g. "College's Biggest Free Fire Showdown"`}
          value={form.basicInfo.tagline} onChange={e => updateField('basicInfo', 'tagline', e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Banner Image URL <span className="form-hint">(optional)</span></label>
        <input className="form-input" placeholder="https://example.com/banner.jpg"
          value={form.basicInfo.bannerUrl} onChange={e => updateField('basicInfo', 'bannerUrl', e.target.value)} />
        <div className="form-hint">Paste an image URL or leave blank for default banner</div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Game</label>
          <input className="form-input" value="Free Fire Max" disabled style={{ opacity: 0.6 }} />
        </div>
        <div className="form-group">
          <label className="form-label">Team Format</label>
          <input className="form-input" value="Squad – 4 Players" disabled style={{ opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>📅 Schedule</h3>

      <div className="form-group">
        <label className="form-label">Tournament Date <span className="required">*</span></label>
        <input type="date" className="form-input"
          value={form.schedule.date} onChange={e => updateField('schedule', 'date', e.target.value)} />
        {renderError('schedule.date')}
      </div>

      <div className="form-group">
        <label className="form-label">Registration Deadline <span className="required">*</span></label>
        <input type="datetime-local" className="form-input"
          value={form.schedule.regDeadline} onChange={e => updateField('schedule', 'regDeadline', e.target.value)} />
        {renderError('schedule.regDeadline')}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Room ID Release Time</label>
          <input type="time" className="form-input"
            value={form.schedule.roomReleaseTime} onChange={e => updateField('schedule', 'roomReleaseTime', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Match Start Time <span className="required">*</span></label>
          <input type="time" className="form-input"
            value={form.schedule.matchStartTime} onChange={e => updateField('schedule', 'matchStartTime', e.target.value)} />
          {renderError('schedule.matchStartTime')}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Number of Maps / Matches <span className="required">*</span></label>
        <input type="number" className="form-input" min={1} max={10}
          value={form.schedule.numMatches} onChange={e => updateField('schedule', 'numMatches', parseInt(e.target.value) || 1)} />
        {renderError('schedule.numMatches')}
        <div className="form-hint">How many matches will be played (1–10)</div>
      </div>
    </div>
  );

  const renderSlots = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>🎫 Slots & Entry Fee</h3>

      <div className="form-group">
        <label className="form-label">Total Team Slots <span className="required">*</span></label>
        <input type="number" className="form-input" min={2} max={100}
          value={form.slots.total} onChange={e => {
            const v = parseInt(e.target.value) || 2;
            setForm(prev => ({ ...prev, slots: { ...prev.slots, total: v } }));
          }} />
        {renderError('slots.total')}
        <div className="form-hint">e.g. 12, 16, 20 teams</div>
      </div>

      <div className="form-group">
        <label className="form-label">Entry Fee (₹) <span className="required">*</span></label>
        <input type="number" className="form-input" min={0}
          value={form.entry.fee} onChange={e => updateField('entry', 'fee', parseInt(e.target.value) || 0)} />
        <div className="form-hint">Enter 0 for free tournament</div>
      </div>

      {parseInt(form.entry.fee) > 0 && (
        <div className="form-group animate-fadeIn">
          <label className="form-label">UPI ID for Payment <span className="required">*</span></label>
          <input className="form-input" placeholder="yourname@upi"
            value={form.entry.upiId} onChange={e => updateField('entry', 'upiId', e.target.value)} />
          {renderError('entry.upiId')}
          <div className="form-hint">This will be shown to teams during registration</div>
        </div>
      )}
    </div>
  );

  const renderPrizes = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>🏆 Prize Pool</h3>

      {form.prizes.map((prize, i) => (
        <div key={i} className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Position Label</label>
              <input className="form-input" placeholder={`e.g. ${i === 0 ? '1st Place' : i === 1 ? 'Runner Up' : `${i + 1}th Place`}`}
                value={prize.label}
                onChange={e => {
                  const p = [...form.prizes];
                  p[i] = { ...p[i], label: e.target.value };
                  setForm(prev => ({ ...prev, prizes: p }));
                }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Prize Amount (₹)</label>
              <input type="number" className="form-input" min={0}
                value={prize.amount}
                onChange={e => {
                  const p = [...form.prizes];
                  p[i] = { ...p[i], amount: parseInt(e.target.value) || 0 };
                  setForm(prev => ({ ...prev, prizes: p }));
                }} />
            </div>
          </div>
          {form.prizes.length > 1 && (
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => {
              setForm(prev => ({ ...prev, prizes: prev.prizes.filter((_, idx) => idx !== i) }));
            }}>🗑️ Remove</button>
          )}
        </div>
      ))}

      {form.prizes.length < 5 && (
        <button className="btn btn-ghost btn-sm" onClick={() => {
          setForm(prev => ({
            ...prev,
            prizes: [...prev.prizes, { position: prev.prizes.length + 1, label: '', amount: '' }],
          }));
        }}>➕ Add Prize Position</button>
      )}

      <div style={{ marginTop: 'var(--space-8)' }}>
        <div className="toggle-switch" onClick={() => {
          setForm(prev => ({
            ...prev,
            qualifier: { ...prev.qualifier, enabled: !prev.qualifier.enabled },
          }));
        }}>
          <div className={`toggle-track ${form.qualifier.enabled ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span style={{ fontWeight: 600 }}>⭐ Top N teams qualify for next round</span>
        </div>

        {form.qualifier.enabled && (
          <div className="form-row mt-4 animate-fadeIn">
            <div className="form-group">
              <label className="form-label">How many qualify? (N)</label>
              <input type="number" className="form-input" min={1} max={20}
                value={form.qualifier.topN}
                onChange={e => setForm(prev => ({
                  ...prev,
                  qualifier: { ...prev.qualifier, topN: parseInt(e.target.value) || 1 },
                }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Next Round Name</label>
              <input className="form-input" placeholder="e.g. Inter-College Round"
                value={form.qualifier.roundName}
                onChange={e => setForm(prev => ({
                  ...prev,
                  qualifier: { ...prev.qualifier, roundName: e.target.value },
                }))} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderScoring = () => {
    const pict = SCORING_PRESETS.pict;
    const eagle = SCORING_PRESETS.eagle;

    return (
      <div className="animate-fadeIn">
        <h3 style={{ marginBottom: 'var(--space-6)' }}>📊 Scoring System</h3>

        <div className="form-radio-group">
          <label className={`form-radio ${form.scoring.preset === 'pict' ? 'active' : ''}`}>
            <input type="radio" name="preset" checked={form.scoring.preset === 'pict'}
              onChange={() => updateField('scoring', 'preset', 'pict')} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>🏫 PICT Standard</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Booyah=12, 2nd=9, 3rd=8... | 1 kill = 1 pt
              </div>
            </div>
          </label>

          <label className={`form-radio ${form.scoring.preset === 'eagle' ? 'active' : ''}`}>
            <input type="radio" name="preset" checked={form.scoring.preset === 'eagle'}
              onChange={() => updateField('scoring', 'preset', 'eagle')} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>🦅 Eagle Esports Standard</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                1st=10, 2nd=6, 3rd=5... | 1 kill = 1 pt
              </div>
            </div>
          </label>

          <label className={`form-radio ${form.scoring.preset === 'custom' ? 'active' : ''}`}>
            <input type="radio" name="preset" checked={form.scoring.preset === 'custom'}
              onChange={() => updateField('scoring', 'preset', 'custom')} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>⚙️ Custom Scoring</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Set your own points for each position
              </div>
            </div>
          </label>
        </div>

        {form.scoring.preset === 'custom' && (
          <div className="animate-fadeIn mt-6">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Custom Placement Points</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-2)' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(pos => (
                <div key={pos} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    {pos === 1 ? 'Booyah (1st)' : `${pos}${pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} Place`}
                  </label>
                  <input type="number" className="form-input" min={0}
                    style={{ padding: 'var(--space-2)' }}
                    value={form.scoring.placementPoints[pos] || ''}
                    onChange={e => {
                      const pts = { ...form.scoring.placementPoints, [pos]: parseInt(e.target.value) || 0 };
                      setForm(prev => ({
                        ...prev,
                        scoring: { ...prev.scoring, placementPoints: pts },
                      }));
                    }} />
                </div>
              ))}
            </div>

            <div className="form-row mt-4">
              <div className="form-group">
                <label className="form-label">Kill Point Value</label>
                <input type="number" className="form-input" min={1}
                  value={form.scoring.killPointValue}
                  onChange={e => updateField('scoring', 'killPointValue', parseInt(e.target.value) || 1)} />
                <div className="form-hint">Points per kill</div>
              </div>
              <div className="form-group">
                <label className="form-label">Kill Points Cap (per match)</label>
                <input type="number" className="form-input" min={0}
                  value={form.scoring.killCap}
                  onChange={e => updateField('scoring', 'killCap', parseInt(e.target.value) || 0)} />
                <div className="form-hint">0 = no cap</div>
              </div>
            </div>
          </div>
        )}

        <div className="form-group mt-6">
          <label className="form-label">Tiebreaker Rule</label>
          <select className="form-select" value={form.scoring.tiebreaker}
            onChange={e => updateField('scoring', 'tiebreaker', e.target.value)}>
            <option value="total_kills">Higher total kills wins</option>
            <option value="last_match_kills">Higher kills in last match wins</option>
            <option value="head_to_head">Head-to-head placement</option>
          </select>
        </div>
      </div>
    );
  };

  const renderRules = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-2)' }}>📜 Tournament Rules</h3>
      <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>
        Pre-filled with standard rules. Edit, add, or remove as needed.
      </p>

      {form.rules.map((rule, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent-orange)', fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: 28 }}>
            {i + 1}.
          </span>
          <input className="form-input" value={rule}
            onChange={e => {
              const r = [...form.rules];
              r[i] = e.target.value;
              setForm(prev => ({ ...prev, rules: r }));
            }}
            style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setForm(prev => ({ ...prev, rules: prev.rules.filter((_, idx) => idx !== i) }))}>
            ✕
          </button>
        </div>
      ))}

      <button className="btn btn-ghost btn-sm mt-2" onClick={() => {
        setForm(prev => ({ ...prev, rules: [...prev.rules, ''] }));
      }}>➕ Add Rule</button>
    </div>
  );

  const renderFields = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-2)' }}>📋 Registration Form Fields</h3>
      <p className="muted-text" style={{ marginBottom: 'var(--space-6)' }}>
        Toggle which fields appear on the registration form.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {[
          { key: 'teamName', label: 'Team Name', locked: true },
          { key: 'leaderName', label: 'Leader Name', locked: true },
          { key: 'leaderWhatsapp', label: 'Leader WhatsApp', locked: true },
          { key: 'playerIGNs', label: 'Player IGNs', locked: true },
          { key: 'playerUIDs', label: 'Player UIDs', locked: true },
          { key: 'college', label: 'College / Department', locked: false },
          { key: 'transactionId', label: 'Transaction ID', auto: true },
          { key: 'paymentScreenshot', label: 'Payment Screenshot', auto: true },
        ].map(field => (
          <div key={field.key} className="flex items-center gap-3">
            <div
              className="toggle-switch"
              onClick={() => {
                if (field.locked || field.auto) return;
                setForm(prev => ({
                  ...prev,
                  regFields: { ...prev.regFields, [field.key]: !prev.regFields[field.key] },
                }));
              }}
              style={{ cursor: field.locked || field.auto ? 'not-allowed' : 'pointer' }}
            >
              <div className={`toggle-track ${field.locked || form.regFields[field.key] ? 'active' : ''}`}
                style={field.locked ? { opacity: 0.6 } : {}}>
                <div className="toggle-thumb" />
              </div>
              <span>{field.label}</span>
            </div>
            {field.locked && <span className="badge badge-info" style={{ fontSize: '10px' }}>Always ON</span>}
            {field.auto && parseInt(form.entry.fee) > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '10px' }}>Auto (paid)</span>
            )}
            {field.auto && parseInt(form.entry.fee) === 0 && (
              <span className="badge badge-info" style={{ fontSize: '10px' }}>Hidden (free)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="animate-fadeIn">
      <h3 style={{ marginBottom: 'var(--space-6)' }}>📞 Contact Information</h3>

      <div className="form-group">
        <label className="form-label">Organizer WhatsApp Number</label>
        <input className="form-input" placeholder="e.g. 919876543210"
          value={form.contact.whatsapp} onChange={e => updateField('contact', 'whatsapp', e.target.value)} />
        <div className="form-hint">Shown on homepage for queries (include country code)</div>
      </div>

      <div className="form-group">
        <label className="form-label">WhatsApp Group Link <span className="form-hint">(optional)</span></label>
        <input className="form-input" placeholder="https://chat.whatsapp.com/..."
          value={form.contact.whatsappGroup} onChange={e => updateField('contact', 'whatsappGroup', e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Discord Link <span className="form-hint">(optional)</span></label>
        <input className="form-input" placeholder="https://discord.gg/..."
          value={form.contact.discord} onChange={e => updateField('contact', 'discord', e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Instagram Link <span className="form-hint">(optional)</span></label>
        <input className="form-input" placeholder="https://instagram.com/..."
          value={form.contact.instagram} onChange={e => updateField('contact', 'instagram', e.target.value)} />
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (STEPS[step].key) {
      case 'basic': return renderBasicInfo();
      case 'schedule': return renderSchedule();
      case 'slots': return renderSlots();
      case 'prizes': return renderPrizes();
      case 'scoring': return renderScoring();
      case 'rules': return renderRules();
      case 'fields': return renderFields();
      case 'contact': return renderContact();
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <h1 className="page-title gradient-text">Create Tournament</h1>
          <p className="page-subtitle">Set up your Free Fire Max tournament</p>
        </div>

        {/* Stepper */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className={`wizard-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                onClick={() => i < step && setStep(i)}
                style={{ cursor: i < step ? 'pointer' : 'default' }}
              >
                <div className="wizard-step-number">
                  {i < step ? '✓' : s.icon}
                </div>
                <span className="wizard-step-label">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="wizard-connector" />}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8" style={{ paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-default)' }}>
            <button className="btn btn-ghost" onClick={handleBack} disabled={step === 0}>
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={handleNext}>
                Next →
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                🚀 Create Tournament
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
