const express = require('express');
const router = express.Router();
const { authenticateToken: auth, checkRole } = require('../middleware/auth');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private (Student/Parent)
router.post('/', auth, async (req, res) => {
    try {
        const { category, title, description, priority } = req.body;

        const complaint = new Complaint({
            student: req.user.userId,
            category,
            title,
            description,
            priority: priority || 'Medium'
        });

        await complaint.save();
        res.json(complaint);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/complaints/my-complaints
// @desc    Get complaints for logged-in user
// @access  Private
router.get('/my-complaints', auth, async (req, res) => {
    try {
        const complaints = await Complaint.find({ student: req.user.userId })
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/complaints/all
// @desc    Get all complaints (Admin)
// @access  Private (Admin)
router.get('/all', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('student', 'name email currentClass')
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Admin)
router.put('/:id/status', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        const { status, adminResponse } = req.body;

        let complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        complaint.status = status;
        if (adminResponse) complaint.adminResponse = adminResponse;

        if (status === 'Resolved' || status === 'Rejected') {
            complaint.resolvedAt = Date.now();
            complaint.resolvedBy = req.user.userId;
        }

        complaint.updatedAt = Date.now();
        await complaint.save();

        res.json(complaint);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
