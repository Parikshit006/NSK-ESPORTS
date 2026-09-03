import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';

export async function getTeamsByTournament(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const teams = await Team.find({ tournamentId }).sort({ createdAt: 1 });
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
}

export async function getConfirmedTeams(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const teams = await Team.find({
      tournamentId,
      status: { $in: ['confirmed', 'disqualified'] }
    }).sort({ slotNumber: 1 });

    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
}

export async function registerTeam(req, res, next) {
  try {
    const { tournamentId } = req.params;
    let formData = req.body;

    // Handle formData if passed as parsed string or json
    if (typeof formData.players === 'string') {
      try {
        formData.players = JSON.parse(formData.players);
      } catch (e) {
        formData.players = [];
      }
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.status !== 'registration_open') {
      return res.status(400).json({ success: false, message: 'Registration is closed for this tournament' });
    }

    if (tournament.slots.filled >= tournament.slots.total) {
      return res.status(400).json({ success: false, message: 'All slots for this tournament are filled' });
    }

    // Check duplicate team name in same tournament (excluding rejected)
    const existingName = await Team.findOne({
      tournamentId,
      teamName: { $regex: new RegExp(`^${formData.teamName.trim()}$`, 'i') },
      status: { $ne: 'rejected' }
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: `Team name "${formData.teamName}" is already taken`
      });
    }

    // Check duplicate transaction ID if provided
    const txnId = formData.payment?.transactionId || formData.transactionId;
    if (txnId && txnId.trim()) {
      const existingTxn = await Team.findOne({
        tournamentId,
        'payment.transactionId': txnId.trim(),
        status: { $ne: 'rejected' }
      });
      if (existingTxn) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID already used by team "${existingTxn.teamName}"`
        });
      }
    }

    // Payment screenshot handling
    let screenshotPath = null;
    if (req.file) {
      screenshotPath = req.file.filename;
    }

    const newTeam = await Team.create({
      tournamentId,
      teamName: formData.teamName.trim(),
      leaderName: formData.leaderName.trim(),
      leaderWhatsapp: formData.leaderWhatsapp.trim(),
      college: formData.college ? formData.college.trim() : '',
      players: (formData.players || []).map(p => ({
        ign: p.ign ? p.ign.trim() : '',
        uid: p.uid ? p.uid.trim() : '',
        role: p.role || 'Member'
      })),
      payment: {
        transactionId: txnId ? txnId.trim() : null,
        screenshotPath
      },
      status: 'pending'
    });

    // Notify connected admin via Socket.IO if available
    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('team:registered', newTeam);
    }

    res.status(201).json({ success: true, data: newTeam });
  } catch (err) {
    next(err);
  }
}

export async function approveTeam(req, res, next) {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const tournament = await Tournament.findById(team.tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.slots.filled >= tournament.slots.total) {
      return res.status(400).json({ success: false, message: 'Tournament slots are already full' });
    }

    // Race-safe atomic slot determination
    const lastConfirmedTeam = await Team.findOne({
      tournamentId: team.tournamentId,
      slotNumber: { $ne: null }
    }).sort({ slotNumber: -1 });

    const nextSlot = (lastConfirmedTeam?.slotNumber || 0) + 1;

    // Atomically increment filled slots
    await Tournament.findByIdAndUpdate(team.tournamentId, {
      $inc: { 'slots.filled': 1 }
    });

    team.status = 'confirmed';
    team.slotNumber = nextSlot;
    team.rejectionReason = null;
    await team.save();

    // Realtime notification
    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${team.tournamentId}`).emit('team:updated', team);
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

export async function rejectTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // If was confirmed, decrement filled slots
    if (team.status === 'confirmed') {
      await Tournament.findByIdAndUpdate(team.tournamentId, {
        $inc: { 'slots.filled': -1 }
      });
    }

    team.status = 'rejected';
    team.rejectionReason = reason || 'Not specified';
    team.slotNumber = null;
    await team.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${team.tournamentId}`).emit('team:updated', team);
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

export async function disqualifyTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    team.status = 'disqualified';
    team.dqReason = reason || 'Violation of rules';
    await team.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${team.tournamentId}`).emit('team:updated', team);
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const team = await Team.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

export async function portalLogin(req, res, next) {
  try {
    const { tournamentId, teamName, phone } = req.body;

    if (!tournamentId || !teamName || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide tournament ID, team name, and phone' });
    }

    const team = await Team.findOne({
      tournamentId,
      teamName: { $regex: new RegExp(`^${teamName.trim()}$`, 'i') },
      leaderWhatsapp: phone.trim()
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found. Please check team name and WhatsApp number.' });
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

export async function getScreenshot(req, res, next) {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team || !team.payment?.screenshotPath) {
      return res.status(404).json({ success: false, message: 'Payment screenshot not found' });
    }

    // If it's a full URL (from Supabase/Cloudinary migration), redirect securely
    if (team.payment.screenshotPath.startsWith('http://') || team.payment.screenshotPath.startsWith('https://')) {
      return res.redirect(team.payment.screenshotPath);
    }

    const filePath = path.join(process.cwd(), 'uploads', 'payments', team.payment.screenshotPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Screenshot file not found on server' });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function checkDuplicateIGN(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const { igns = [] } = req.body;

    const teams = await Team.find({
      tournamentId,
      status: { $ne: 'rejected' }
    }).select('teamName players');

    const lowerIgns = igns.map(i => (i || '').toLowerCase().trim());
    const taken = [];

    teams.forEach(team => {
      (team.players || []).forEach(p => {
        if (p.ign && lowerIgns.includes(p.ign.toLowerCase().trim())) {
          taken.push({ ign: p.ign, teamName: team.teamName });
        }
      });
    });

    res.json({ success: true, data: taken });
  } catch (err) {
    next(err);
  }
}

export async function checkDuplicateUID(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const { uids = [] } = req.body;

    const teams = await Team.find({
      tournamentId,
      status: { $ne: 'rejected' }
    }).select('teamName players');

    const cleanUids = uids.map(u => (u || '').trim());
    const taken = [];

    teams.forEach(team => {
      (team.players || []).forEach(p => {
        if (p.uid && cleanUids.includes(p.uid.trim())) {
          taken.push({ uid: p.uid, teamName: team.teamName });
        }
      });
    });

    res.json({ success: true, data: taken });
  } catch (err) {
    next(err);
  }
}
