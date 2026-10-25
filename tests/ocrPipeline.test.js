/**
 * NSK ESPORTS — OCR Pipeline & Regression Safety Automated Test Suite
 *
 * Validates:
 * 1. IGN Normalization with real decorative symbols from Free Fire MAX screenshots.
 * 2. Levenshtein distance and similarity ratios.
 * 3. Multi-player squad fuzzy matching against tournament team rosters.
 * 4. Scoreboard line parsing and UI noise rejection.
 * 5. Squad-level grouping and kill summation (e.g. 6+2+13+4 = 25).
 * 6. Edge cases: Missing players, clan tags with numbers, duplicate detection.
 * 7. Regression safety: Scoring presets and point calculations.
 */

import {
  normalizeIGN,
  levenshteinDistance,
  similarityRatio,
  matchPlayerInTeam,
  matchSquadToTeams
} from '../src/utils/fuzzyMatch.js';

import {
  parseScoreboardLine,
  groupLinesIntoSquads
} from '../src/components/admin/ocr/freeFireOcrEngine.js';

import {
  calculateMatchPoints,
  SCORING_PRESETS
} from '../src/utils/scoring.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('🧪 RUNNING NSK ESPORTS OCR PIPELINE TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: IGN Normalization & Decorative Symbol Stripping
// ----------------------------------------------------
console.log('🔹 Test Suite 1: Free Fire IGN Normalization');
assertEqual(normalizeIGN('ᥫ᭡Abhinav'), 'abhinav', 'Strips Tai Le heart/wing symbols (ᥫ᭡)');
assertEqual(normalizeIGN('NINJA☯ATIF'), 'ninja atif', 'Strips Yin-Yang symbol (☯)');
assertEqual(normalizeIGN('S★SAGAR❣'), 's sagar', 'Strips Star and Heart ornaments (★, ❣)');
assertEqual(normalizeIGN('LOST×HAVOK'), 'lost havok', 'Strips multiplication decorator (×)');
assertEqual(normalizeIGN('IQ00✓KNOZ3R7'), 'iq00 knoz3r7', 'Strips checkmark decorator (✓)');
assertEqual(normalizeIGN('9TE iMOOGI'), '9te imoogi', 'Preserves clan tag starting with number (9TE)');
assertEqual(normalizeIGN('  WKB-FAKER69  '), 'wkb faker69', 'Normalizes dashes and whitespace');
assertEqual(normalizeIGN(''), '', 'Handles empty strings safely');
assertEqual(normalizeIGN(null), '', 'Handles null values safely');

// ----------------------------------------------------
// TEST 2: Fuzzy Similarity & Player Matching
// ----------------------------------------------------
console.log('\n🔹 Test Suite 2: String Similarity & Player Matching');
const simExact = similarityRatio('9TE iMOOGI', '9TE iMOOGI');
assert(simExact === 1.0, 'Exact match returns 1.0 similarity');

const simMinorOCR = similarityRatio('9TE iM00GI', '9TE iMOOGI'); // '0' instead of 'O'
assert(simMinorOCR >= 0.8, `Minor OCR substitution (0 vs O) achieves high similarity (${simMinorOCR.toFixed(2)})`);

const simDecorated = similarityRatio('ᥫ᭡Abhinav', 'Abhinav');
assert(simDecorated === 1.0, 'Decorated IGN matches plain registered IGN at 1.0');

const teamPlayers = [
  { ign: '9TE iMOOGI' },
  { ign: '9TE SNiXX' },
  { ign: 'JA ERENYEAGR' },
  { ign: 'AZM SCOPEX' }
];

const pMatch1 = matchPlayerInTeam('9TE iMOOGI', teamPlayers);
assertEqual(pMatch1.bestPlayer?.ign, '9TE iMOOGI', 'Matches identical player IGN');
assert(pMatch1.score >= 0.95, 'High score for identical player');

const pMatch2 = matchPlayerInTeam('JA | ERENYEAGR', teamPlayers);
assertEqual(pMatch2.bestPlayer?.ign, 'JA ERENYEAGR', 'Matches player with OCR pipe separator');
assert(pMatch2.score >= 0.85, 'High score for player with pipe separator');

// ----------------------------------------------------
// TEST 3: Multi-Player Squad to Team Roster Matching
// ----------------------------------------------------
console.log('\n🔹 Test Suite 3: Multi-Player Squad Roster Matching');
const mockTournamentTeams = [
  {
    id: 'team-9te',
    teamName: '9TE ESPORTS',
    slotNumber: 1,
    players: [
      { ign: '9TE iMOOGI' },
      { ign: '9TE SNiXX' },
      { ign: 'JA ERENYEAGR' },
      { ign: 'AZM SCOPEX' }
    ]
  },
  {
    id: 'team-godr',
    teamName: 'GODR ELITE',
    slotNumber: 4,
    players: [
      { ign: 'Abhinav' },
      { ign: 'GODR.LEADER' },
      { ign: 'AWMxKRISH' },
      { ign: 'GODR.HENT4I' }
    ]
  },
  {
    id: 'team-ninja',
    teamName: 'NINJA CLAN',
    slotNumber: 5,
    players: [
      { ign: 'NINJA ATIF' },
      { ign: 'NINJA MOAAZ' },
      { ign: 'NINJA VIPER' },
      { ign: 'NINJA Atlas' }
    ]
  }
];

// Squad 1: 4 players matching Team 9TE
const squad1 = ['9TE iMOOGI', '9TE SNiXX', 'JA | ERENYEAGR', 'AZM SCOPEX'];
const res1 = matchSquadToTeams(squad1, mockTournamentTeams);
assertEqual(res1.team?.id, 'team-9te', 'Squad 1 correctly matched to 9TE ESPORTS');
assertEqual(res1.confidence, 'high', 'Squad 1 confidence is high (all 4 players match)');
assertEqual(res1.matchedCount, 4, 'Squad 1 matched count is 4');

// Squad 4: Decorated names matching GODR
const squad4 = ['ᥫ᭡Abhinav', 'GODR.LEADER', 'AWMxKRISH', 'GODR.HENT4I'];
const res4 = matchSquadToTeams(squad4, mockTournamentTeams);
assertEqual(res4.team?.id, 'team-godr', 'Squad 4 correctly matched to GODR ELITE with decorative symbols');
assertEqual(res4.confidence, 'high', 'Squad 4 confidence is high');

// Squad with partial match (2 players registered, 2 ringers/subs)
const squadPartial = ['NINJA ATIF', 'NINJA VIPER', 'UNKNOWN_PLAYER', 'GUEST_01'];
const resPartial = matchSquadToTeams(squadPartial, mockTournamentTeams);
assertEqual(resPartial.team?.id, 'team-ninja', 'Partial squad correctly matched to NINJA CLAN');
assertEqual(resPartial.confidence, 'high', '2 of 4 registered players still yields high confidence');

// Unknown squad
const squadUnknown = ['RANDOM_A', 'RANDOM_B', 'RANDOM_C', 'RANDOM_D'];
const resUnknown = matchSquadToTeams(squadUnknown, mockTournamentTeams);
assert(resUnknown.confidence === 'none' || resUnknown.confidence === 'low', 'Completely unrecognized players yields none/low confidence');

// ----------------------------------------------------
// TEST 4: Scoreboard Line Parsing & Noise Rejection
// ----------------------------------------------------
console.log('\n🔹 Test Suite 4: Scoreboard Line Parsing');
const line1 = parseScoreboardLine('9TE iMOOGI 6 Eliminations');
assertEqual(line1?.ign, '9TE iMOOGI', 'Extracts IGN from standard line');
assertEqual(line1?.kills, 6, 'Extracts 6 kills');

const line2 = parseScoreboardLine('JA | ERENYEAGR 13 Eliminations');
assertEqual(line2?.ign, 'JA | ERENYEAGR', 'Extracts IGN with pipe');
assertEqual(line2?.kills, 13, 'Extracts 13 kills (double digits)');

const lineZero = parseScoreboardLine('GL-SHOTERX69 0 Eliminations');
assertEqual(lineZero?.kills, 0, 'Correctly handles 0 kills without nulling out');

const lineNoise1 = parseScoreboardLine('FREE FIRE');
assertEqual(lineNoise1, null, 'Rejects header noise "FREE FIRE"');

const lineNoise2 = parseScoreboardLine('BACK');
assertEqual(lineNoise2, null, 'Rejects bottom button noise "BACK"');

// ----------------------------------------------------
// TEST 5: Squad Grouping & Kill Summation
// ----------------------------------------------------
console.log('\n🔹 Test Suite 5: Squad Grouping & Kill Summation');
const rawOCRFeed = [
  '9TE iMOOGI 6 Eliminations',
  '9TE SNiXX 2 Eliminations',
  'JA | ERENYEAGR 13 Eliminations',
  'AZM SCOPEX 4 Eliminations',
  'EASY_GAME> 1 Eliminations',
  'DJ SUJAY, 6 Eliminations',
  'K!SHORE^WA 5 Eliminations',
  'ES PIKACHU 1 Eliminations',
  'GL-SHOTERX69 0 Eliminations',
  'NG,KUNAL 1 Eliminations',
  'DS FLASHHH 0 Eliminations',
  'SYREXX PR!ME 0 Eliminations'
];

const grouped = groupLinesIntoSquads(rawOCRFeed, 3, 1);
assertEqual(grouped.length, 3, 'Created 3 squads');

// Squad 1: 6 + 2 + 13 + 4 = 25
const sq1Kills = grouped[0].players.reduce((sum, p) => sum + p.kills, 0);
assertEqual(sq1Kills, 25, 'Rank 1 squad kills sum correctly to 25 (6 + 2 + 13 + 4)');
assertEqual(grouped[0].placement, 1, 'Rank 1 placement is 1');

// Squad 2: 1 + 6 + 5 + 1 = 13
const sq2Kills = grouped[1].players.reduce((sum, p) => sum + p.kills, 0);
assertEqual(sq2Kills, 13, 'Rank 2 squad kills sum correctly to 13 (1 + 6 + 5 + 1)');
assertEqual(grouped[1].placement, 2, 'Rank 2 placement is 2');

// Squad 3: 0 + 1 + 0 + 0 = 1
const sq3Kills = grouped[2].players.reduce((sum, p) => sum + p.kills, 0);
assertEqual(sq3Kills, 1, 'Rank 3 squad kills sum correctly to 1 (0 + 1 + 0 + 0)');
assertEqual(grouped[2].placement, 3, 'Rank 3 placement is 3');

// ----------------------------------------------------
// TEST 6: Regression Safety on Scoring Logic
// ----------------------------------------------------
console.log('\n🔹 Test Suite 6: Scoring Logic Regression Safety');
const pictScoring = SCORING_PRESETS.pict;
const eagleScoring = SCORING_PRESETS.eagle;

// PICT Standard: Rank 1 = 12 pts, 25 kills = 25 pts -> Total = 37 pts
const pts1 = calculateMatchPoints(1, 25, pictScoring);
assertEqual(pts1.placementPts, 12, 'PICT Rank 1 awards 12 placement points');
assertEqual(pts1.killPts, 25, 'PICT 25 kills awards 25 kill points');
assertEqual(pts1.totalPts, 37, 'PICT Rank 1 + 25 kills = 37 total points');

// Eagle Standard: Rank 1 = 10 pts, 13 kills = 13 pts -> Total = 23 pts
const pts2 = calculateMatchPoints(1, 13, eagleScoring);
assertEqual(pts2.placementPts, 10, 'Eagle Rank 1 awards 10 placement points');
assertEqual(pts2.killPts, 13, 'Eagle 13 kills awards 13 kill points');
assertEqual(pts2.totalPts, 23, 'Eagle Rank 1 + 13 kills = 23 total points');

console.log('\n====================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 All tests passed with 100% success rate!');
}
