/* ======================================================
   UTILITY FUNCTIONS
   ====================================================== */

// ---------- Date/Time Formatting ----------
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  // Handle HH:MM format
  if (timeStr.includes(':') && !timeStr.includes('T')) {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
  const date = new Date(timeStr);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

export function formatCurrency(amount) {
  const num = parseInt(amount) || 0;
  if (num === 0) return 'FREE';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ---------- Countdown Timer ----------
export function getCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}

// ---------- WhatsApp Message Generators ----------
export function generateApprovalMessage(team, tournament) {
  const date = formatDate(tournament.schedule?.date);
  const time = formatTime(tournament.schedule?.matchStartTime);
  const releaseTime = formatTime(tournament.schedule?.roomReleaseTime);
  const rulesLink = `${window.location.origin}/tournament/${tournament.slug}/rules`;

  return `✅ *${team.teamName}* - Slot Confirmed!

🎮 *${tournament.basicInfo?.name}*

📌 Slot Number: #${team.slotNumber}
📅 Date: ${date} | ⏰ Start: ${time}
🚪 Room ID & Pass shared at ${releaseTime}

📜 Rules: ${rulesLink}

All the best! 🔥
— ${tournament.basicInfo?.organizer || 'Organizer'} 🎯`;
}

export function generateRejectionMessage(team, reason) {
  return `❌ *${team.teamName}* - Registration Rejected

Reason: ${reason || 'Not specified'}

For queries, contact the organizer.`;
}

export function generateResultsAnnouncement(tournament, standings) {
  const prizes = tournament.prizes || [];
  let msg = `🏆 *${tournament.basicInfo?.name} RESULTS* 🏆\n\n`;

  const medals = ['🥇', '🥈', '🥉'];
  standings.slice(0, Math.max(prizes.length, 3)).forEach((team, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const prize = prizes[i] ? ` — Prize: ₹${prizes[i].amount}` : '';
    msg += `${medal} ${team.teamName} — ${team.totalPoints} pts${prize}\n`;
  });

  if (tournament.qualifier?.enabled) {
    const topN = parseInt(tournament.qualifier.topN) || 4;
    const qualified = standings.slice(0, topN).map(t => t.teamName);
    msg += `\n⭐ *Qualified for ${tournament.qualifier.roundName}:*\n`;
    msg += qualified.join(', ');
  }

  msg += `\n\nThanks to all participants! 🔥\n— ${tournament.basicInfo?.organizer || 'Organizer'}`;
  return msg;
}

export function generateRoomMessage(match) {
  return `🚪 Room Details — Match ${match.matchNumber}

Room ID: ${match.roomId}
Password: ${match.password}

⚠️ Join 5 minutes before match time!`;
}

// ---------- Copy to Clipboard ----------
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}

// ---------- WhatsApp Share ----------
export function openWhatsApp(text, phone) {
  const encoded = encodeURIComponent(text);
  if (phone) {
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

// ---------- Validation ----------
export function validateRequired(value, label) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${label} is required`;
  }
  return null;
}

export function validatePhone(phone) {
  if (!phone) return 'Phone number is required';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return 'Enter a valid phone number';
  return null;
}

// ---------- Status Labels ----------
export const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'badge-info' },
  registration_open: { label: 'Registration Open', color: 'badge-success' },
  registration_closed: { label: 'Registration Closed', color: 'badge-warning' },
  ongoing: { label: 'Ongoing', color: 'badge-orange' },
  completed: { label: 'Completed', color: 'badge-success' },
  archived: { label: 'Archived', color: 'badge-info' },
};

export const TEAM_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'badge-warning' },
  confirmed: { label: 'Confirmed', color: 'badge-success' },
  rejected: { label: 'Rejected', color: 'badge-danger' },
  disqualified: { label: 'Disqualified', color: 'badge-danger' },
};

// ---------- Default Rules ----------
export const DEFAULT_RULES = [
  '🎮 Game: Free Fire Max only (latest version required)',
  '👥 Squad format: 4 players per team (no substitutes during match)',
  '📝 Registration is confirmed only after admin approval',
  '💰 Entry fee is non-refundable once the team slot is confirmed',
  '⏰ All teams must join the room 5 minutes before match start time',
  '🚫 Any form of hacking, modding, or glitch exploitation = instant disqualification',
  '📱 Screen recording may be required as proof — keep it ready if asked',
  '🔇 Teaming up with other squads is strictly prohibited',
  '⚠️ Using emulators is NOT allowed — mobile devices only',
  '📊 Final rankings are based on placement points + kill points across all maps',
  '🏆 In case of a tie, the tiebreaker rule set by the organizer will apply',
  '📸 Results will be verified from in-game screenshots — IGN must match registration',
  '🚪 Room ID and password will be shared at the specified release time',
  '❌ Teams not ready at match time will be considered "no show" — no refund',
  '📢 Organizer\'s decision on disputes is final and binding',
  '✅ By registering, you agree to follow all these rules',
];
