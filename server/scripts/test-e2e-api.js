import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import app from '../app.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nsk_esports';
const TEST_PORT = 5001;

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 RUNNING END-TO-END REST API INTEGRATION TESTS');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(` Express Test Server running on port ${TEST_PORT}\n`);

  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

  try {
    // 1. Healthcheck
    console.log('[Test 1] Health Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'ok') {
      console.log(' GET /api/health: PASS');
    } else {
      throw new Error('Health check failed');
    }

    // 2. Admin Login
    console.log('\n[Test 2] Admin Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'parikshitpatil006@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Admin login failed: ${loginData.message}`);
    }
    const token = loginData.token;
    console.log(` POST /api/auth/login: PASS (Token acquired)`);

    // 3. Admin Session Verification
    console.log('\n[Test 3] Admin Session Verification (/api/auth/me)...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (meRes.ok && meData.admin?.email) {
      console.log(` GET /api/auth/me: PASS (${meData.admin.email})`);
    } else {
      throw new Error('Admin auth verification failed');
    }

    // 4. Public Tournaments List
    console.log('\n[Test 4] Public Tournaments List (/api/tournaments)...');
    const toursRes = await fetch(`${BASE_URL}/tournaments`);
    const toursData = await toursRes.json();
    if (toursRes.ok && Array.isArray(toursData.data)) {
      console.log(` GET /api/tournaments: PASS (${toursData.data.length} tournaments listed)`);
    } else {
      throw new Error('Public tournament listing failed');
    }

    // 5. Get Tournament by Slug
    console.log('\n[Test 5] Get Tournament by Slug...');
    const slugRes = await fetch(`${BASE_URL}/tournaments/slug/nsk-championship-2026`);
    const slugData = await slugRes.json();
    if (!slugRes.ok || !slugData.data) {
      throw new Error('Failed to fetch tournament by slug');
    }
    const tournamentId = slugData.data._id;
    console.log(` GET /api/tournaments/slug/nsk-championship-2026: PASS (ID: ${tournamentId})`);

    // 6. Get Full Tournament (Admin)
    console.log('\n[Test 6] Get Full Tournament with matches & teams...');
    const fullRes = await fetch(`${BASE_URL}/tournaments/${tournamentId}/full`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fullData = await fullRes.json();
    if (fullRes.ok && fullData.data?.teams?.length > 0 && fullData.data?.matches?.length > 0) {
      console.log(` GET /api/tournaments/:id/full: PASS (${fullData.data.teams.length} teams, ${fullData.data.matches.length} matches)`);
    } else {
      throw new Error('Failed to get full tournament');
    }

    // 7. Live Leaderboard Calculation
    console.log('\n[Test 7] Live Leaderboard Calculation...');
    const lbRes = await fetch(`${BASE_URL}/matches/tournament/${tournamentId}/leaderboard`);
    const lbData = await lbRes.json();
    if (lbRes.ok && Array.isArray(lbData.data) && lbData.data.length > 0) {
      console.log(` GET /api/matches/tournament/:id/leaderboard: PASS`);
      console.log(` Top 3 Standings:`);
      lbData.data.slice(0, 3).forEach(team => {
        console.log(`   #${team.rank} ${team.teamName} — ${team.totalPoints} pts (${team.totalKills} kills)`);
      });
    } else {
      throw new Error('Leaderboard fetch failed');
    }

    // 8. Team Portal Login
    console.log('\n[Test 8] Team Portal Login...');
    const portalRes = await fetch(`${BASE_URL}/teams/portal-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId,
        teamName: 'Total Gaming Army',
        phone: '9876500001'
      })
    });
    const portalData = await portalRes.json();
    if (portalRes.ok && portalData.data?.teamName === 'Total Gaming Army') {
      console.log(` POST /api/teams/portal-login: PASS (Logged into squad ${portalData.data.teamName}, Slot #${portalData.data.slotNumber})`);
    } else {
      throw new Error('Team portal login failed');
    }

    // 9. Duplicate IGN Detection
    console.log('\n[Test 9] Duplicate IGN Detection...');
    const dupRes = await fetch(`${BASE_URL}/teams/tournament/${tournamentId}/check-duplicate-ign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ igns: ['TG_Ajjubhai', 'brand_new_ign_999'] })
    });
    const dupData = await dupRes.json();
    if (dupRes.ok && dupData.data?.length === 1 && dupData.data[0].ign === 'TG_Ajjubhai') {
      console.log(` POST /api/teams/:id/check-duplicate-ign: PASS (Detected taken IGN "${dupData.data[0].ign}" in team "${dupData.data[0].teamName}")`);
    } else {
      throw new Error('Duplicate IGN check failed');
    }

    // 10. Announcements
    console.log('\n[Test 10] Announcements...');
    const annRes = await fetch(`${BASE_URL}/announcements/tournament/${tournamentId}`);
    const annData = await annRes.json();
    if (annRes.ok && Array.isArray(annData.data) && annData.data.length > 0) {
      console.log(` GET /api/announcements/tournament/:id: PASS ("${annData.data[0].text}")`);
    } else {
      throw new Error('Announcements check failed');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 10 END-TO-END REST API TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runE2ETests().catch(err => {
  console.error('❌ E2E API Tests failed:', err);
  process.exit(1);
});
