import mongoose from 'mongoose';

const MatchResultSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'Match ID is required'],
    index: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required'],
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team ID is required'],
    index: true
  },
  placement: {
    type: Number,
    required: [true, 'Placement is required'],
    min: 1
  },
  kills: {
    type: Number,
    required: [true, 'Kills is required'],
    default: 0,
    min: 0
  },
  placementPts: {
    type: Number,
    default: 0
  },
  killPts: {
    type: Number,
    default: 0
  },
  totalPts: {
    type: Number,
    default: 0
  },
  legacyId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

MatchResultSchema.index({ matchId: 1, teamId: 1 }, { unique: true });
MatchResultSchema.index({ tournamentId: 1, teamId: 1 });

export default mongoose.model('MatchResult', MatchResultSchema);
