import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Tournament from '../models/Tournament.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import MatchResult from '../models/MatchResult.js';
import Announcement from '../models/Announcement.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nsk_esports';

async function seedData() {
  console.log('====================================================');
  console.log('🌱 SEEDING DEMO ESPORTS DATA INTO MONGODB');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB');

  // 1. Seed Admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nsk-esports.in').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  let admin = await Admin.findOne({ email: adminEmail });
  if (!admin) {
    admin = await Admin.create({
      email: adminEmail,
      password: adminPassword,
      name: 'Tournament Director',
      role: 'admin'
    });
    console.log(` Admin account ready: ${adminEmail} / ${adminPassword}`);
  }

  // 2. Clear old demo data if exists
  const existingTour = await Tournament.findOne({ slug: 'nsk-championship-2026' });
  if (existingTour) {
    await Team.deleteMany({ tournamentId: existingTour._id });
    await Match.deleteMany({ tournamentId: existingTour._id });
    await MatchResult.deleteMany({ tournamentId: existingTour._id });
    await Announcement.deleteMany({ tournamentId: existingTour._id });
    await Tournament.findByIdAndDelete(existingTour._id);
  }

  // 3. Create Tournament
  const tournament = await Tournament.create({
    slug: 'nsk-championship-2026',
    status: 'ongoing',
    name: 'NSK College Championship 2026',
    organizer: 'NSK Esports Association',
    tagline: 'The Ultimate Free Fire Max College Battle',
    game: 'Free Fire Max',
    teamFormat: 'Squad (4 Players)',
    schedule: {
      date: new Date(Date.now() + 86400000 * 2),
      regDeadline: new Date(Date.now() + 86400000),
      roomReleaseTime: '05:45 PM',
      matchStartTime: '06:00 PM',
      numMatches: 4
    },
    slots: {
      total: 12,
      filled: 6
    },
    entry: {
      fee: 200,
      upiId: 'nskesports@upi',
      qrCodeUrl: ''
    },
    prizes: [
      { position: '1st', amount: 5000, label: 'Champions Trophy + Cash' },
      { position: '2nd', amount: 3000, label: 'Runner-up Cash' },
      { position: '3rd', amount: 1500, label: '2nd Runner-up Cash' }
    ],
    qualifier: {
      enabled: true,
      topN: 4,
      roundName: 'Grand Finals Inter-College'
    },
    scoring: {
      preset: 'pict',
      placementPoints: {
        "1": 12, "2": 9, "3": 8, "4": 7, "5": 6,
        "6": 5, "7": 4, "8": 3, "9": 2, "10": 1
      },
      killPointValue: 1,
      killCap: 0,
      tiebreaker: 'total_kills'
    },
    rules: [
      'Emulators and tablets are strictly prohibited.',
      'All players must use standard mobile devices.',
      'Team leaders must join WhatsApp group for room ID & password.',
      'Any use of third-party hacks results in immediate team disqualification.'
    ],
    regFields: {
      college: true,
      transactionId: true,
      paymentScreenshot: true
    },
    contact: {
      whatsapp: '9876543210',
      whatsappGroup: 'https://chat.whatsapp.com/demo',
      discord: 'https://discord.gg/demo',
      instagram: '@nsk_esports'
    }
  });
  console.log(` Tournament created: ${tournament.name} (${tournament.slug})`);

  // 4. Create Matches
  const matches = await Match.insertMany([
    {
      tournamentId: tournament._id,
      matchNumber: 1,
      roomId: '987452',
      password: 'FF2026MATCH1',
      roomReleased: true,
      published: true,
      publishedAt: new Date()
    },
    {
      tournamentId: tournament._id,
      matchNumber: 2,
      roomId: '987453',
      password: 'FF2026MATCH2',
      roomReleased: true,
      published: true,
      publishedAt: new Date()
    },
    {
      tournamentId: tournament._id,
      matchNumber: 3,
      roomId: '',
      password: '',
      roomReleased: false,
      published: false
    },
    {
      tournamentId: tournament._id,
      matchNumber: 4,
      roomId: '',
      password: '',
      roomReleased: false,
      published: false
    }
  ]);
  console.log(` Created ${matches.length} matches`);

  // 5. Create Teams
  const teamsData = [
    {
      teamName: 'Total Gaming Army',
      leaderName: 'Ajay Sharma',
      leaderWhatsapp: '9876500001',
      college: 'PICT Pune',
      slotNumber: 1,
      status: 'confirmed',
      players: [
        { ign: 'TG_Ajjubhai', uid: '11223344', role: 'Leader' },
        { ign: 'TG_FozyAjay', uid: '11223345', role: 'Member' },
        { ign: 'TG_Mafia', uid: '11223346', role: 'Member' },
        { ign: 'TG_Bala', uid: '11223347', role: 'Member' }
      ]
    },
    {
      teamName: 'GodLike Esports',
      leaderName: 'Suraj Singh',
      leaderWhatsapp: '9876500002',
      college: 'COEP Tech',
      slotNumber: 2,
      status: 'confirmed',
      players: [
        { ign: 'GODL_Jonathan', uid: '22334455', role: 'Leader' },
        { ign: 'GODL_ClutchGod', uid: '22334456', role: 'Member' },
        { ign: 'GODL_Zgod', uid: '22334457', role: 'Member' },
        { ign: 'GODL_Shadow', uid: '22334458', role: 'Member' }
      ]
    },
    {
      teamName: 'Hydra Clan',
      leaderName: 'Aman Patel',
      leaderWhatsapp: '9876500003',
      college: 'VJTI Mumbai',
      slotNumber: 3,
      status: 'confirmed',
      players: [
        { ign: 'HYDRA_Dynamo', uid: '33445566', role: 'Leader' },
        { ign: 'HYDRA_Alpha', uid: '33445567', role: 'Member' },
        { ign: 'HYDRA_HemanT', uid: '33445568', role: 'Member' },
        { ign: 'HYDRA_Blade', uid: '33445569', role: 'Member' }
      ]
    },
    {
      teamName: 'Team SouL',
      leaderName: 'Naman Mathur',
      leaderWhatsapp: '9876500004',
      college: 'MIT WPU',
      slotNumber: 4,
      status: 'confirmed',
      players: [
        { ign: 'SOUL_Mortal', uid: '44556677', role: 'Leader' },
        { ign: 'SOUL_Viper', uid: '44556678', role: 'Member' },
        { ign: 'SOUL_Regaltos', uid: '44556679', role: 'Member' },
        { ign: 'SOUL_Goblin', uid: '44556680', role: 'Member' }
      ]
    },
    {
      teamName: 'Revenant Warriors',
      leaderName: 'Rohit Kulkarni',
      leaderWhatsapp: '9876500005',
      college: 'VIT Pune',
      slotNumber: 5,
      status: 'confirmed',
      players: [
        { ign: 'RVT_Sensei', uid: '55667788', role: 'Leader' },
        { ign: 'RVT_Kyoya', uid: '55667789', role: 'Member' },
        { ign: 'RVT_Smoke', uid: '55667790', role: 'Member' },
        { ign: 'RVT_Flash', uid: '55667791', role: 'Member' }
      ]
    },
    {
      teamName: 'Velocity Gaming',
      leaderName: 'Kunal Deshmukh',
      leaderWhatsapp: '9876500006',
      college: 'Symbiosis Pune',
      slotNumber: 6,
      status: 'disqualified',
      dqReason: 'Violation of fair play policy in Match 1',
      players: [
        { ign: 'VLT_Excal', uid: '66778899', role: 'Leader' },
        { ign: 'VLT_Marzil', uid: '66778800', role: 'Member' }
      ]
    }
  ];

  const createdTeams = await Team.insertMany(
    teamsData.map(t => ({ ...t, tournamentId: tournament._id }))
  );
  console.log(` Created ${createdTeams.length} teams`);

  // 6. Create Match Results for Matches 1 & 2
  const resultsData = [
    // Match 1
    { matchId: matches[0]._id, teamId: createdTeams[0]._id, placement: 1, kills: 8, placementPts: 12, killPts: 8, totalPts: 20 },
    { matchId: matches[0]._id, teamId: createdTeams[1]._id, placement: 2, kills: 6, placementPts: 9, killPts: 6, totalPts: 15 },
    { matchId: matches[0]._id, teamId: createdTeams[2]._id, placement: 3, kills: 4, placementPts: 8, killPts: 4, totalPts: 12 },
    { matchId: matches[0]._id, teamId: createdTeams[3]._id, placement: 4, kills: 3, placementPts: 7, killPts: 3, totalPts: 10 },
    { matchId: matches[0]._id, teamId: createdTeams[4]._id, placement: 5, kills: 1, placementPts: 6, killPts: 1, totalPts: 7 },

    // Match 2
    { matchId: matches[1]._id, teamId: createdTeams[1]._id, placement: 1, kills: 10, placementPts: 12, killPts: 10, totalPts: 22 },
    { matchId: matches[1]._id, teamId: createdTeams[3]._id, placement: 2, kills: 5, placementPts: 9, killPts: 5, totalPts: 14 },
    { matchId: matches[1]._id, teamId: createdTeams[0]._id, placement: 3, kills: 3, placementPts: 8, killPts: 3, totalPts: 11 },
    { matchId: matches[1]._id, teamId: createdTeams[2]._id, placement: 4, kills: 2, placementPts: 7, killPts: 2, totalPts: 9 },
    { matchId: matches[1]._id, teamId: createdTeams[4]._id, placement: 5, kills: 0, placementPts: 6, killPts: 0, totalPts: 6 }
  ];

  await MatchResult.insertMany(
    resultsData.map(r => ({ ...r, tournamentId: tournament._id }))
  );
  console.log(` Created ${resultsData.length} match results`);

  // 7. Announcements
  await Announcement.create({
    tournamentId: tournament._id,
    text: 'Match 1 & 2 Results are published! Check the leaderboard for updated standings. Match 3 starts at 07:15 PM!'
  });
  console.log(' Added announcement');

  console.log('\n====================================================');
  console.log(' DEMO DATA SUCCESSFULLY SEEDED INTO MONGODB');
  console.log('====================================================');
  console.log(`Tournament Slug: ${tournament.slug}`);
  console.log(`Admin Login:     ${adminEmail} / ${adminPassword}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
}

seedData().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
