const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Academic year name is required'], // e.g., "2024-2025"
        trim: true,
        unique: true
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one academic year is active at a time
academicYearSchema.pre('save', async function (next) {
    if (this.isActive) {
        const AcademicYear = mongoose.model('AcademicYear');
        await AcademicYear.updateMany(
            { _id: { $ne: this._id } },
            { $set: { isActive: false } }
        );
    }
    next();
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);
