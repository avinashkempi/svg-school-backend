require('dotenv').config();
const mongoose = require('mongoose');
const AcademicYear = require('../src/models/AcademicYear');
const Class = require('../src/models/Class');
const User = require('../src/models/User');
const ClassContent = require('../src/models/ClassContent');
const connectDB = require('../src/config/database');

const verifyFlow = async () => {
    try {
        await connectDB();
        console.log('Starting Verification Flow...');

        // 1. Create Academic Year
        const yearName = `Verify-${Date.now()}`;
        const academicYear = await AcademicYear.create({
            name: yearName,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true
        });
        console.log(`✅ Academic Year Created: ${academicYear.name}`);

        // 2. Create Teacher
        const teacherEmail = `teacher-${Date.now()}@test.com`;
        const teacher = await User.create({
            name: 'Verify Teacher',
            email: teacherEmail,
            password: 'password123',
            role: 'class teacher',
            designation: 'Senior Teacher',
            joiningDate: new Date()
        });
        console.log(`✅ Teacher Created: ${teacher.name}`);

        // 3. Create Class
        const className = `Class-${Date.now()}`;
        const newClass = await Class.create({
            name: className,
            section: 'A',
            academicYear: academicYear._id,
            classTeacher: teacher._id,
            branch: 'Main'
        });
        console.log(`✅ Class Created: ${newClass.name}`);

        // 4. Create Student
        const studentEmail = `student-${Date.now()}@test.com`;
        const student = await User.create({
            name: 'Verify Student',
            email: studentEmail,
            password: 'password123',
            role: 'student',
            currentClass: newClass._id,
            academicYear: academicYear._id,
            admissionDate: new Date(),
            guardianName: 'Guardian',
            guardianPhone: '1234567890'
        });
        console.log(`✅ Student Created: ${student.name}`);

        // 5. Post Content (as Teacher)
        const content = await ClassContent.create({
            title: 'Verify Homework',
            description: 'This is a test homework',
            type: 'homework',
            class: newClass._id,
            author: teacher._id
        });
        console.log(`✅ Content Posted: ${content.title}`);

        // 6. Verify Content Fetch
        const fetchedContent = await ClassContent.find({ class: newClass._id });
        if (fetchedContent.length > 0 && fetchedContent[0].title === 'Verify Homework') {
            console.log('✅ Verification Successful: Content found for class.');
        } else {
            console.error('❌ Verification Failed: Content not found.');
        }

        // Cleanup
        await ClassContent.deleteMany({ class: newClass._id });
        await User.findByIdAndDelete(student._id);
        await Class.findByIdAndDelete(newClass._id);
        await User.findByIdAndDelete(teacher._id);
        await AcademicYear.findByIdAndDelete(academicYear._id);
        console.log('✅ Cleanup Complete');

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

verifyFlow();
