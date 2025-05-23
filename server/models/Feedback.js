const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema({
  debate: {
    type: Schema.Types.ObjectId,
    ref: 'debate',
    required: true
  },
  from: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = Feedback = mongoose.model('feedback', FeedbackSchema);