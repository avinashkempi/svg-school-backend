const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },
    schedule: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        periods: [{
            periodNumber: { type: Number, required: true },
            subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
            teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            startTime: { type: String }, // "09:00 AM"
            endTime: { type: String },    // "09:45 AM"
            roomNumber: { type: String }
        }]
    }],
    breaks: [{
        name: { type: String }, // "Lunch Break", "Morning Break"
        startTime: { type: String },
        endTime: { type: String },
        afterPeriod: { type: Number }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
TimetableSchema.index({ class: 1 }, { unique: true }); // One timetable per class (simplified for now)

module.exports = mongoose.model('Timetable', TimetableSchema);
