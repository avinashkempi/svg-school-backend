const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const Class = require('../models/Class');
const { authenticateToken, checkRole } = require('../middleware/auth');

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private (Student)
router.post('/apply', authenticateToken, checkRole(['student']), async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;

        // Get student's current class
        const student = await User.findById(req.user.id);
        if (!student.currentClass) {
            return res.status(400).json({ success: false, message: 'Student is not assigned to any class' });
        }

        const leaveRequest = await LeaveRequest.create({
            student: req.user.id,
            class: student.currentClass,
            startDate,
            endDate,
            reason
        });

        res.status(201).json({ success: true, data: leaveRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Get my leave history
// @route   GET /api/leaves/my-leaves
// @access  Private (Student)
router.get('/my-leaves', authenticateToken, checkRole(['student']), async (req, res) => {
    try {
        const leaves = await LeaveRequest.find({ student: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: leaves });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Get leave requests for a class
// @route   GET /api/leaves/class-leaves
// @access  Private (Teacher, Admin)
router.get('/class-leaves', authenticateToken, checkRole(['class teacher', 'admin']), async (req, res) => {
    try {
        let classId;

        if (req.user.role === 'class teacher') {
            // Find class where user is the class teacher
            const classObj = await Class.findOne({ classTeacher: req.user.id });
            if (!classObj) {
                return res.status(404).json({ success: false, message: 'No class assigned to this teacher' });
            }
            classId = classObj._id;
        } else {
            // Admin can optionally provide classId in query, otherwise might need different logic
            // For now, let's assume admin provides classId or we fetch all if not provided (or maybe just required for now)
            if (req.query.classId) {
                classId = req.query.classId;
            } else {
                // If admin doesn't provide classId, maybe return all pending leaves?
                // Let's stick to class-specific for this endpoint to keep it simple for now, 
                // or allow fetching all if admin.
            }
        }

        let query = {};
        if (classId) {
            query.class = classId;
        }

        const leaves = await LeaveRequest.find(query)
            .populate('student', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: leaves });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Approve/Reject leave request
// @route   PUT /api/leaves/:id/action
// @access  Private (Teacher, Admin)
router.put('/:id/action', authenticateToken, checkRole(['class teacher', 'admin']), async (req, res) => {
    try {
        const { status, reason } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        let leaveRequest = await LeaveRequest.findById(req.params.id);

        if (!leaveRequest) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }

        // Check if teacher is authorized for this class
        if (req.user.role === 'class teacher') {
            const classObj = await Class.findOne({ classTeacher: req.user.id });
            if (!classObj || classObj._id.toString() !== leaveRequest.class.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to manage leaves for this class' });
            }
        }

        leaveRequest.status = status;
        leaveRequest.actionBy = req.user.id;
        leaveRequest.actionReason = reason;
        leaveRequest.actionDate = Date.now();

        await leaveRequest.save();

        res.status(200).json({ success: true, data: leaveRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Get daily leave stats (Who is on leave today)
// @route   GET /api/leaves/daily-stats
// @access  Private (Admin)
router.get('/daily-stats', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const dateStr = req.query.date; // YYYY-MM-DD
        let targetDate;

        if (dateStr) {
            targetDate = new Date(dateStr);
        } else {
            targetDate = new Date();
        }

        // Set time to start of day and end of day for accurate comparison if needed, 
        // but since we store startDate and endDate as dates, we need to check if targetDate falls within the range.
        // We'll assume the stored dates might have time components or are UTC. 
        // Best to compare ranges.

        // Simple check: startDate <= targetDate AND endDate >= targetDate
        // Note: This ignores time components if we just want "is on leave this day".
        // Let's normalize targetDate to start of day for comparison if we want to be precise, 
        // but MongoDB queries with dates can be tricky.

        // Let's construct a query where the range overlaps with the target day.
        // Actually, simpler: find leaves where startDate <= targetDate AND endDate >= targetDate
        // AND status is 'approved'.

        const leaves = await LeaveRequest.find({
            startDate: { $lte: targetDate },
            endDate: { $gte: targetDate },
            status: 'approved'
        }).populate('student', 'name currentClass')
            .populate('class', 'name section');

        res.status(200).json({ success: true, data: leaves });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
