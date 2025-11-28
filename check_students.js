// const axios = require('axios');

async function checkStudents() {
    try {
        // Login as admin first (hardcoded for now, or use existing token if I could access it)
        // Assuming I can't easily login without credentials.
        // But I have access to the codebase, so I can check the database directly if I had mongo tools.
        // Since I don't have mongo tools, I'll try to use the existing backend code to query.

        console.log("Starting script...");
        const mongoose = require('mongoose');
        const User = require('./src/models/User');
        require('dotenv').config({ path: './.env' });
        console.log("URI:", process.env.MONGODB_URI ? "Found" : "Missing");

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const students = await User.find({ role: 'student' }).limit(5);
        console.log(`Found ${students.length} students.`);
        if (students.length > 0) {
            console.log("First student:", students[0].name, "Role:", students[0].role);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkStudents();
