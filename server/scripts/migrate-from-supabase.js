import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import Tournament from '../models/Tournament.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';
import MatchResult from '../models/MatchResult.js';
import Announcement from '../models/Announcement.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nsk_esports';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log('====================================================');
  console.log('🔄 STARTING SUPABASE TO MONGODB MIGRATION');
  console.log('====================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB');

  // Step 1: Extract from Supabase
  console.log('📦 Fetching data from Supabase...');
  const { data: tournaments, error: tourError } = await supabase.from('tournaments').select('*');
  if (tourError) throw tourError;

  const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
  if (teamsError) throw teamsError;

  const { data: matches, error: matchError } = await supabase.from('matches').select('*');
  if (matchError) throw matchError;

  const { data: results, error: resultsError } = await supabase.from('match_results').select('*');
  if (resultsError) throw resultsError;

  const { data: announcements, error: annError } = await supabase.from('announcements').select('*');
  if (annError) throw annError;

  console.log(`Extracted from PostgreSQL/Supabase:`);
  console.log(`- Tournaments: ${tournaments?.length || 0}`);
  console.log(`- Teams: ${teams?.length || 0}`);
  console.log(`- Matches: ${matches?.length || 0}`);
  console.log(`- Match Results: ${results?.length || 0}`);
  console.log(`- Announcements: ${announcements?.length || 0}\n`);

  // Mapping tables: Old UUID -> New MongoDB ObjectId
  const tournamentIdMap = new Map();
  const teamIdMap = new Map();
  const matchIdMap = new Map();

  // Step 2: Migrate Tournaments
  console.log('⏳ Migrating Tournaments...');
  for (const t of (tournaments || [])) {
    let mongoTour = await Tournament.findOne({ slug: t.slug });
    if (!mongoTour) {
      mongoTour = await Tournament.create({
        slug: t.slug,
        status: t.status || 'draft',
        name: t.name,
        organizer: t.organizer,
        tagline: t.tagline || '',
        bannerUrl: t.banner_url || '',
        game: t.game || 'Free Fire Max',
        teamFormat: t.team_format || 'Squad (4 Players)',
        schedule: {
          date: t.tournament_date ? new Date(t.tournament_date) : null,
          regDeadline: t.reg_deadline ? new Date(t.reg_deadline) : null,
          roomReleaseTime: t.room_release_time || '',
          matchStartTime: t.match_start_time || '',
          numMatches: t.num_matches || 6
        },
        slots: {
          total: t.total_slots || 12,
          filled: t.filled_slots || 0
        },
        entry: {
          fee: t.entry_fee || 0,
          upiId: t.upi_id || '',
          qrCodeUrl: t.qr_code_url || ''
        },
        prizes: t.prizes || [],
        qualifier: {
          enabled: t.qualifier_enabled || false,
          topN: t.qualifier_top_n || 4,
          roundName: t.qualifier_round_name || 'Inter-College Round'
        },
        scoring: {
          preset: t.scoring_preset || 'pict',
          placementPoints: t.placement_points || {},
          killPointValue: parseFloat(t.kill_point_value) || 1.0,
          killCap: t.kill_cap || 0,
          tiebreaker: t.tiebreaker || 'total_kills'
        },
        rules: t.rules || [],
        regFields: {
          college: t.show_college || false,
          transactionId: t.show_txn_id !== false,
          paymentScreenshot: t.show_screenshot !== false
        },
        contact: {
          whatsapp: t.contact_whatsapp || '',
          whatsappGroup: t.contact_whatsapp_group || '',
          discord: t.contact_discord || '',
          instagram: t.contact_instagram || ''
        },
        legacyId: t.id
      });
    }
    tournamentIdMap.set(t.id, mongoTour._id);
  }
  console.log(' Tournaments migrated');

  // Step 3: Migrate Teams
  console.log('⏳ Migrating Teams...');
  for (const tm of (teams || [])) {
    const mongoTourId = tournamentIdMap.get(tm.tournament_id);
    if (!mongoTourId) {
      console.warn(`⚠️ Warning: Team "${tm.team_name}" references missing tournament ${tm.tournament_id}`);
      continue;
    }

    let mongoTeam = await Team.findOne({ tournamentId: mongoTourId, teamName: tm.team_name });
    if (!mongoTeam) {
      mongoTeam = await Team.create({
        tournamentId: mongoTourId,
        teamName: tm.team_name,
        leaderName: tm.leader_name || 'Leader',
        leaderWhatsapp: tm.leader_whatsapp || '',
        college: tm.college || '',
        players: tm.players || [],
        payment: {
          transactionId: tm.transaction_id || null,
          screenshotPath: tm.screenshot_url || null
        },
        status: tm.status || 'pending',
        slotNumber: tm.slot_number || null,
        rejectionReason: tm.rejection_reason || null,
        dqReason: tm.dq_reason || null,
        legacyId: tm.id
      });
    }
    teamIdMap.set(tm.id, mongoTeam._id);
  }
  console.log(' Teams migrated');

  // Step 4: Migrate Matches
  console.log('⏳ Migrating Matches...');
  for (const m of (matches || [])) {
    const mongoTourId = tournamentIdMap.get(m.tournament_id);
    if (!mongoTourId) {
      console.warn(`⚠️ Warning: Match ${m.match_number} references missing tournament ${m.tournament_id}`);
      continue;
    }

    let mongoMatch = await Match.findOne({ tournamentId: mongoTourId, matchNumber: m.match_number });
    if (!mongoMatch) {
      mongoMatch = await Match.create({
        tournamentId: mongoTourId,
        matchNumber: m.match_number,
        roomId: m.room_id || '',
        password: m.password || '',
        roomReleased: m.room_released || false,
        published: m.published || false,
        publishedAt: m.published_at ? new Date(m.published_at) : null,
        legacyId: m.id
      });
    }
    matchIdMap.set(m.id, mongoMatch._id);
  }
  console.log(' Matches migrated');

  // Step 5: Migrate Match Results
  console.log('⏳ Migrating Match Results...');
  for (const r of (results || [])) {
    const mongoMatchId = matchIdMap.get(r.match_id);
    const mongoTeamId = teamIdMap.get(r.team_id);
    const mongoTourId = tournamentIdMap.get(r.tournament_id);

    if (!mongoMatchId || !mongoTeamId || !mongoTourId) {
      console.warn(`⚠️ Warning: Result references missing match/team/tournament (${r.id})`);
      continue;
    }

    await MatchResult.findOneAndUpdate(
      { matchId: mongoMatchId, teamId: mongoTeamId },
      {
        tournamentId: mongoTourId,
        matchId: mongoMatchId,
        teamId: mongoTeamId,
        placement: r.placement,
        kills: r.kills || 0,
        placementPts: parseFloat(r.placement_pts) || 0,
        killPts: parseFloat(r.kill_pts) || 0,
        totalPts: parseFloat(r.total_pts) || 0,
        legacyId: r.id
      },
      { upsert: true, new: true }
    );
  }
  console.log(' Match Results migrated');

  // Step 6: Migrate Announcements
  console.log('⏳ Migrating Announcements...');
  for (const a of (announcements || [])) {
    const mongoTourId = tournamentIdMap.get(a.tournament_id);
    if (!mongoTourId) continue;

    await Announcement.findOneAndUpdate(
      { tournamentId: mongoTourId, text: a.text },
      { tournamentId: mongoTourId, text: a.text, legacyId: a.id },
      { upsert: true, new: true }
    );
  }
  console.log(' Announcements migrated');

  // Step 7: Verification & Validation
  console.log('\n====================================================');
  console.log('📊 POST-MIGRATION AUDIT REPORT');
  console.log('====================================================');

  const finalTourCount = await Tournament.countDocuments();
  const finalTeamCount = await Team.countDocuments();
  const finalMatchCount = await Match.countDocuments();
  const finalResultCount = await MatchResult.countDocuments();
  const finalAnnCount = await Announcement.countDocuments();

  console.log(`Tournaments:   PostgreSQL (${tournaments?.length || 0}) ➔ MongoDB (${finalTourCount})`);
  console.log(`Teams:         PostgreSQL (${teams?.length || 0}) ➔ MongoDB (${finalTeamCount})`);
  console.log(`Matches:       PostgreSQL (${matches?.length || 0}) ➔ MongoDB (${finalMatchCount})`);
  console.log(`Match Results: PostgreSQL (${results?.length || 0}) ➔ MongoDB (${finalResultCount})`);
  console.log(`Announcements: PostgreSQL (${announcements?.length || 0}) ➔ MongoDB (${finalAnnCount})`);

  // Check orphans
  const allTeamTourIds = await Team.distinct('tournamentId');
  const existingTourIds = (await Tournament.find({ _id: { $in: allTeamTourIds } }).select('_id')).map(t => t._id.toString());
  const orphanTeams = allTeamTourIds.filter(id => !existingTourIds.includes(id.toString()));

  if (orphanTeams.length === 0) {
    console.log(' Zero orphan teams detected (All teams linked to valid tournaments)');
  } else {
    console.warn(`⚠️ Warning: ${orphanTeams.length} orphan team references found!`);
  }

  console.log('====================================================');
  console.log('🎉 MIGRATION PROCESS COMPLETE');
  console.log('====================================================');

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
