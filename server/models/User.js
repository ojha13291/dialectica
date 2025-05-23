const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'judge', 'admin'],
        default: 'user'
    },
    bio: {
        type: String
    },
    organization: {
        type: String
    },
    debates: [{
        type: Schema.Types.ObjectId,
        ref: 'debate'
    }],
    judgedDebates: [{
        type: Schema.Types.ObjectId,
        ref: 'debate'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = User = mongoose.model('user', UserSchema);