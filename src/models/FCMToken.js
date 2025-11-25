const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    platform: {
        type: String,
        enum: ['ios', 'android'],
        required: true,
    },
    isAuthenticated: {
        type: Boolean,
        default: false,
        index: true, // Index for efficient filtering
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
fcmTokenSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('FCMToken', fcmTokenSchema);
