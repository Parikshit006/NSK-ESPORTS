import mongoose from 'mongoose';

const PrizeSchema = new mongoose.Schema({
  position: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  label: { type: String, default: '' }
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  name: { type: String, required: [true, 'Tournament name is required'], trim: true },
  organizer: { type: String, required: [true, 'Organizer is required'], trim: true },
  tagline: { type: String, default: '', trim: true },
  bannerUrl: { type: String, default: '', trim: true },
  game: { type: String, default: 'Free Fire Max' },
  teamFormat: { type: String, default: 'Squad (4 Players)' },

  schedule: {
    date: { type: Date },
    regDeadline: { type: Date },
    roomReleaseTime: { type: String, default: '' },
    matchStartTime: { type: String, default: '' },
    numMatches: { type: Number, default: 6, min: 1, max: 10 }
  },

  slots: {
    total: { type: Number, required: true, default: 12, min: 1 },
    filled: { type: Number, default: 0, min: 0 }
  },

  entry: {
    fee: { type: Number, default: 0, min: 0 },
    upiId: { type: String, default: '', trim: true },
    qrCodeUrl: { type: String, default: '' }
  },

  prizes: [PrizeSchema],

  qualifier: {
    enabled: { type: Boolean, default: false },
    topN: { type: Number, default: 4 },
    roundName: { type: String, default: 'Inter-College Round' }
  },

  scoring: {
    preset: { type: String, enum: ['pict', 'eagle', 'custom'], default: 'pict' },
    placementPoints: { type: Map, of: Number, default: {} },
    killPointValue: { type: Number, default: 1.0 },
    killCap: { type: Number, default: 0 },
    tiebreaker: {
      type: String,
      enum: ['total_kills', 'last_match_kills', 'head_to_head'],
      default: 'total_kills'
    }
  },

  rules: [{ type: String, trim: true }],

  regFields: {
    college: { type: Boolean, default: false },
    transactionId: { type: Boolean, default: true },
    paymentScreenshot: { type: Boolean, default: true }
  },

  contact: {
    whatsapp: { type: String, default: '' },
    whatsappGroup: { type: String, default: '' },
    discord: { type: String, default: '' },
    instagram: { type: String, default: '' }
  },

  legacyId: { type: String, index: true } // PostgreSQL UUID mapping
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

TournamentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Tournament', TournamentSchema);
