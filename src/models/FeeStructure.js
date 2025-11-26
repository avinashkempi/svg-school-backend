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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure one fee structure per class per academic year
FeeStructureSchema.index({ class: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
