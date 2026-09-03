import Tournament from '../models/Tournament.js';
import Match from '../models/Match.js';
import Team from '../models/Team.js';
import MatchResult from '../models/MatchResult.js';
import Announcement from '../models/Announcement.js';

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    + '-' + Date.now().toString(36);
}

export async function getPublicTournaments(req, res, next) {
  try {
    const tournaments = await Tournament.find({
      status: { $nin: ['draft', 'archived'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
}

export async function getAllTournaments(req, res, next) {
  try {
    const tournaments = await Tournament.find({
      status: { $ne: 'archived' }
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
}

export async function getTournamentBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const tournament = await Tournament.findOne({ slug });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
}

export async function getTournamentById(req, res, next) {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
}

export async function createTournament(req, res, next) {
  try {
    const tournamentData = req.body;
    const name = tournamentData.basicInfo?.name || tournamentData.name || 'Tournament';
    const slug = generateSlug(name);

    // Prepare model payload
    const payload = {
      ...tournamentData,
      name,
      slug,
      organizer: tournamentData.basicInfo?.organizer || tournamentData.organizer || 'Organizer',
      tagline: tournamentData.basicInfo?.tagline || tournamentData.tagline || '',
      bannerUrl: tournamentData.basicInfo?.bannerUrl || tournamentData.bannerUrl || '',
      game: tournamentData.basicInfo?.game || tournamentData.game || 'Free Fire Max',
      teamFormat: tournamentData.basicInfo?.teamFormat || tournamentData.teamFormat || 'Squad (4 Players)',
      schedule: {
        date: tournamentData.schedule?.date || tournamentData.tournament_date || null,
        regDeadline: tournamentData.schedule?.regDeadline || tournamentData.reg_deadline || null,
        roomReleaseTime: tournamentData.schedule?.roomReleaseTime || tournamentData.room_release_time || '',
        matchStartTime: tournamentData.schedule?.matchStartTime || tournamentData.match_start_time || '',
        numMatches: parseInt(tournamentData.schedule?.numMatches || tournamentData.num_matches) || 6
      },
      slots: {
        total: parseInt(tournamentData.slots?.total || tournamentData.total_slots) || 12,
        filled: 0
      },
      entry: {
        fee: parseInt(tournamentData.entry?.fee || tournamentData.entry_fee) || 0,
        upiId: tournamentData.entry?.upiId || tournamentData.upi_id || '',
        qrCodeUrl: tournamentData.entry?.qrCodeUrl || tournamentData.qr_code_url || ''
      }
    };

    const tournament = await Tournament.create(payload);

    // Auto-create matches
    const numMatches = payload.schedule.numMatches;
    const matchesToInsert = [];
    for (let i = 1; i <= numMatches; i++) {
      matchesToInsert.push({
        tournamentId: tournament._id,
        matchNumber: i,
        roomReleased: false,
        published: false
      });
    }
    await Match.insertMany(matchesToInsert);

    res.status(201).json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
}

export async function updateTournament(req, res, next) {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
}

export async function updateTournamentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const tournament = await Tournament.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
}

export async function deleteTournament(req, res, next) {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Cascade delete all related documents
    await Promise.all([
      Team.deleteMany({ tournamentId: id }),
      Match.deleteMany({ tournamentId: id }),
      MatchResult.deleteMany({ tournamentId: id }),
      Announcement.deleteMany({ tournamentId: id }),
      Tournament.findByIdAndDelete(id)
    ]);

    res.json({ success: true, message: 'Tournament and all related data deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getFullTournament(req, res, next) {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const [teams, matches, announcements] = await Promise.all([
      Team.find({ tournamentId: id }).sort({ createdAt: 1 }),
      Match.find({ tournamentId: id }).sort({ matchNumber: 1 }),
      Announcement.find({ tournamentId: id }).sort({ createdAt: -1 })
    ]);

    // Attach results to each match
    const matchIds = matches.map(m => m._id);
    const allResults = await MatchResult.find({ matchId: { $in: matchIds } });

    const matchesWithResults = matches.map(m => {
      const matchObj = m.toObject();
      matchObj.results = allResults
        .filter(r => r.matchId.toString() === m._id.toString())
        .map(r => ({
          teamId: r.teamId,
          placement: r.placement,
          kills: r.kills,
          placementPts: r.placementPts,
          killPts: r.killPts,
          totalPts: r.totalPts
        }));
      return matchObj;
    });

    const fullData = {
      ...tournament.toObject(),
      teams,
      matches: matchesWithResults,
      announcements
    };

    res.json({ success: true, data: fullData });
  } catch (err) {
    next(err);
  }
}
