/* ======================================================
   DATA SERVICE — localStorage-based for now.
   Drop-in replacement for Firebase Firestore later.
   ====================================================== */

const STORAGE_KEYS = {
  TOURNAMENTS: 'ff_tournaments',
  ADMIN_PIN: 'ff_admin_pin',
};

// ---------- Helpers ----------
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 60) + '-' + Date.now().toString(36);
}

function getAll(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------- Tournament CRUD ----------
export function createTournament(tournamentData) {
  const tournaments = getAll(STORAGE_KEYS.TOURNAMENTS);
  const id = generateId();
  const slug = generateSlug(tournamentData.basicInfo.name);

  const tournament = {
    id,
    slug,
    ...tournamentData,
    status: 'draft',
    teams: [],
    matches: [],
    announcements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Initialize matches array based on numMatches
  const numMatches = parseInt(tournament.schedule.numMatches) || 3;
  for (let i = 1; i <= numMatches; i++) {
    tournament.matches.push({
      id: generateId(),
      matchNumber: i,
      roomId: '',
      password: '',
      roomReleased: false,
      results: [],
      published: false,
      publishedAt: null,
    });
  }

  tournaments.push(tournament);
  saveAll(STORAGE_KEYS.TOURNAMENTS, tournaments);
  return tournament;
}

export function getAllTournaments() {
  return getAll(STORAGE_KEYS.TOURNAMENTS);
}

export function getTournamentById(id) {
  const tournaments = getAll(STORAGE_KEYS.TOURNAMENTS);
  return tournaments.find(t => t.id === id) || null;
}

export function getTournamentBySlug(slug) {
  const tournaments = getAll(STORAGE_KEYS.TOURNAMENTS);
  return tournaments.find(t => t.slug === slug) || null;
}

export function updateTournament(id, updates) {
  const tournaments = getAll(STORAGE_KEYS.TOURNAMENTS);
  const index = tournaments.findIndex(t => t.id === id);
  if (index === -1) return null;

  tournaments[index] = {
    ...tournaments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveAll(STORAGE_KEYS.TOURNAMENTS, tournaments);
  return tournaments[index];
}

export function deleteTournament(id) {
  const tournaments = getAll(STORAGE_KEYS.TOURNAMENTS);
  const filtered = tournaments.filter(t => t.id !== id);
  saveAll(STORAGE_KEYS.TOURNAMENTS, filtered);
}

export function updateTournamentStatus(id, status) {
  return updateTournament(id, { status });
}

// ---------- Team Operations ----------
export function registerTeam(tournamentId, teamData) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const confirmedTeams = tournament.teams.filter(t => t.status !== 'rejected');
  if (confirmedTeams.length >= parseInt(tournament.slots.total)) {
    throw new Error('All slots are filled');
  }

  // Duplicate checks
  const allPlayers = tournament.teams.flatMap(t => t.players || []);
  const allIgns = allPlayers.map(p => p.ign.toLowerCase());
  const allUids = allPlayers.map(p => p.uid);
  const allTransactionIds = tournament.teams.map(t => t.payment?.transactionId).filter(Boolean);
  const allTeamNames = tournament.teams.map(t => t.teamName.toLowerCase());

  // Check team name duplicate
  if (allTeamNames.includes(teamData.teamName.toLowerCase())) {
    throw new Error('Team name already registered');
  }

  for (const player of teamData.players) {
    if (allIgns.includes(player.ign.toLowerCase())) {
      throw new Error(`IGN "${player.ign}" is already registered`);
    }
    if (allUids.includes(player.uid)) {
      throw new Error(`UID "${player.uid}" is already registered`);
    }
  }

  if (teamData.payment?.transactionId) {
    if (allTransactionIds.includes(teamData.payment.transactionId)) {
      throw new Error('Transaction ID already used');
    }
  }

  const team = {
    id: generateId(),
    ...teamData,
    status: 'pending',
    slotNumber: null,
    rejectionReason: '',
    dqReason: '',
    createdAt: new Date().toISOString(),
  };

  tournament.teams.push(team);
  updateTournament(tournamentId, { teams: tournament.teams });
  return team;
}

export function approveTeam(tournamentId, teamId) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const teamIndex = tournament.teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error('Team not found');

  const confirmedTeams = tournament.teams.filter(t => t.status === 'confirmed');
  const nextSlot = confirmedTeams.length + 1;

  tournament.teams[teamIndex].status = 'confirmed';
  tournament.teams[teamIndex].slotNumber = nextSlot;

  const filledCount = tournament.teams.filter(t => t.status === 'confirmed').length;
  tournament.slots.filled = filledCount;

  updateTournament(tournamentId, {
    teams: tournament.teams,
    slots: tournament.slots,
  });

  return tournament.teams[teamIndex];
}

export function rejectTeam(tournamentId, teamId, reason) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const teamIndex = tournament.teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error('Team not found');

  tournament.teams[teamIndex].status = 'rejected';
  tournament.teams[teamIndex].rejectionReason = reason;

  updateTournament(tournamentId, { teams: tournament.teams });
  return tournament.teams[teamIndex];
}

export function disqualifyTeam(tournamentId, teamId, reason) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const teamIndex = tournament.teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error('Team not found');

  tournament.teams[teamIndex].status = 'disqualified';
  tournament.teams[teamIndex].dqReason = reason;

  updateTournament(tournamentId, { teams: tournament.teams });
  return tournament.teams[teamIndex];
}

export function updateTeam(tournamentId, teamId, updates) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const teamIndex = tournament.teams.findIndex(t => t.id === teamId);
  if (teamIndex === -1) throw new Error('Team not found');

  tournament.teams[teamIndex] = { ...tournament.teams[teamIndex], ...updates };
  updateTournament(tournamentId, { teams: tournament.teams });
  return tournament.teams[teamIndex];
}

// ---------- IGN Lookup ----------
export function lookupIGN(tournamentId, ign) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) return null;

  const normalizedIGN = ign.toLowerCase().trim();

  for (const team of tournament.teams) {
    for (let i = 0; i < (team.players || []).length; i++) {
      if (team.players[i].ign.toLowerCase().trim() === normalizedIGN) {
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

export function searchIGN(tournamentId, query) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  for (const team of tournament.teams) {
    for (const player of (team.players || [])) {
      if (player.ign.toLowerCase().includes(normalizedQuery)) {
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

// ---------- Match Results ----------
export function saveMatchResults(tournamentId, matchNumber, results) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const matchIndex = tournament.matches.findIndex(m => m.matchNumber === matchNumber);
  if (matchIndex === -1) throw new Error('Match not found');

  tournament.matches[matchIndex].results = results;
  tournament.matches[matchIndex].published = true;
  tournament.matches[matchIndex].publishedAt = new Date().toISOString();

  updateTournament(tournamentId, { matches: tournament.matches });
  return tournament.matches[matchIndex];
}

export function unpublishMatch(tournamentId, matchNumber) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const matchIndex = tournament.matches.findIndex(m => m.matchNumber === matchNumber);
  if (matchIndex === -1) throw new Error('Match not found');

  tournament.matches[matchIndex].published = false;
  updateTournament(tournamentId, { matches: tournament.matches });
}

// ---------- Room Management ----------
export function updateRoomInfo(tournamentId, matchNumber, roomId, password) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const matchIndex = tournament.matches.findIndex(m => m.matchNumber === matchNumber);
  if (matchIndex === -1) throw new Error('Match not found');

  tournament.matches[matchIndex].roomId = roomId;
  tournament.matches[matchIndex].password = password;

  updateTournament(tournamentId, { matches: tournament.matches });
}

export function toggleRoomRelease(tournamentId, matchNumber) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const matchIndex = tournament.matches.findIndex(m => m.matchNumber === matchNumber);
  if (matchIndex === -1) throw new Error('Match not found');

  tournament.matches[matchIndex].roomReleased = !tournament.matches[matchIndex].roomReleased;

  updateTournament(tournamentId, { matches: tournament.matches });
  return tournament.matches[matchIndex].roomReleased;
}

// ---------- Announcements ----------
export function addAnnouncement(tournamentId, text) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const announcement = {
    id: generateId(),
    text,
    createdAt: new Date().toISOString(),
  };

  tournament.announcements = tournament.announcements || [];
  tournament.announcements.unshift(announcement);
  updateTournament(tournamentId, { announcements: tournament.announcements });
  return announcement;
}

export function deleteAnnouncement(tournamentId, announcementId) {
  const tournament = getTournamentById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  tournament.announcements = (tournament.announcements || []).filter(a => a.id !== announcementId);
  updateTournament(tournamentId, { announcements: tournament.announcements });
}

// ---------- Admin PIN ----------
export function setAdminPin(pin) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
}

export function verifyAdminPin(pin) {
  const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
  if (!saved) {
    // First time — set pin
    setAdminPin(pin);
    return true;
  }
  return saved === pin;
}

export function isAdminPinSet() {
  return !!localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
}
