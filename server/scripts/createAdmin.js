const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import User model
const User = require('../models/User');

const createDefaultAdmin = async () => {
  try {
    // Validate environment variables
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in .env file');
      process.exit(1);
    }

    // Connect to MongoDB with modern practices
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      process.exit(0);
    }

    // Create default admin user
    const adminUser = new User({
      username: 'admin',
      password: 'admin123', // This will be hashed by the pre-save hook
      role: 'Admin'
    });

    await adminUser.save();
    console.log('✅ Default admin user created successfully');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Admin');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

createDefaultAdmin();
