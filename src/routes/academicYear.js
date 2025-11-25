const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const { authenticateToken: auth, checkRole } = require('../middleware/auth');

// @route   GET /api/academic-year
// @desc    Get all academic years
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const years = await AcademicYear.find().sort({ startDate: -1 });
        res.json(years);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/academic-year
// @desc    Create a new academic year
// @access  Admin/Super Admin
router.post('/', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    const { name, startDate, endDate, isActive } = req.body;

    try {
        let year = await AcademicYear.findOne({ name });
        if (year) {
            return res.status(400).json({ msg: 'Academic year already exists' });
        }

        year = new AcademicYear({
            name,
            startDate,
            endDate,
            isActive
        });

        await year.save();
        res.json(year);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/academic-year/upgrade
// @desc    Set active academic year (Upgrade)
// @access  Super Admin
router.post('/upgrade', [auth, checkRole(['super admin'])], async (req, res) => {
    const { id } = req.body;

    try {
        const year = await AcademicYear.findById(id);
        if (!year) {
            return res.status(404).json({ msg: 'Academic year not found' });
        }

        // The pre-save hook in the model handles deactivating other years
        year.isActive = true;
        await year.save();

        res.json({ msg: `Academic year upgraded to ${year.name}`, activeYear: year });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
