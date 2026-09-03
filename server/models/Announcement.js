import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required'],
    index: true
  },
  text: {
    type: String,
    required: [true, 'Announcement text is required'],
    trim: true
  },
  legacyId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

AnnouncementSchema.index({ tournamentId: 1, createdAt: -1 });

export default mongoose.model('Announcement', AnnouncementSchema);
