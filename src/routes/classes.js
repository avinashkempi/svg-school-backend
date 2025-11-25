const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassContent = require('../models/ClassContent');
const User = require('../models/User');
const { authenticateToken: auth, checkRole } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// @route   GET /api/classes
// @desc    Get all classes (optionally filter by academic year)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { academicYear } = req.query;
        const query = {};
        if (academicYear) query.academicYear = academicYear;

        const classes = await Class.find(query)
            .populate('academicYear', 'name')
            .populate('classTeacher', 'name email')
            .sort({ name: 1 });
        res.json(classes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/classes
// @desc    Create a new class
// @access  Admin/Super Admin
router.post('/', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    const { name, section, branch, academicYear, classTeacher } = req.body;

    try {
        const newClass = new Class({
            name,
            section,
            branch,
            academicYear,
            classTeacher
        });

        const savedClass = await newClass.save();
        res.json(savedClass);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id/content
// @desc    Get content for a class
// @access  Private
router.get('/:id/content', auth, async (req, res) => {
    try {
        const content = await ClassContent.find({ class: req.params.id })
            .populate('author', 'name')
            .populate('subject', 'name')
            .sort({ createdAt: -1 });
        res.json(content);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id/students
// @desc    Get all students in a specific class
// @access  Private
router.get('/:id/students', auth, async (req, res) => {
    try {
        const students = await User.find({
            currentClass: req.params.id,
            role: 'student'
        })
            .select('name phone email admissionDate guardianName guardianPhone')
            .sort({ name: 1 });

        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/classes/:id/students
// @desc    Add a student to a class
// @access  Class Teacher (for their class) or Admin/Super Admin
router.post('/:id/students', auth, async (req, res) => {
    const { studentId } = req.body;
    const classId = req.params.id;

    try {
        // Verify the class exists
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check authorization: must be class teacher of this class OR admin/super admin
        const userRole = req.user.role;
        const isAdmin = userRole === 'admin' || userRole === 'super admin';
        const isClassTeacher = classData.classTeacher &&
            classData.classTeacher.toString() === req.user.userId;

        if (!isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Only the class teacher or admin can add students to this class'
            });
        }

        // Verify the student exists and has role 'student'
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (student.role !== 'student') {
            return res.status(400).json({
                success: false,
                message: 'User is not a student'
            });
        }

        // Check if student is already in another class
        if (student.currentClass && student.currentClass.toString() !== classId) {
            return res.status(400).json({
                success: false,
                message: 'Student is already assigned to another class'
            });
        }

        // Update student's currentClass and academicYear
        student.currentClass = classId;
        student.academicYear = classData.academicYear;
        await student.save();

        res.json({
            success: true,
            message: 'Student added to class successfully',
            student: {
                id: student._id,
                name: student.name,
                phone: student.phone,
                email: student.email
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/classes/:id/students/:studentId
// @desc    Remove a student from a class
// @access  Class Teacher (for their class) or Admin/Super Admin
router.delete('/:id/students/:studentId', auth, async (req, res) => {
    const { id: classId, studentId } = req.params;

    try {
        // Verify the class exists
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check authorization: must be class teacher of this class OR admin/super admin
        const userRole = req.user.role;
        const isAdmin = userRole === 'admin' || userRole === 'super admin';
        const isClassTeacher = classData.classTeacher &&
            classData.classTeacher.toString() === req.user.userId;

        if (!isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Only the class teacher or admin can remove students from this class'
            });
        }

        // Verify the student exists
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Verify student is in this class
        if (!student.currentClass || student.currentClass.toString() !== classId) {
            return res.status(400).json({
                success: false,
                message: 'Student is not in this class'
            });
        }

        // Remove student from class
        student.currentClass = null;
        student.academicYear = null;
        await student.save();

        res.json({
            success: true,
            message: 'Student removed from class successfully'
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
