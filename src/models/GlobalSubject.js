const mongoose = require('mongoose');

const globalSubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        trim: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ['Theory', 'Practical', 'Other'],
        default: 'Theory'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GlobalSubject', globalSubjectSchema);
