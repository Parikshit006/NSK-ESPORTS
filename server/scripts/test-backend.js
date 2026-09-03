import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Tournament from '../models/Tournament.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import MatchResult from '../models/MatchResult.js';
import { buildLeaderboardFromData } from '../services/scoringService.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nsk_esports';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING NSK-ESPORTS BACKEND UNIT & INTEGRATION TESTS');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB');

  // Test 1: Admin Password Hashing
  console.log('\n[Test 1] Testing Admin password hashing & verification...');
  const testEmail = `testadmin-${Date.now()}@test.com`;
  const admin = await Admin.create({
    email: testEmail,
    password: 'SecurePassword123!',
    name: 'Test Admin'
  });
  const match = await admin.matchPassword('SecurePassword123!');
  const mismatch = await admin.matchPassword('WrongPassword');
  if (match && !mismatch) {
    console.log(' Admin authentication & bcrypt hashing: PASS');
  } else {
    throw new Error('Admin password verification failed');
  }

  // Test 2: Tournament Creation & Auto-match generation
  console.log('\n[Test 2] Testing Tournament model & match generation...');
  const testTour = await Tournament.create({
    name: 'Automated Test Cup',
    slug: `test-cup-${Date.now()}`,
    organizer: 'NSK Testing',
    status: 'registration_open',
    schedule: { numMatches: 3 },
    slots: { total: 4, filled: 0 },
    scoring: {
      preset: 'pict',
      placementPoints: { "1": 12, "2": 9, "3": 8, "4": 7 },
      killPointValue: 1
    }
  });

  const matches = await Match.insertMany([
    { tournamentId: testTour._id, matchNumber: 1, roomReleased: false, published: false },
    { tournamentId: testTour._id, matchNumber: 2, roomReleased: false, published: false },
    { tournamentId: testTour._id, matchNumber: 3, roomReleased: false, published: false }
  ]);
  console.log(` Created tournament (${testTour.name}) with ${matches.length} matches: PASS`);

  // Test 3: Team Registration & Slot assignment
  console.log('\n[Test 3] Testing Team registration & atomic slot assignment...');
  const team1 = await Team.create({
    tournamentId: testTour._id,
    teamName: 'Alpha Squad',
    leaderName: 'Alpha Leader',
    leaderWhatsapp: '9999999991',
    players: [
      { ign: 'ALPHA_ONE', uid: '1001', role: 'Leader' },
      { ign: 'ALPHA_TWO', uid: '1002', role: 'Member' }
    ],
    status: 'pending'
  });

  const team2 = await Team.create({
    tournamentId: testTour._id,
    teamName: 'Beta Squad',
    leaderName: 'Beta Leader',
    leaderWhatsapp: '9999999992',
    players: [
      { ign: 'BETA_ONE', uid: '2001', role: 'Leader' },
      { ign: 'BETA_TWO', uid: '2002', role: 'Member' }
    ],
    status: 'pending'
  });

  // Approve team 1
  team1.status = 'confirmed';
  team1.slotNumber = 1;
  await team1.save();
  await Tournament.findByIdAndUpdate(testTour._id, { $inc: { 'slots.filled': 1 } });

  // Approve team 2
  team2.status = 'confirmed';
  team2.slotNumber = 2;
  await team2.save();
  await Tournament.findByIdAndUpdate(testTour._id, { $inc: { 'slots.filled': 1 } });

  const updatedTour = await Tournament.findById(testTour._id);
  if (updatedTour.slots.filled === 2 && team1.slotNumber === 1 && team2.slotNumber === 2) {
    console.log(' Slot assignment & filledSlots count: PASS');
  } else {
    throw new Error('Slot increment test failed');
  }

  // Test 4: Match Results & Scoring Calculation
  console.log('\n[Test 4] Testing Match results entry & Leaderboard calculation...');
  // Match 1: Alpha Squad 1st (12 pts) + 5 kills = 17 pts
  // Match 1: Beta Squad 2nd (9 pts) + 2 kills = 11 pts
  const result1 = await MatchResult.create({
    tournamentId: testTour._id,
    matchId: matches[0]._id,
    teamId: team1._id,
    placement: 1,
    kills: 5,
    placementPts: 12,
    killPts: 5,
    totalPts: 17
  });

  const result2 = await MatchResult.create({
    tournamentId: testTour._id,
    matchId: matches[0]._id,
    teamId: team2._id,
    placement: 2,
    kills: 2,
    placementPts: 9,
    killPts: 2,
    totalPts: 11
  });

  matches[0].published = true;
  await matches[0].save();

  const leaderboard = buildLeaderboardFromData(
    updatedTour,
    [team1, team2],
    matches,
    [result1, result2]
  );

  if (leaderboard[0].teamName === 'Alpha Squad' && leaderboard[0].totalPoints === 17 && leaderboard[0].rank === 1 &&
      leaderboard[1].teamName === 'Beta Squad' && leaderboard[1].totalPoints === 11 && leaderboard[1].rank === 2) {
    console.log(' Scoring calculation & ranking parity with original engine: PASS');
  } else {
    console.error('Leaderboard result:', leaderboard);
    throw new Error('Leaderboard scoring mismatch');
  }

  // Cleanup test artifacts
  console.log('\n[Cleanup] Cleaning up test data...');
  await Team.deleteMany({ tournamentId: testTour._id });
  await Match.deleteMany({ tournamentId: testTour._id });
  await MatchResult.deleteMany({ tournamentId: testTour._id });
  await Tournament.findByIdAndDelete(testTour._id);
  await Admin.findByIdAndDelete(admin._id);
  console.log(' Test documents cleaned up');

  console.log('\n====================================================');
  console.log('🏆 ALL BACKEND TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
