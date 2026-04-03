/* ======================================================
   SCORING ENGINE — Points calculation for leaderboards.
   Handles all 3 presets + custom scoring + tiebreakers.
   ====================================================== */

// Preset scoring tables
export const SCORING_PRESETS = {
  pict: {
    name: 'PICT Standard',
    placementPoints: {
      1: 12, 2: 9, 3: 8, 4: 7, 5: 6,
      6: 5, 7: 4, 8: 3, 9: 2, 10: 1,
    },
    defaultPoints: 0,
    killPointValue: 1,
    killCap: 0,
  },
  eagle: {
    name: 'Eagle Esports Standard',
    placementPoints: {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3,
      6: 2, 7: 2, 8: 2, 9: 2, 10: 2,
      11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    },
    defaultPoints: 0,
    killPointValue: 1,
    killCap: 0,
  },
};

/**
 * Get placement points for a position based on scoring config.
 */
export function getPlacementPoints(position, scoring) {
  const placementMap = scoring.placementPoints || {};
  if (placementMap[position] !== undefined) {
    return parseInt(placementMap[position]) || 0;
  }
  return parseInt(scoring.defaultPoints) || 0;
}

/**
 * Calculate kill points with optional cap.
 */
export function getKillPoints(kills, scoring) {
  const killPts = kills * (parseInt(scoring.killPointValue) || 1);
  const cap = parseInt(scoring.killCap) || 0;
  if (cap > 0 && killPts > cap) return cap;
  return killPts;
}

/**
 * Calculate total points for a single match result entry.
 */
export function calculateMatchPoints(placement, kills, scoring) {
  const placementPts = getPlacementPoints(placement, scoring);
  const killPts = getKillPoints(kills, scoring);
  return {
    placementPts,
    killPts,
    totalPts: placementPts + killPts,
  };
}

/**
 * Build the full leaderboard from tournament data.
 * Returns sorted array of team standings.
 */
export function buildLeaderboard(tournament) {
  if (!tournament) return [];

  const scoring = getScoringConfig(tournament);
  const confirmedTeams = (tournament.teams || []).filter(
    t => t.status === 'confirmed' || t.status === 'disqualified'
  );
  const publishedMatches = (tournament.matches || []).filter(m => m.published);

  const standings = confirmedTeams.map(team => {
    const matchResults = [];
    let totalKills = 0;
    let totalPoints = 0;

    for (const match of tournament.matches || []) {
      const result = (match.results || []).find(r => r.teamId === team.id);
      if (result && match.published) {
        const pts = calculateMatchPoints(result.placement, result.kills, scoring);
        matchResults.push({
          matchNumber: match.matchNumber,
          placement: result.placement,
          kills: result.kills,
          ...pts,
        });
        totalKills += result.kills;
        totalPoints += pts.totalPts;
      } else {
        matchResults.push({
          matchNumber: match.matchNumber,
          placement: null,
          kills: null,
          placementPts: null,
          killPts: null,
          totalPts: null,
        });
      }
    }

    return {
      teamId: team.id,
      teamName: team.teamName,
      slotNumber: team.slotNumber,
      status: team.status,
      matchResults,
      totalKills,
      totalPoints,
      rank: 0,
    };
  });

  // Sort by total points descending, then apply tiebreaker
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return applyTiebreaker(a, b, scoring.tiebreaker, publishedMatches);
  });

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (standings[i].status === 'disqualified') {
      standings[i].rank = -1;
      continue;
    }
    if (i > 0 && standings[i].totalPoints === standings[i - 1].totalPoints &&
        standings[i - 1].status !== 'disqualified') {
      standings[i].rank = standings[i - 1].rank;
    } else {
      standings[i].rank = currentRank;
    }
    currentRank++;
  }

  // DQ teams go to bottom
  standings.sort((a, b) => {
    if (a.status === 'disqualified' && b.status !== 'disqualified') return 1;
    if (a.status !== 'disqualified' && b.status === 'disqualified') return -1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return b.totalPoints - a.totalPoints;
  });

  return standings;
}

/**
 * Apply tiebreaker rule.
 * Returns negative if a should rank higher, positive if b should.
 */
function applyTiebreaker(a, b, tiebreaker, publishedMatches) {
  switch (tiebreaker) {
    case 'total_kills':
      return b.totalKills - a.totalKills;

    case 'last_match_kills': {
      const lastMatch = publishedMatches.length > 0
        ? publishedMatches[publishedMatches.length - 1]
        : null;
      if (!lastMatch) return b.totalKills - a.totalKills;
      const aResult = a.matchResults.find(m => m.matchNumber === lastMatch.matchNumber);
      const bResult = b.matchResults.find(m => m.matchNumber === lastMatch.matchNumber);
      const aKills = aResult?.kills || 0;
      const bKills = bResult?.kills || 0;
      if (bKills !== aKills) return bKills - aKills;
      return b.totalKills - a.totalKills;
    }

    case 'head_to_head': {
      // Compare placement in the most recent match
      const lastMatch = publishedMatches.length > 0
        ? publishedMatches[publishedMatches.length - 1]
        : null;
      if (!lastMatch) return b.totalKills - a.totalKills;
      const aResult = a.matchResults.find(m => m.matchNumber === lastMatch.matchNumber);
      const bResult = b.matchResults.find(m => m.matchNumber === lastMatch.matchNumber);
      const aPlace = aResult?.placement || 999;
      const bPlace = bResult?.placement || 999;
      if (aPlace !== bPlace) return aPlace - bPlace;
      return b.totalKills - a.totalKills;
    }

    default:
      return b.totalKills - a.totalKills;
  }
}

/**
 * Get the resolved scoring configuration from a tournament.
 */
export function getScoringConfig(tournament) {
  const scoring = tournament.scoring || {};

  if (scoring.preset === 'pict') {
    return { ...SCORING_PRESETS.pict, tiebreaker: scoring.tiebreaker || 'total_kills' };
  }
  if (scoring.preset === 'eagle') {
    return { ...SCORING_PRESETS.eagle, tiebreaker: scoring.tiebreaker || 'total_kills' };
  }

  // Custom
  return {
    placementPoints: scoring.placementPoints || {},
    defaultPoints: scoring.defaultPoints || 0,
    killPointValue: parseInt(scoring.killPointValue) || 1,
    killCap: parseInt(scoring.killCap) || 0,
    tiebreaker: scoring.tiebreaker || 'total_kills',
  };
}
