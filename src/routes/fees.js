const express = require('express');
const router = express.Router();
const { authenticateToken: auth, checkRole } = require('../middleware/auth');
const FeeStructure = require('../models/FeeStructure');
const FeePayment = require('../models/FeePayment');
const User = require('../models/User');
const Class = require('../models/Class');

// Helper to generate receipt number
const generateReceiptNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `RCP${year}${month}`;

    // Find last receipt of this month
    const lastPayment = await FeePayment.findOne({
        receiptNumber: new RegExp(`^${prefix}`)
    }).sort({ receiptNumber: -1 });

    let sequence = '0001';
    if (lastPayment) {
        const lastSeq = parseInt(lastPayment.receiptNumber.slice(-4));
        sequence = (lastSeq + 1).toString().padStart(4, '0');
    }

    return `${prefix}${sequence}`;
};

// @route   POST /api/fees/structure
// @desc    Create or Update fee structure for a class
// @access  Admin/Super Admin
router.post('/structure', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        const { classId, academicYearId, components, paymentSchedule } = req.body;

        // Calculate total amount
        const totalAmount = components.reduce((sum, comp) => sum + Number(comp.amount), 0);

        let feeStructure = await FeeStructure.findOne({
            class: classId,
            academicYear: academicYearId
        });

        if (feeStructure) {
            // Update existing
            feeStructure.components = components;
            feeStructure.paymentSchedule = paymentSchedule;
            feeStructure.totalAmount = totalAmount;
            feeStructure.updatedAt = Date.now();
        } else {
            // Create new
            feeStructure = new FeeStructure({
                class: classId,
                academicYear: academicYearId,
                components,
                paymentSchedule,
                totalAmount
            });
        }

        await feeStructure.save();
        res.json(feeStructure);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/fees/structure/class/:classId
// @desc    Get fee structure for a class (current academic year)
// @access  Private
router.get('/structure/class/:classId', auth, async (req, res) => {
    try {
        // Ideally we should get the active academic year from a config or passed in query
        // For now, let's try to find the structure associated with the class's current academic year
        // or just the latest one.

        const classData = await Class.findById(req.params.classId);
        if (!classData) return res.status(404).json({ message: 'Class not found' });

        let feeStructure;
        if (classData.academicYear) {
            feeStructure = await FeeStructure.findOne({
                class: req.params.classId,
                academicYear: classData.academicYear
            });
        }

        // If not found by specific academic year, get the latest one
        if (!feeStructure) {
            feeStructure = await FeeStructure.findOne({ class: req.params.classId })
                .sort({ createdAt: -1 });
        }

        if (!feeStructure) {
            return res.status(404).json({ message: 'Fee structure not found' });
        }

        res.json(feeStructure);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/fees/payment
// @desc    Record a fee payment
// @access  Admin/Super Admin
router.post('/payment', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        const { studentId, amount, paymentMethod, transactionId, remarks } = req.body;

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!student.currentClass || !student.academicYear) {
            return res.status(400).json({ message: 'Student not assigned to a class or academic year' });
        }

        const feeStructure = await FeeStructure.findOne({
            class: student.currentClass,
            academicYear: student.academicYear
        });

        if (!feeStructure) {
            return res.status(400).json({ message: 'Fee structure not defined for this student\'s class' });
        }

        const receiptNumber = await generateReceiptNumber();

        const payment = new FeePayment({
            student: studentId,
            class: student.currentClass,
            academicYear: student.academicYear,
            feeStructure: feeStructure._id,
            amount,
            paymentMethod,
            transactionId,
            receiptNumber,
            remarks,
            collectedBy: req.user.userId
        });

        await payment.save();
        res.json(payment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/fees/student/:studentId
// @desc    Get student fee status and history
// @access  Private (Admin, or Student for own data)
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        // Authorization check
        if (req.user.role === 'student' && req.user.userId !== req.params.studentId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const student = await User.findById(req.params.studentId);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Get Fee Structure
        // Assuming current academic year
        const feeStructure = await FeeStructure.findOne({
            class: student.currentClass,
            academicYear: student.academicYear
        });

        if (!feeStructure) {
            return res.json({
                totalFees: 0,
                paidAmount: 0,
                pendingAmount: 0,
                payments: [],
                message: 'Fee structure not found'
            });
        }

        // Get Payments
        const payments = await FeePayment.find({
            student: req.params.studentId,
            academicYear: student.academicYear,
            status: 'success'
        }).sort({ paymentDate: -1 });

        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingAmount = feeStructure.totalAmount - paidAmount;

        res.json({
            feeStructure,
            totalFees: feeStructure.totalAmount,
            paidAmount,
            pendingAmount,
            payments
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/fees/analytics
// @desc    Get fee collection analytics
// @access  Admin/Super Admin
router.get('/analytics', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        // Simple analytics for now: Total Collected Today, This Month, Total Pending (Approx)

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [todayPayments, monthPayments, allPayments] = await Promise.all([
            FeePayment.aggregate([
                { $match: { paymentDate: { $gte: today }, status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            FeePayment.aggregate([
                { $match: { paymentDate: { $gte: firstDayOfMonth }, status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            FeePayment.aggregate([
                { $match: { status: 'success' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        res.json({
            collectedToday: todayPayments[0]?.total || 0,
            collectedThisMonth: monthPayments[0]?.total || 0,
            totalCollected: allPayments[0]?.total || 0
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
