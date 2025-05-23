const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JudgeScoreSchema = new Schema({
  debate: {
    type: Schema.Types.ObjectId,
    ref: 'debate',
    required: true
  },
  judge: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  participant: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  position: {
    type: String,
    enum: ['for', 'against'],
    required: true
  },
  scores: {
    content: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    delivery: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    rebuttals: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    organization: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    }
  },
  totalScore: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = JudgeScore = mongoose.model('judgeScore', JudgeScoreSchema);