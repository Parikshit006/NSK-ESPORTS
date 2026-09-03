/**
 * NSK ESPORTS — Data Service
 * Node.js / Express + MongoDB backend implementation
 * Full drop-in replacement for Supabase version with 100% data contract compatibility
 */

import { io } from 'socket.io-client';
import { uploadToCloudinary } from '../lib/cloudinary';
import { getAuthToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Reusable Socket.IO connection
let socket = null;
function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}

// ============================================================
// HELPERS: Request Wrappers & Normalizers
// ============================================================

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

function dbToTournament(row) {
  if (!row) return null;
  return {
    id: row._id || row.id,
    slug: row.slug,
    status: row.status,
    basicInfo: {
      name: row.name,
      organizer: row.organizer,
      tagline: row.tagline || '',
      bannerUrl: row.bannerUrl || row.banner_url || '',
      game: row.game || 'Free Fire Max',
      teamFormat: row.teamFormat || row.team_format || 'Squad (4 Players)'
    },
    schedule: {
      date: row.schedule?.date || row.tournament_date || null,
      regDeadline: row.schedule?.regDeadline || row.reg_deadline || null,
      roomReleaseTime: row.schedule?.roomReleaseTime || row.room_release_time || '',
      matchStartTime: row.schedule?.matchStartTime || row.match_start_time || '',
      numMatches: row.schedule?.numMatches || row.num_matches || 6
    },
    slots: {
      total: row.slots?.total ?? row.total_slots ?? 12,
      filled: row.slots?.filled ?? row.filled_slots ?? 0
    },
    entry: {
      fee: row.entry?.fee ?? row.entry_fee ?? 0,
      upiId: row.entry?.upiId || row.upi_id || '',
      qrCodeUrl: row.entry?.qrCodeUrl || row.qr_code_url || ''
    },
    prizes: row.prizes || [],
    qualifier: {
      enabled: row.qualifier?.enabled ?? row.qualifier_enabled ?? false,
      topN: row.qualifier?.topN ?? row.qualifier_top_n ?? 4,
      roundName: row.qualifier?.roundName || row.qualifier_round_name || 'Inter-College Round'
    },
    scoring: {
      preset: row.scoring?.preset || row.scoring_preset || 'pict',
      placementPoints: row.scoring?.placementPoints || row.placement_points || {},
      killPointValue: row.scoring?.killPointValue ?? row.kill_point_value ?? 1,
      killCap: row.scoring?.killCap ?? row.kill_cap ?? 0,
      tiebreaker: row.scoring?.tiebreaker || row.tiebreaker || 'total_kills'
    },
    rules: row.rules || [],
    regFields: {
      college: row.regFields?.college ?? row.show_college ?? false,
      transactionId: row.regFields?.transactionId ?? row.show_txn_id ?? true,
      paymentScreenshot: row.regFields?.paymentScreenshot ?? row.show_screenshot ?? true
    },
    contact: {
      whatsapp: row.contact?.whatsapp || row.contact_whatsapp || '',
      whatsappGroup: row.contact?.whatsappGroup || row.contact_whatsapp_group || '',
      discord: row.contact?.discord || row.contact_discord || '',
      instagram: row.contact?.instagram || row.contact_instagram || ''
    },
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at
  };
}

function dbToTeam(row) {
  if (!row) return null;
  const id = row._id || row.id;
  const screenshotPath = row.payment?.screenshotPath || row.screenshot_url;
  let screenshotUrl = null;
  if (screenshotPath) {
    if (screenshotPath.startsWith('http://') || screenshotPath.startsWith('https://')) {
      screenshotUrl = screenshotPath;
    } else {
      screenshotUrl = `${API_BASE}/teams/${id}/screenshot`;
    }
  }

  return {
    id,
    tournamentId: row.tournamentId || row.tournament_id,
    teamName: row.teamName || row.team_name,
    leaderName: row.leaderName || row.leader_name,
    leaderWhatsapp: row.leaderWhatsapp || row.leader_whatsapp,
    college: row.college || '',
    players: row.players || [],
    payment: {
      transactionId: row.payment?.transactionId || row.transaction_id || null,
      screenshotUrl
    },
    status: row.status,
    slotNumber: row.slotNumber ?? row.slot_number ?? null,
    rejectionReason: row.rejectionReason || row.rejection_reason || null,
    dqReason: row.dqReason || row.dq_reason || null,
    createdAt: row.createdAt || row.created_at
  };
}

function dbToMatch(row) {
  if (!row) return null;
  return {
    id: row._id || row.id,
    tournamentId: row.tournamentId || row.tournament_id,
    matchNumber: row.matchNumber || row.match_number,
    roomId: row.roomId || row.room_id || '',
    password: row.password || '',
    roomReleased: row.roomReleased ?? row.room_released ?? false,
    published: row.published ?? false,
    publishedAt: row.publishedAt || row.published_at || null,
    results: (row.results || []).map(r => ({
      teamId: r.teamId || r.team_id,
      placement: r.placement,
      kills: r.kills,
      placementPts: r.placementPts ?? r.placement_pts ?? 0,
      killPts: r.killPts ?? r.kill_pts ?? 0,
      totalPts: r.totalPts ?? r.total_pts ?? 0
    }))
  };
}

// ============================================================
// TOURNAMENT CRUD
// ============================================================

export async function getAllTournaments() {
  const res = await fetch(`${API_BASE}/tournaments/all`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(dbToTournament);
}

export async function getPublicTournaments() {
  const res = await fetch(`${API_BASE}/tournaments`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(dbToTournament);
}

export async function getTournamentBySlug(slug) {
  const res = await fetch(`${API_BASE}/tournaments/slug/${encodeURIComponent(slug)}`, {
    headers: getHeaders()
  });
  if (res.status === 404) return null;
  const data = await handleResponse(res);
  return dbToTournament(data);
}

export async function getTournamentById(id) {
  const res = await fetch(`${API_BASE}/tournaments/id/${id}`, {
    headers: getHeaders()
  });
  if (res.status === 404) return null;
  const data = await handleResponse(res);
  return dbToTournament(data);
}

export async function createTournament(tournamentData) {
  const res = await fetch(`${API_BASE}/tournaments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(tournamentData)
  });
  const data = await handleResponse(res);
  return dbToTournament(data);
}

export async function updateTournament(id, updates) {
  const res = await fetch(`${API_BASE}/tournaments/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  const data = await handleResponse(res);
  return dbToTournament(data);
}

export async function updateTournamentStatus(id, status) {
  const res = await fetch(`${API_BASE}/tournaments/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await handleResponse(res);
  return dbToTournament(data);
}

export async function deleteTournament(id) {
  const res = await fetch(`${API_BASE}/tournaments/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await handleResponse(res);
}

export async function uploadTournamentBanner(file) {
  return uploadToCloudinary(file, 'nsk-banners');
}

export async function getFullTournament(tournamentId) {
  const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/full`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return {
    ...dbToTournament(data),
    teams: (data.teams || []).map(dbToTeam),
    matches: (data.matches || []).map(dbToMatch),
    announcements: data.announcements || []
  };
}

// ============================================================
// TEAM CRUD
// ============================================================

export async function getTeamsByTournament(tournamentId) {
  const res = await fetch(`${API_BASE}/teams/tournament/${tournamentId}`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(dbToTeam);
}

export async function getConfirmedTeams(tournamentId) {
  const res = await fetch(`${API_BASE}/teams/tournament/${tournamentId}/confirmed`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(dbToTeam);
}

export async function registerTeam(tournamentId, formData, screenshotFile) {
  const body = new FormData();
  body.append('teamName', formData.teamName);
  body.append('leaderName', formData.leaderName);
  body.append('leaderWhatsapp', formData.leaderWhatsapp);
  if (formData.college) body.append('college', formData.college);
  body.append('players', JSON.stringify(formData.players || []));
  if (formData.transactionId) body.append('transactionId', formData.transactionId);
  if (screenshotFile) {
    body.append('screenshot', screenshotFile);
  }

  const token = getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/teams/tournament/${tournamentId}/register`, {
    method: 'POST',
    headers,
    body
  });

  const data = await handleResponse(res);
  return dbToTeam(data);
}

export async function approveTeam(tournamentId, teamId) {
  const res = await fetch(`${API_BASE}/teams/${teamId}/approve`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return dbToTeam(data);
}

export async function rejectTeam(tournamentId, teamId, reason) {
  const res = await fetch(`${API_BASE}/teams/${teamId}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  const data = await handleResponse(res);
  return dbToTeam(data);
}

export async function disqualifyTeam(tournamentId, teamId, reason) {
  const res = await fetch(`${API_BASE}/teams/${teamId}/disqualify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  const data = await handleResponse(res);
  return dbToTeam(data);
}

export async function updateTeam(tournamentId, teamId, updates) {
  const res = await fetch(`${API_BASE}/teams/${teamId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  const data = await handleResponse(res);
  return dbToTeam(data);
}

export async function getTeamByNameAndPhone(tournamentId, teamName, phone) {
  const res = await fetch(`${API_BASE}/teams/portal-login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tournamentId, teamName, phone })
  });
  if (res.status === 404) return null;
  const data = await handleResponse(res);
  return dbToTeam(data);
}

// ============================================================
// IGN & UID LOOKUP
// ============================================================

export async function lookupIGN(tournamentId, ign) {
  const teams = await getTeamsByTournament(tournamentId);
  const normalizedIGN = ign.toLowerCase().trim();
  for (const team of teams) {
    for (let i = 0; i < (team.players || []).length; i++) {
      if (team.players[i].ign?.toLowerCase().trim() === normalizedIGN) {
        return {
          teamId: team.id,
          teamName: team.teamName,
          slotNumber: team.slotNumber,
          status: team.status,
          player: team.players[i],
          playerIndex: i,
          allPlayers: team.players,
        };
      }
    }
  }
  return null;
}

export async function searchIGN(tournamentId, query) {
  const teams = await getTeamsByTournament(tournamentId);
  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  for (const team of teams) {
    for (const player of (team.players || [])) {
      if (player.ign?.toLowerCase().includes(normalizedQuery)) {
        results.push({
          teamId: team.id,
          teamName: team.teamName,
          slotNumber: team.slotNumber,
          status: team.status,
          player,
        });
      }
    }
  }
  return results;
}

export async function checkDuplicateIGN(tournamentId, igns) {
  const res = await fetch(`${API_BASE}/teams/tournament/${tournamentId}/check-duplicate-ign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ igns })
  });
  return handleResponse(res);
}

export async function checkDuplicateUID(tournamentId, uids) {
  const res = await fetch(`${API_BASE}/teams/tournament/${tournamentId}/check-duplicate-uid`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ uids })
  });
  return handleResponse(res);
}

// ============================================================
// MATCH & RESULTS
// ============================================================

export async function getMatchesByTournament(tournamentId) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}`, {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.map(dbToMatch);
}

export async function updateRoomInfo(tournamentId, matchNumber, roomId, password) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}/matches/${matchNumber}/room`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ roomId, password })
  });
  await handleResponse(res);
}

export async function toggleRoomRelease(tournamentId, matchNumber) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}/matches/${matchNumber}/toggle-release`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  return data.roomReleased;
}

export async function saveMatchResults(tournamentId, matchNumber, resultsArray) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}/matches/${matchNumber}/results`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ results: resultsArray })
  });
  await handleResponse(res);
}

export async function unpublishMatch(tournamentId, matchNumber) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}/matches/${matchNumber}/unpublish`, {
    method: 'POST',
    headers: getHeaders()
  });
  await handleResponse(res);
}

export async function getLeaderboard(tournamentId) {
  const res = await fetch(`${API_BASE}/matches/tournament/${tournamentId}/leaderboard`, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================

export async function getAnnouncements(tournamentId) {
  const res = await fetch(`${API_BASE}/announcements/tournament/${tournamentId}`, {
    headers: getHeaders()
  });
  return handleResponse(res);
}

export async function addAnnouncement(tournamentId, text) {
  const res = await fetch(`${API_BASE}/announcements/tournament/${tournamentId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text })
  });
  return handleResponse(res);
}

export async function deleteAnnouncement(tournamentId, announcementId) {
  const res = await fetch(`${API_BASE}/announcements/${announcementId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await handleResponse(res);
}

// ============================================================
// REALTIME SUBSCRIPTIONS (Socket.IO replacing Supabase Realtime)
// ============================================================

export function subscribeToTeams(tournamentId, callback) {
  const s = getSocket();
  s.emit('join:tournament', tournamentId);

  const handler = (data) => callback(data);
  s.on('team:registered', handler);
  s.on('team:updated', handler);

  return () => {
    s.off('team:registered', handler);
    s.off('team:updated', handler);
    s.emit('leave:tournament', tournamentId);
  };
}

export function subscribeToMatches(tournamentId, callback) {
  const s = getSocket();
  s.emit('join:tournament', tournamentId);

  const handler = (data) => callback(data);
  s.on('match:updated', handler);
  s.on('results:published', handler);

  return () => {
    s.off('match:updated', handler);
    s.off('results:published', handler);
    s.emit('leave:tournament', tournamentId);
  };
}
