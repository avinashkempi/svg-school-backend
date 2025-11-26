const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassContent = require('../models/ClassContent');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
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

// @route   GET /api/classes/my-classes
// @desc    Get classes where the logged-in user is the class teacher
// @access  Private (Teacher)
router.get('/my-classes', auth, async (req, res) => {
    try {
        const classes = await Class.find({ classTeacher: req.user.userId })
            .populate('academicYear', 'name')
            .populate('classTeacher', 'name email')
            .sort({ name: 1 });
        res.json(classes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/admin/init
// @desc    Get all data needed for admin classes page
// @access  Admin/Super Admin
router.get('/admin/init', [auth, checkRole(['admin', 'super admin'])], async (req, res) => {
    try {
        const [classes, academicYears, teachers] = await Promise.all([
            Class.find().populate('academicYear', 'name').populate('classTeacher', 'name email').sort({ name: 1 }),
            AcademicYear.find().sort({ startYear: -1 }),
            User.find({ role: { $in: ['class teacher', 'staff'] } }).select('name email role')
        ]);

        res.json({
            classes,
            academicYears,
            teachers
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id/full-details
// @desc    Get class details, subjects, and students
// @access  Private
router.get('/:id/full-details', auth, async (req, res) => {
    try {
        const [classData, subjects, students] = await Promise.all([
            Class.findById(req.params.id).populate('academicYear', 'name').populate('classTeacher', 'name email'),
            Subject.find({ class: req.params.id }).sort({ name: 1 }),
            User.find({ currentClass: req.params.id, role: 'student' }).select('name phone email admissionDate guardianName guardianPhone').sort({ name: 1 })
        ]);

        if (!classData) {
            return res.status(404).json({ msg: 'Class not found' });
        }

        res.json({
            classData,
            subjects,
            students
        });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Class not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id)
            .populate('academicYear', 'name')
            .populate('classTeacher', 'name email');

        if (!classData) {
            return res.status(404).json({ msg: 'Class not found' });
        }

        res.json(classData);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Class not found' });
        }
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

// @route   PUT /api/classes/:id
// @desc    Update a class
// @access  Super Admin
router.put('/:id', [auth, checkRole(['super admin'])], async (req, res) => {
    const { name, section, branch, academicYear, classTeacher } = req.body;

    try {
        let classData = await Class.findById(req.params.id);
        if (!classData) return res.status(404).json({ msg: 'Class not found' });

        classData.name = name || classData.name;
        classData.section = section !== undefined ? section : classData.section;
        classData.branch = branch || classData.branch;
        classData.academicYear = academicYear || classData.academicYear;
        classData.classTeacher = classTeacher || classData.classTeacher;

        await classData.save();
        res.json(classData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/classes/:id
// @desc    Delete a class
// @access  Super Admin
router.delete('/:id', [auth, checkRole(['super admin'])], async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id);
        if (!classData) return res.status(404).json({ msg: 'Class not found' });

        // Check if class has students
        const studentCount = await User.countDocuments({ currentClass: req.params.id });
        if (studentCount > 0) {
            return res.status(400).json({ msg: 'Cannot delete class with enrolled students' });
        }

        await Class.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Class removed' });
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

// @route   POST /api/classes/:id/content
// @desc    Create content for a class
// @access  Class Teacher or Admin
router.post('/:id/content', auth, async (req, res) => {
    const { title, description, type, subject, link } = req.body;
    const classId = req.params.id;

    try {
        const classData = await Class.findById(classId);
        if (!classData) return res.status(404).json({ msg: 'Class not found' });

        const userRole = req.user.role;
        const isAdmin = userRole === 'admin' || userRole === 'super admin';
        const isClassTeacher = classData.classTeacher && classData.classTeacher.toString() === req.user.userId;

        if (!isAdmin && !isClassTeacher) {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const newContent = new ClassContent({
            title,
            description,
            type,
            subject,
            class: classId,
            author: req.user.userId,
            attachments: link ? [link] : []
        });

        const savedContent = await newContent.save();

        // Populate author and subject for response
        await savedContent.populate('author', 'name');
        await savedContent.populate('subject', 'name');

        res.json(savedContent);
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

// @route   GET /api/classes/:id/subjects
// @desc    Get all subjects for a class
// @access  Private
router.get('/:id/subjects', auth, async (req, res) => {
    try {
        const subjects = await Subject.find({ class: req.params.id }).sort({ name: 1 });
        res.json(subjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/classes/:id/subjects
// @desc    Add a subject to a class
// @access  Class Teacher (for their class) or Admin/Super Admin
router.post('/:id/subjects', auth, async (req, res) => {
    const { name } = req.body;
    const classId = req.params.id;

    try {
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        const userRole = req.user.role;
        const isAdmin = userRole === 'admin' || userRole === 'super admin';
        const isClassTeacher = classData.classTeacher && classData.classTeacher.toString() === req.user.userId;

        if (!isAdmin && !isClassTeacher) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const newSubject = new Subject({
            name,
            class: classId,
            teachers: [req.user.userId] // Add creator as teacher initially
        });

        const savedSubject = await newSubject.save();
        res.json(savedSubject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/classes/:id/subjects/:subjectId
// @desc    Delete a subject
// @access  Class Teacher or Admin
router.delete('/:id/subjects/:subjectId', auth, async (req, res) => {
    try {
        const { id: classId, subjectId } = req.params;

        const classData = await Class.findById(classId);
        if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });

        const userRole = req.user.role;
        const isAdmin = userRole === 'admin' || userRole === 'super admin';
        const isClassTeacher = classData.classTeacher && classData.classTeacher.toString() === req.user.userId;

        if (!isAdmin && !isClassTeacher) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check for content
        const contentCount = await ClassContent.countDocuments({ subject: subjectId });
        if (contentCount > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete subject with existing content' });
        }

        await Subject.findByIdAndDelete(subjectId);
        res.json({ success: true, message: 'Subject deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/classes/:id/subjects/:subjectId/content
// @desc    Get content for a specific subject
// @access  Private
router.get('/:id/subjects/:subjectId/content', auth, async (req, res) => {
    try {
        const content = await ClassContent.find({
            class: req.params.id,
            subject: req.params.subjectId
        })
            .populate('author', 'name')
            .sort({ createdAt: -1 });
        res.json(content);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
