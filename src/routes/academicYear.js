const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const { authenticateToken: auth, checkRole } = require('../middleware/auth');

// @route   GET /api/academic-year
// @desc    Get all academic years
// @access  Private
router.get('/', auth, academicYearController.getAllYears);

// @route   POST /api/academic-year
// @desc    Create a new academic year
// @access  Admin/Super Admin
router.post('/', [auth, checkRole(['admin', 'super admin'])], academicYearController.createYear);

// @route   POST /api/academic-year/increment
// @desc    Increment Academic Year (Promote Students)
// @access  Super Admin
router.post('/increment', [auth, checkRole(['super admin'])], academicYearController.incrementYear);

// @route   GET /api/academic-year/:academicYearId/reports
// @desc    Get reports for an academic year
// @access  Super Admin
router.get('/:academicYearId/reports', [auth, checkRole(['super admin'])], academicYearController.getReports);

module.exports = router;
