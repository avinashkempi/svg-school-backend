const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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
        // Check if teacher teaches this class or subject
        const teacherUser = await User.findById(req.user.userId);

        let isAuthorized = false;

        // Check if class teacher
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

            // Check if attendance already exists
            const filter = {
                student: studentId,
                class: classId,
                date: new Date(date).setHours(0, 0, 0, 0)
            };

            if (subjectId) filter.subject = subjectId;
            if (period) filter.period = period;

            const existingAttendance = await Attendance.findOne(filter);

            if (existingAttendance) {
                // Update existing
                existingAttendance.status = status;
                existingAttendance.remarks = remarks || '';
                existingAttendance.markedBy = req.user.userId;
                return await existingAttendance.save();
            } else {
                // Create new
                const attendance = new Attendance({
                    student: studentId,
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
            .populate('student', 'name email')
            .populate('markedBy', 'name')
            .populate('subject', 'name')
            .sort({ 'student.name': 1 });

        // Get all students in class
        const students = await User.find({ currentClass: classId, role: 'student' })
            .select('name email')
            .sort({ name: 1 });

        // Merge with attendance data
        const result = students.map(student => {
            const attendanceRecord = attendance.find(a => a.student._id.toString() === student._id.toString());
            return {
                student: {
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
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/subject/:subjectId/date/:date
// @desc    Get subject-specific attendance
// @access  Private (Teacher)
router.get('/subject/:subjectId/date/:date', auth, async (req, res) => {
    try {
        const { subjectId, date } = req.params;
        const { period } = req.query;

        // Get subject to find class
        const subject = await Subject.findById(subjectId).populate('class');
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        const filter = {
            class: subject.class._id,
            subject: subjectId,
            date: new Date(date).setHours(0, 0, 0, 0)
        };

        if (period) filter.period = parseInt(period);

        const attendance = await Attendance.find(filter)
            .populate('student', 'name email')
            .populate('markedBy', 'name')
            .sort({ 'student.name': 1 });

        // Get all students in class
        const students = await User.find({ currentClass: subject.class._id, role: 'student' })
            .select('name email')
            .sort({ name: 1 });

        const result = students.map(student => {
            const attendanceRecord = attendance.find(a => a.student._id.toString() === student._id.toString());
            return {
                student: {
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
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Teacher)
router.put('/:id', auth, async (req, res) => {
    try {
        const { status, remarks } = req.body;

        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Update fields
        if (status) attendance.status = status;
        if (remarks !== undefined) attendance.remarks = remarks;
        attendance.markedBy = req.user.userId;

        await attendance.save();

        res.json(attendance);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get student's attendance history
// @access  Private (Student/Teacher/Admin)
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate, subject } = req.query;

        const filter = { student: studentId };

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

        // Calculate percentage
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
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/student/:studentId/summary
// @desc    Get attendance summary (overall %, subject-wise %, monthly breakdown)
// @access  Private
router.get('/student/:studentId/summary', auth, async (req, res) => {
    try {
        const { studentId } = req.params;

        // Get current academic year dates (you may want to fetch from academic year settings)
        const currentYear = new Date().getFullYear();
        const academicYearStart = new Date(currentYear, 3, 1); // April 1st
        const academicYearEnd = new Date(currentYear + 1, 2, 31); // March 31st next year

        const attendance = await Attendance.find({
            student: studentId,
            date: { $gte: academicYearStart, $lte: academicYearEnd }
        }).populate('subject', 'name');

        // Overall percentage
        const totalRecords = attendance.length;
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const overallPercentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(2) : 0;

        // Subject-wise breakdown
        const subjectMap = {};
        attendance.forEach(record => {
            const subjectId = record.subject ? record.subject._id.toString() : 'general';
            const subjectName = record.subject ? record.subject.name : 'General';

            if (!subjectMap[subjectId]) {
                subjectMap[subjectId] = {
                    name: subjectName,
                    total: 0,
                    present: 0
                };
            }

            subjectMap[subjectId].total++;
            if (record.status === 'present') {
                subjectMap[subjectId].present++;
            }
        });

        const subjectWise = Object.keys(subjectMap).map(key => ({
            subjectId: key,
            name: subjectMap[key].name,
            total: subjectMap[key].total,
            present: subjectMap[key].present,
            percentage: ((subjectMap[key].present / subjectMap[key].total) * 100).toFixed(2)
        }));

        // Monthly breakdown
        const monthMap = {};
        attendance.forEach(record => {
            const month = new Date(record.date).toLocaleString('default', { month: 'short', year: 'numeric' });

            if (!monthMap[month]) {
                monthMap[month] = {
                    total: 0,
                    present: 0
                };
            }

            monthMap[month].total++;
            if (record.status === 'present') {
                monthMap[month].present++;
            }
        });

        const monthlyBreakdown = Object.keys(monthMap).map(month => ({
            month,
            total: monthMap[month].total,
            present: monthMap[month].present,
            percentage: ((monthMap[month].present / monthMap[month].total) * 100).toFixed(2)
        }));

        res.json({
            overall: {
                total: totalRecords,
                present: presentCount,
                percentage: parseFloat(overallPercentage)
            },
            subjectWise,
            monthlyBreakdown
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/class/:classId/report
// @desc    Class attendance report
// @access  Private (Teacher/Admin)
router.get('/class/:classId/report', auth, async (req, res) => {
    try {
        const { classId } = req.params;
        const { startDate, endDate } = req.query;

        const filter = { class: classId };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate).setHours(0, 0, 0, 0);
            if (endDate) filter.date.$lte = new Date(endDate).setHours(23, 59, 59, 999);
        }

        const attendance = await Attendance.find(filter);
        const students = await User.find({ currentClass: classId, role: 'student' }).select('name email');

        // Calculate per-student statistics
        const report = students.map(student => {
            const studentAttendance = attendance.filter(a => a.student.toString() === student._id.toString());
            const total = studentAttendance.length;
            const present = studentAttendance.filter(a => a.status === 'present').length;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

            return {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email
                },
                total,
                present,
                absent: studentAttendance.filter(a => a.status === 'absent').length,
                late: studentAttendance.filter(a => a.status === 'late').length,
                excused: studentAttendance.filter(a => a.status === 'excused').length,
                percentage: parseFloat(percentage)
            };
        });

        res.json(report);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/analytics
// @desc    School-wide attendance analytics
// @access  Private (Admin)
router.get('/analytics', auth, async (req, res) => {
    try {
        // Check admin authorization
        const user = await User.findById(req.user.userId);
        if (user.role !== 'admin' && user.role !== 'super admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const today = new Date().setHours(0, 0, 0, 0);
        const todayAttendance = await Attendance.find({ date: today });

        const totalToday = todayAttendance.length;
        const presentToday = todayAttendance.filter(a => a.status === 'present').length;
        const todayPercentage = totalToday > 0 ? ((presentToday / totalToday) * 100).toFixed(2) : 0;

        // Get last 30 days trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAttendance = await Attendance.find({
            date: { $gte: thirtyDaysAgo.setHours(0, 0, 0, 0) }
        });

        // Group by date
        const dateMap = {};
        recentAttendance.forEach(record => {
            const date = new Date(record.date).toLocaleDateString();
            if (!dateMap[date]) {
                dateMap[date] = { total: 0, present: 0 };
            }
            dateMap[date].total++;
            if (record.status === 'present') {
                dateMap[date].present++;
            }
        });

        const trend = Object.keys(dateMap).map(date => ({
            date,
            total: dateMap[date].total,
            present: dateMap[date].present,
            percentage: ((dateMap[date].present / dateMap[date].total) * 100).toFixed(2)
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            today: {
                total: totalToday,
                present: presentToday,
                absent: todayAttendance.filter(a => a.status === 'absent').length,
                percentage: parseFloat(todayPercentage)
            },
            trend
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
