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

export function getPlacementPoints(position, scoring) {
  const placementMap = scoring.placementPoints || {};
  // Handles both Map and plain object
  const val = placementMap instanceof Map ? placementMap.get(String(position)) : placementMap[position];
  if (val !== undefined && val !== null) {
    return parseInt(val) || 0;
  }
  return parseInt(scoring.defaultPoints) || 0;
}

export function getKillPoints(kills, scoring) {
  const killPts = (kills || 0) * (parseFloat(scoring.killPointValue) || 1);
  const cap = parseInt(scoring.killCap) || 0;
  if (cap > 0 && killPts > cap) return cap;
  return killPts;
}

export function calculateMatchPoints(placement, kills, scoring) {
  const placementPts = getPlacementPoints(placement, scoring);
  const killPts = getKillPoints(kills, scoring);
  return {
    placementPts,
    killPts,
    totalPts: placementPts + killPts,
  };
}

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
    killPointValue: parseFloat(scoring.killPointValue) || 1,
    killCap: parseInt(scoring.killCap) || 0,
    tiebreaker: scoring.tiebreaker || 'total_kills',
  };
}

export function buildLeaderboardFromData(tournament, teams, matches, results) {
  if (!tournament) return [];

  const scoring = getScoringConfig(tournament);
  const confirmedTeams = (teams || []).filter(
    t => t.status === 'confirmed' || t.status === 'disqualified'
  );
  const publishedMatches = (matches || []).filter(m => m.published);
  const publishedMatchIds = new Set(publishedMatches.map(m => m._id.toString()));

  const standings = confirmedTeams.map(team => {
    const teamIdStr = team._id.toString();
    const matchResultsMap = {};
    let totalKills = 0;
    let totalPoints = 0;

    for (const match of matches || []) {
      const matchNum = match.matchNumber;
      const isPublished = match.published;
      const matchResult = (results || []).find(
        r => r.teamId.toString() === teamIdStr && r.matchId.toString() === match._id.toString()
      );

      if (matchResult && isPublished) {
        const pts = calculateMatchPoints(matchResult.placement, matchResult.kills, scoring);
        matchResultsMap[matchNum] = {
          matchNumber: matchNum,
          placement: matchResult.placement,
          kills: matchResult.kills,
          ...pts,
          total: pts.totalPts
        };
        totalKills += matchResult.kills;
        totalPoints += pts.totalPts;
      } else {
        matchResultsMap[matchNum] = {
          matchNumber: matchNum,
          placement: null,
          kills: null,
          placementPts: null,
          killPts: null,
          totalPts: null,
          total: null
        };
      }
    }

    return {
      id: team._id,
      teamId: team._id,
      teamName: team.teamName,
      slotNumber: team.slotNumber,
      status: team.status,
      matchResults: matchResultsMap,
      totalKills,
      totalPoints,
      totalPts: totalPoints,
      rank: 0,
    };
  });

  // Sort by total points descending, then apply tiebreaker
  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return applyTiebreaker(a, b, scoring.tiebreaker, publishedMatches);
  });

  // Assign ranks
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

function applyTiebreaker(a, b, tiebreaker, publishedMatches) {
  switch (tiebreaker) {
    case 'total_kills':
      return b.totalKills - a.totalKills;

    case 'last_match_kills': {
      const lastMatch = publishedMatches.length > 0
        ? publishedMatches[publishedMatches.length - 1]
        : null;
      if (!lastMatch) return b.totalKills - a.totalKills;
      const aResult = a.matchResults[lastMatch.matchNumber];
      const bResult = b.matchResults[lastMatch.matchNumber];
      const aKills = aResult?.kills || 0;
      const bKills = bResult?.kills || 0;
      if (bKills !== aKills) return bKills - aKills;
      return b.totalKills - a.totalKills;
    }

    case 'head_to_head': {
      const lastMatch = publishedMatches.length > 0
        ? publishedMatches[publishedMatches.length - 1]
        : null;
      if (!lastMatch) return b.totalKills - a.totalKills;
      const aResult = a.matchResults[lastMatch.matchNumber];
      const bResult = b.matchResults[lastMatch.matchNumber];
      const aPlace = aResult?.placement || 999;
      const bPlace = bResult?.placement || 999;
      if (aPlace !== bPlace) return aPlace - bPlace;
      return b.totalKills - a.totalKills;
    }

    default:
      return b.totalKills - a.totalKills;
  }
}
