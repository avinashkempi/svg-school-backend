const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/svg-school-db');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists:', existingAdmin.username);
      return;
    }

    // Create new admin user
    const adminUser = new User({
      username: 'adminuser',
      email: 'admin@example.com',
      password: 'AdminPass123!',
      role: 'admin'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Username: adminuser');
    console.log('Email: admin@example.com');
    console.log('Password: AdminPass123!');
    console.log('Role: admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

const run = async () => {
  await connectDB();
  await createAdminUser();
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
};

run().catch(console.error);
