const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassContent = require('../models/ClassContent');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');
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

// @route   POST /api/classes/:id/subjects
// @desc    Add a subject to a class
// @access  Admin/Super Admin
router.post('/:id/subjects', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    const { name, teachers } = req.body;
    const classId = req.params.id;

    try {
        const subject = new Subject({
            name,
            class: classId,
            teachers
        });

        await subject.save();
        res.json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id/subjects
// @desc    Get all subjects for a class
// @access  Private
router.get('/:id/subjects', auth, async (req, res) => {
    try {
        const subjects = await Subject.find({ class: req.params.id })
            .populate('teachers', 'name email');
        res.json(subjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/classes/:id/content
// @desc    Post content to a class (Teacher/Admin)
// @access  Teacher/Admin
router.post('/:id/content', [auth, checkRole(['class teacher', 'admin', 'super admin'])], async (req, res) => {
    const { title, description, type, subject, attachments } = req.body;
    const classId = req.params.id;

    try {
        // Verify teacher is assigned to this class or subject (skip for admin)
        // For simplicity, allowing any teacher to post for now, can refine later

        const content = new ClassContent({
            title,
            description,
            type,
            class: classId,
            subject,
            author: req.user.id,
            attachments
        });

        await content.save();

        // Send notification to all students in the class
        try {
            await notificationService.sendClassContentNotification(classId, content);
        } catch (notifError) {
            console.error('Notification error:', notifError);
            // Don't fail the request if notification fails
        }

        res.json(content);
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

module.exports = router;
