import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required'],
    index: true
  },
  matchNumber: {
    type: Number,
    required: [true, 'Match number is required'],
    min: 1
  },
  roomId: {
    type: String,
    default: '',
    trim: true
  },
  password: {
    type: String,
    default: '',
    trim: true
  },
  roomReleased: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  legacyId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

MatchSchema.index({ tournamentId: 1, matchNumber: 1 }, { unique: true });

export default mongoose.model('Match', MatchSchema);
