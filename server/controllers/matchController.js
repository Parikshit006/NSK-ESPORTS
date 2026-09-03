import Match from '../models/Match.js';
import MatchResult from '../models/MatchResult.js';
import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';
import { buildLeaderboardFromData } from '../services/scoringService.js';

export async function getMatchesByTournament(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const matches = await Match.find({ tournamentId }).sort({ matchNumber: 1 });
    res.json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
}

export async function updateRoomInfo(req, res, next) {
  try {
    const { tournamentId, matchNumber } = req.params;
    const { roomId, password } = req.body;

    const match = await Match.findOneAndUpdate(
      { tournamentId, matchNumber: parseInt(matchNumber) },
      { roomId: roomId || '', password: password || '' },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('match:updated', match);
    }

    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
}

export async function toggleRoomRelease(req, res, next) {
  try {
    const { tournamentId, matchNumber } = req.params;

    const match = await Match.findOne({
      tournamentId,
      matchNumber: parseInt(matchNumber)
    });

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.roomReleased = !match.roomReleased;
    await match.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('match:updated', match);
    }

    res.json({ success: true, roomReleased: match.roomReleased, data: match });
  } catch (err) {
    next(err);
  }
}

export async function saveMatchResults(req, res, next) {
  try {
    const { tournamentId, matchNumber } = req.params;
    const { results } = req.body;

    const match = await Match.findOne({
      tournamentId,
      matchNumber: parseInt(matchNumber)
    });

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Upsert each result
    const operations = (results || []).map(r => ({
      updateOne: {
        filter: { matchId: match._id, teamId: r.teamId },
        update: {
          $set: {
            tournamentId,
            matchId: match._id,
            teamId: r.teamId,
            placement: r.placement,
            kills: r.kills,
            placementPts: r.placementPts || 0,
            killPts: r.killPts || 0,
            totalPts: r.totalPts || 0
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await MatchResult.bulkWrite(operations);
    }

    match.published = true;
    match.publishedAt = new Date();
    await match.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('match:updated', match);
      io.to(`tournament:${tournamentId}`).emit('results:published', { matchNumber });
    }

    res.json({ success: true, message: 'Results saved and match published', data: match });
  } catch (err) {
    next(err);
  }
}

export async function unpublishMatch(req, res, next) {
  try {
    const { tournamentId, matchNumber } = req.params;

    const match = await Match.findOneAndUpdate(
      { tournamentId, matchNumber: parseInt(matchNumber) },
      { published: false },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('match:updated', match);
    }

    res.json({ success: true, message: 'Match unpublished', data: match });
  } catch (err) {
    next(err);
  }
}

export async function getLeaderboard(req, res, next) {
  try {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const [teams, matches] = await Promise.all([
      Team.find({
        tournamentId,
        status: { $in: ['confirmed', 'disqualified'] }
      }).sort({ slotNumber: 1 }),
      Match.find({ tournamentId }).sort({ matchNumber: 1 })
    ]);

    const publishedMatchIds = matches.filter(m => m.published).map(m => m._id);
    const results = await MatchResult.find({
      tournamentId,
      matchId: { $in: publishedMatchIds }
    });

    const leaderboard = buildLeaderboardFromData(tournament, teams, matches, results);

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
}
