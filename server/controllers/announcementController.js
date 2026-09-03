import Announcement from '../models/Announcement.js';

export async function getAnnouncements(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const announcements = await Announcement.find({ tournamentId }).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
}

export async function addAnnouncement(req, res, next) {
  try {
    const { tournamentId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement text is required' });
    }

    const announcement = await Announcement.create({
      tournamentId,
      text: text.trim()
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('announcement:new', announcement);
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}
