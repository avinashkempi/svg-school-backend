const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Subject = require('../models/Subject');
const User = require('../models/User');

// @route   POST /api/assignments
// @desc    Create a new assignment
// @access  Private (Teacher)
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, subjectId, classId, dueDate } = req.body;

        // Validate teacher authorization
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        if (!subject.teachers.includes(req.user.userId)) {
            return res.status(403).json({ message: 'Not authorized to create assignment for this subject' });
        }

        const assignment = new Assignment({
            title,
            description,
            subject: subjectId,
            class: classId,
            teacher: req.user.userId,
            dueDate
        });

        await assignment.save();

        const populatedAssignment = await Assignment.findById(assignment._id)
            .populate('class', 'name section')
            .populate('subject', 'name')
            .populate('teacher', 'name');

        res.json(populatedAssignment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/assignments/class/:classId
// @desc    Get assignments for a class (with submission status for student)
// @access  Private
router.get('/class/:classId', auth, async (req, res) => {
    try {
        const { subjectId } = req.query;
        let query = { class: req.params.classId };

        if (subjectId) {
            query.subject = subjectId;
        }

        const assignments = await Assignment.find(query)
            .populate('subject', 'name')
            .populate('teacher', 'name')
            .sort({ dueDate: 1 }); // Soonest due first

        // If student, check submission status for each assignment
        const user = await User.findById(req.user.userId);
        if (user.role === 'student') {
            const assignmentsWithStatus = await Promise.all(assignments.map(async (assignment) => {
                const submission = await Submission.findOne({
                    assignment: assignment._id,
                    student: req.user.userId
                });

                return {
                    ...assignment.toObject(),
                    submission: submission ? submission : null
                };
            }));
            return res.json(assignmentsWithStatus);
        }

        res.json(assignments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/assignments/submit
// @desc    Submit an assignment (Link)
// @access  Private (Student)
router.post('/submit', auth, async (req, res) => {
    try {
        const { assignmentId, submissionLink } = req.body;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if already submitted
        let submission = await Submission.findOne({
            assignment: assignmentId,
            student: req.user.userId
        });

        if (submission) {
            // Update existing submission
            submission.submissionLink = submissionLink;
            submission.submittedAt = Date.now();
            submission.status = 'submitted'; // Reset status if re-submitted
        } else {
            // Create new submission
            // Check if late
            const isLate = new Date() > new Date(assignment.dueDate);

            submission = new Submission({
                assignment: assignmentId,
                student: req.user.userId,
                submissionLink,
                status: isLate ? 'late' : 'submitted'
            });
        }

        await submission.save();
        res.json(submission);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/assignments/:id/submissions
// @desc    Get all submissions for an assignment
// @access  Private (Teacher)
router.get('/:id/submissions', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check authorization
        if (assignment.teacher.toString() !== req.user.userId) {
            // Also allow if admin (optional, but good for flexibility)
            const user = await User.findById(req.user.userId);
            if (user.role !== 'admin' && user.role !== 'super admin') {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        const submissions = await Submission.find({ assignment: req.params.id })
            .populate('student', 'name email')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/assignments/submission/:id
// @desc    Grade/Feedback a submission
// @access  Private (Teacher)
router.put('/submission/:id', auth, async (req, res) => {
    try {
        const { grade, feedback, status } = req.body;

        let submission = await Submission.findById(req.params.id).populate('assignment');
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Check authorization
        if (submission.assignment.teacher.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (grade) submission.grade = grade;
        if (feedback) submission.feedback = feedback;
        if (status) submission.status = status;
        else submission.status = 'graded';

        await submission.save();
        res.json(submission);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Teacher)
router.delete('/:id', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.teacher.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Submission.deleteMany({ assignment: req.params.id });
        await Assignment.findByIdAndDelete(req.params.id);

        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/assignments/history
// @desc    Get assignment history (past due date)
// @access  Private (Teacher/Admin)
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const today = new Date();

        let query = { dueDate: { $lt: today } };

        // If teacher, only show their assignments
        if (user.role === 'class teacher' || user.role === 'staff') {
            query.teacher = req.user.userId;
        }
        // If admin, show all (already covered by default query)
        // If student, not allowed (or could show their class history, but spec says teacher/admin)
        if (user.role === 'student') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const assignments = await Assignment.find(query)
            .populate('class', 'name section')
            .populate('subject', 'name')
            .populate('teacher', 'name')
            .sort({ dueDate: -1 }); // Newest past first

        res.json(assignments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
