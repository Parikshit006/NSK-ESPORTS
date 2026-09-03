import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  ign: { type: String, required: [true, 'IGN is required'], trim: true },
  uid: { type: String, required: [true, 'UID is required'], trim: true },
  role: {
    type: String,
    enum: ['Leader', 'Member', 'Substitute'],
    default: 'Member'
  }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required'],
    index: true
  },
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  leaderName: {
    type: String,
    required: [true, 'Leader name is required'],
    trim: true
  },
  leaderWhatsapp: {
    type: String,
    required: [true, 'Leader WhatsApp is required'],
    trim: true,
    index: true
  },
  college: {
    type: String,
    default: '',
    trim: true
  },

  players: [PlayerSchema],

  payment: {
    transactionId: { type: String, default: null, trim: true },
    screenshotPath: { type: String, default: null }
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'disqualified'],
    default: 'pending',
    index: true
  },

  slotNumber: {
    type: Number,
    default: null
  },

  rejectionReason: {
    type: String,
    default: null
  },
  dqReason: {
    type: String,
    default: null
  },

  legacyId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Enforce unique slot per tournament when assigned
TeamSchema.index(
  { tournamentId: 1, slotNumber: 1 },
  { unique: true, partialFilterExpression: { slotNumber: { $type: 'number' } } }
);

// Compound index for tournament team lookups
TeamSchema.index({ tournamentId: 1, status: 1 });
TeamSchema.index({ tournamentId: 1, teamName: 1 });

export default mongoose.model('Team', TeamSchema);
