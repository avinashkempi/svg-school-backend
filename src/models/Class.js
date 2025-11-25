const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Class name is required'], // e.g., "1st Standard", "LKG"
        trim: true
    },
    section: {
        type: String,
        trim: true // Optional section, e.g., "A", "B"
    },
    branch: {
        type: String,
        required: [true, 'Branch is required'],
        enum: ['Ugar', 'Mangasuli', 'Main'], // Add other branches as needed
        default: 'Main'
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: [true, 'Academic Year is required']
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure unique class name per branch and academic year
classSchema.index({ name: 1, section: 1, branch: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
