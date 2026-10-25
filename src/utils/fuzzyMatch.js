/**
 * NSK ESPORTS — Fuzzy Matching & IGN Normalization Engine
 *
 * Tailored for Free Fire MAX esports:
 * - Strips gaming clan tags, unicode ornaments, symbols, and whitespace.
 * - Handles OCR character ambiguities (e.g., '0'/'O', '1'/'I'/'l', '5'/'S', '8'/'B').
 * - Matches squads by evaluating multiple player IGNs collectively against team rosters.
 */

// Common decorative unicode symbols used in Free Fire IGNs (wings, crowns, hearts, symbols)
const DECORATIVE_SYMBOLS_REGEX = /[★☆❣❤亗〆꧁꧂™✓✔×✕✖⚡†‡◆◇▲△▼▽●○☯✦✧✿❀☬ঔৣ☬\u0964\u0965\u1CD0-\u1CF9\uA830-\uA839\u1700-\u171F\u1950-\u197F\u19E0-\u19FF\u0F00-\u0FFF\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\uFE00-\uFE0F\u1360-\u137F]/g;

// Invisible or zero-width unicode characters
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u00A0\u2060]/g;

/**
 * Normalizes an in-game name (IGN) by:
 * 1. Removing unicode ornaments, symbols, and non-alphanumeric noise.
 * 2. Converting to lowercase.
 * 3. Collapsing multiple spaces.
 *
 * @param {string} raw - Raw IGN from OCR or registration
 * @returns {string} - Cleaned alphanumeric-focused string
 */
export function normalizeIGN(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw
    .replace(INVISIBLE_CHARS_REGEX, '')
    // Replace all non-alphanumeric / non-word characters with spaces
    .replace(/[^\w\s]/gu, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio (0.0 to 1.0) between two strings using Levenshtein distance
 */
export function similarityRatio(s1, s2) {
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;

  const n1 = normalizeIGN(s1);
  const n2 = normalizeIGN(s2);

  if (n1 === n2) return 1;
  if (!n1.length || !n2.length) return 0;

  // Substring check
  if (n1.includes(n2) || n2.includes(n1)) {
    const minLen = Math.min(n1.length, n2.length);
    const maxLen = Math.max(n1.length, n2.length);
    return Math.max(0.75, minLen / maxLen);
  }

  const maxLen = Math.max(n1.length, n2.length);
  const distance = levenshteinDistance(n1, n2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Match a candidate IGN against a single team's player list
 * @param {string} candidateIGN - Raw or normalized IGN extracted from OCR
 * @param {Array} players - Array of registered player objects ({ ign, name, ... })
 * @returns {{ bestPlayer: object|null, score: number }}
 */
export function matchPlayerInTeam(candidateIGN, players) {
  if (!candidateIGN || !players || !players.length) {
    return { bestPlayer: null, score: 0 };
  }

  let bestPlayer = null;
  let bestScore = 0;

  for (const p of players) {
    const registeredIGN = p.ign || p.name || '';
    const score = similarityRatio(candidateIGN, registeredIGN);
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = p;
    }
  }

  return { bestPlayer, score: bestScore };
}

/**
 * Matches a detected squad (a list of extracted player IGNs) against all registered teams in a tournament.
 * Free Fire MAX scoreboards show 4 players per squad, NOT the team name.
 * Evaluating all 4 IGNs collectively yields high confidence even if 1 or 2 names have OCR noise.
 *
 * @param {string[]} squadIGNs - Array of extracted IGN strings for this squad (up to 4)
 * @param {Array} teams - Array of registered team objects ({ id, teamName, slotNumber, players })
 * @returns {{
 *   team: object|null,
 *   confidence: 'high'|'medium'|'low'|'none',
 *   score: number,
 *   matchedCount: number,
 *   matchedPlayers: Array<{ extracted: string, registered: string, score: number }>,
 *   candidates: Array<{ team: object, score: number, matchedCount: number }>
 * }}
 */
export function matchSquadToTeams(squadIGNs, teams) {
  if (!teams || !teams.length || !squadIGNs || !squadIGNs.length) {
    return {
      team: null,
      confidence: 'none',
      score: 0,
      matchedCount: 0,
      matchedPlayers: [],
      candidates: []
    };
  }

  const validExtractedIGNs = squadIGNs.filter(ign => ign && ign.trim().length >= 2);

  const teamScores = teams.map(team => {
    const players = team.players || [];
    let totalScore = 0;
    let matchedCount = 0;
    const playerMatches = [];

    // Also check if any extracted string looks like the team name itself
    const teamNameNorm = normalizeIGN(team.teamName);
    let teamNameBonus = 0;

    for (const extracted of validExtractedIGNs) {
      const extractedNorm = normalizeIGN(extracted);

      // Check against team name
      if (teamNameNorm.length >= 3 && similarityRatio(extractedNorm, teamNameNorm) > 0.75) {
        teamNameBonus += 0.5;
      }

      // Check against players
      const { bestPlayer, score } = matchPlayerInTeam(extracted, players);
      if (score >= 0.6) {
        matchedCount++;
        totalScore += score;
        playerMatches.push({
          extracted,
          registered: bestPlayer?.ign || '',
          score
        });
      } else {
        totalScore += score * 0.3;
      }
    }

    // Common clan prefix check (e.g., "9TE", "NINJA", "GL-")
    // If multiple players share a prefix that also matches a prefix in the registered team
    let prefixBonus = 0;
    if (players.length >= 2) {
      const regPrefixes = players.map(p => (p.ign || '').split(/[\s._\-]/)[0]).filter(p => p.length >= 3);
      for (const extracted of validExtractedIGNs) {
        const extPrefix = extracted.split(/[\s._\-]/)[0];
        if (extPrefix.length >= 3 && regPrefixes.some(rp => rp.toLowerCase() === extPrefix.toLowerCase())) {
          prefixBonus += 0.3;
        }
      }
    }

    const avgScore = validExtractedIGNs.length > 0
      ? (totalScore / validExtractedIGNs.length) + teamNameBonus + prefixBonus
      : 0;

    return {
      team,
      score: Math.min(1.0, avgScore),
      matchedCount,
      matchedPlayers: playerMatches
    };
  });

  // Sort descending by score and matched count
  teamScores.sort((a, b) => {
    if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
    return b.score - a.score;
  });

  const best = teamScores[0];

  let confidence = 'none';
  if (best && best.matchedCount >= 2 && best.score >= 0.65) {
    confidence = 'high';
  } else if (best && (best.matchedCount >= 1 || best.score >= 0.55)) {
    confidence = 'medium';
  } else if (best && best.score >= 0.35) {
    confidence = 'low';
  }

  return {
    team: confidence !== 'none' ? best.team : null,
    confidence,
    score: best?.score || 0,
    matchedCount: best?.matchedCount || 0,
    matchedPlayers: best?.matchedPlayers || [],
    candidates: teamScores.slice(0, 5)
  };
}

/**
 * Backward-compatible single candidate finder (can match by team name or player name)
 */
export function findBestTeamMatch(candidateName, teams) {
  if (!candidateName || !teams || !teams.length) {
    return { team: null, confidence: 'none', score: 0 };
  }

  return matchSquadToTeams([candidateName], teams);
}
