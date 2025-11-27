const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @route   POST /api/attendance/mark
// @desc    Mark attendance for students (bulk)
// @access  Private (Teacher)
router.post('/mark', auth, async (req, res) => {
    try {
        const { classId, subjectId, date, attendanceRecords } = req.body;

        // Validate teacher authorization
        const teacherUser = await User.findById(req.user.userId);
        let isAuthorized = false;

        // Check if teacher
        const classData = await Class.findById(classId);
        if (classData && classData.classTeacher && classData.classTeacher.toString() === req.user.userId) {
            isAuthorized = true;
        }

        // Check if subject teacher
        if (subjectId && !isAuthorized) {
            const subjectData = await Subject.findById(subjectId);
            if (subjectData && subjectData.teachers && subjectData.teachers.includes(req.user.userId)) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to mark attendance for this class/subject' });
        }

        // Process attendance records
        const attendancePromises = attendanceRecords.map(async (record) => {
            const { studentId, status, remarks, period } = record;

            const filter = {
                user: studentId,
                class: classId,
                date: new Date(date).setHours(0, 0, 0, 0),
                subject: subjectId || null,
                period: period || null
            };

            const existingAttendance = await Attendance.findOne(filter);

            if (existingAttendance) {
                existingAttendance.status = status;
                existingAttendance.remarks = remarks || '';
                existingAttendance.markedBy = req.user.userId;
                return await existingAttendance.save();
            } else {
                const attendance = new Attendance({
                    user: studentId,
                    role: 'student',
                    class: classId,
                    subject: subjectId || null,
                    date: new Date(date).setHours(0, 0, 0, 0),
                    status,
                    markedBy: req.user.userId,
                    period: period || null,
                    remarks: remarks || ''
                });
                return await attendance.save();
            }
        });

        await Promise.all(attendancePromises);
        res.json({ message: 'Attendance marked successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/attendance/mark-staff
// @desc    Mark attendance for staff (Teachers)
// @access  Private (Admin)
router.post('/mark-staff', auth, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { date, attendanceRecords } = req.body; // Records: [{ userId, status, remarks }]

        const attendancePromises = attendanceRecords.map(async (record) => {
            const { userId, status, remarks } = record;

            const filter = {
                user: userId,
                date: new Date(date).setHours(0, 0, 0, 0)
            };

            const existingAttendance = await Attendance.findOne(filter);

            if (existingAttendance) {
                existingAttendance.status = status;
                existingAttendance.remarks = remarks || '';
                existingAttendance.markedBy = req.user.userId;
                return await existingAttendance.save();
            } else {
                // Fetch user to get role
                const user = await User.findById(userId);
                const attendance = new Attendance({
                    user: userId,
                    role: user.role, // 'teacher' or others
                    date: new Date(date).setHours(0, 0, 0, 0),
                    status,
                    markedBy: req.user.userId,
                    remarks: remarks || ''
                });
                return await attendance.save();
            }
        });

        await Promise.all(attendancePromises);
        res.json({ message: 'Staff attendance marked successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/attendance/class/:classId/date/:date
// @desc    Get attendance for a class on specific date
// @access  Private (Teacher/Admin)
router.get('/class/:classId/date/:date', auth, async (req, res) => {
    try {
        const { classId, date } = req.params;
        const { subject, period } = req.query;

        const filter = {
            class: classId,
            date: new Date(date).setHours(0, 0, 0, 0)
        };

        if (subject) filter.subject = subject;
        if (period) filter.period = parseInt(period);

        const attendance = await Attendance.find(filter)
            .populate('user', 'name email') // Changed from student to user
            .populate('markedBy', 'name')
            .populate('subject', 'name')
            .sort({ 'user.name': 1 });

        const students = await User.find({ currentClass: classId, role: 'student' })
            .select('name email')
            .sort({ name: 1 });

        const result = students.map(student => {
            const attendanceRecord = attendance.find(a => a.user._id.toString() === student._id.toString());
            return {
                student: { // Keep key as 'student' for frontend compatibility
                    _id: student._id,
                    name: student.name,
                    email: student.email
                },
                status: attendanceRecord ? attendanceRecord.status : null,
                remarks: attendanceRecord ? attendanceRecord.remarks : '',
                attendanceId: attendanceRecord ? attendanceRecord._id : null
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/my-attendance
// @desc    Get my attendance history
// @access  Private (All)
router.get('/my-attendance', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = { user: req.user.userId };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate).setHours(0, 0, 0, 0);
            if (endDate) filter.date.$lte = new Date(endDate).setHours(23, 59, 59, 999);
        }

        const attendance = await Attendance.find(filter)
            .sort({ date: -1 });

        // Calculate summary
        const totalRecords = attendance.length;
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const percentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : 0;

        res.json({
            attendance,
            summary: {
                total: totalRecords,
                present: presentCount,
                absent: attendance.filter(a => a.status === 'absent').length,
                late: attendance.filter(a => a.status === 'late').length,
                excused: attendance.filter(a => a.status === 'excused').length,
                percentage: parseFloat(percentage)
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get student's attendance history (Legacy/Admin view)
// @access  Private (Student/Teacher/Admin)
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate, subject } = req.query;

        const filter = { user: studentId }; // Changed from student to user

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate).setHours(0, 0, 0, 0);
            if (endDate) filter.date.$lte = new Date(endDate).setHours(23, 59, 59, 999);
        }

        if (subject) filter.subject = subject;

        const attendance = await Attendance.find(filter)
            .populate('class', 'name section')
            .populate('subject', 'name')
            .populate('markedBy', 'name')
            .sort({ date: -1 });

        const totalRecords = attendance.length;
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const percentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : 0;

        res.json({
            attendance,
            summary: {
                total: totalRecords,
                present: presentCount,
                absent: attendance.filter(a => a.status === 'absent').length,
                late: attendance.filter(a => a.status === 'late').length,
                excused: attendance.filter(a => a.status === 'excused').length,
                percentage: parseFloat(percentage)
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/staff-list
// @desc    Get list of staff with their attendance for a specific date
// @access  Private (Admin)
router.get('/staff-list', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { date } = req.query;
        const targetDate = date ? new Date(date).setHours(0, 0, 0, 0) : new Date().setHours(0, 0, 0, 0);

        // Get all teachers
        const teachers = await User.find({ role: 'teacher' }).select('name email phone');

        // Get attendance for this date
        const attendance = await Attendance.find({
            date: targetDate,
            role: 'teacher'
        });

        const result = teachers.map(teacher => {
            const record = attendance.find(a => a.user.toString() === teacher._id.toString());
            return {
                user: teacher,
                status: record ? record.status : null,
                remarks: record ? record.remarks : '',
                attendanceId: record ? record._id : null
            };
        });

        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
