const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['unit-test', 'mid-term', 'final', 'practical', 'assignment'],
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    date: {
        type: Date
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    instructions: {
        type: String
    },
    duration: {
        type: Number  // Duration in minutes
    },
    room: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
ExamSchema.index({ class: 1, subject: 1 });
ExamSchema.index({ academicYear: 1 });
ExamSchema.index({ date: 1 });

module.exports = mongoose.model('Exam', ExamSchema);
