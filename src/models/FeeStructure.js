const mongoose = require('mongoose');

const FeeStructureSchema = new mongoose.Schema({
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true
    },
    components: [{
        name: { type: String, required: true }, // "Tuition Fee", "Lab Fee", "Transport Fee"
        amount: { type: Number, required: true },
        mandatory: { type: Boolean, default: true }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentSchedule: [{
        installmentNumber: { type: Number },
        dueDate: { type: Date },
        amount: { type: Number },
        description: { type: String } // "Term 1", "Term 2"
    }],
    type: {
        type: String,
        enum: ['class_default', 'student_specific'],
        default: 'class_default'
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

// Compound index to ensure one DEFAULT fee structure per class per academic year
FeeStructureSchema.index(
    { class: 1, academicYear: 1, type: 1 },
    { unique: true, partialFilterExpression: { type: 'class_default' } }
);

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
