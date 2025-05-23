const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DebateSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    format: {
        type: String,
        enum: ['lincoln-douglas', 'policy', 'parliamentary', 'public-forum', 'custom'],
        default: 'lincoln-douglas'
    },
    customRules: {
        type: String
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    accessCode: {
        type: String
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    participants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        position: {
            type: String,
            enum: ['for', 'against', 'moderator'],
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    judges: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    audience: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    scheduledTime: {
        type: Date
    },
    duration: {
        type: Number, 
        default: 60
    },
    speechTimeLimit: {
        type: Number, 
        default: 120
    },
    recordingUrl: {
        type: String
    },
    transcript: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = Debate = mongoose.model('debate', DebateSchema);