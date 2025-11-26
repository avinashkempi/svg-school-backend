const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissionLink: {
        type: String,
        required: true,
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['submitted', 'late', 'graded', 'returned'],
        default: 'submitted'
    },
    grade: {
        type: String // Optional grade or marks
    },
    feedback: {
        type: String
    }
});

// Indexes
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true }); // One submission per student per assignment
SubmissionSchema.index({ assignment: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
