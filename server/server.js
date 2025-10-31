const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');
const centerRoutes = require('./routes/centerRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
app.use('/api/auth', authRoutes);
// More specific routes first
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/upload', uploadRoutes);
// Less specific routes last
app.use('/api', staffRoutes);
app.use('/api', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Centers Management System API is running',
    timestamp: new Date().toISOString()
  });
});


// =================================================================
//  >>>>> START: الكود الجديد لخدمة الفرونت إند <<<<<
// =================================================================

// The '..' is crucial because this script runs from inside the 'server' folder,
// and we need to go up one level to find the 'client' folder.
app.use(express.static(path.join(__dirname, '..', 'client/build')));

// For any request that doesn't match an API route, send back the React app's
// main index.html file. This is the key for React Router to work.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client/build', 'index.html'));
});

// =================================================================
//  >>>>> END: الكود الجديد لخدمة الفرونت إند <<<<<
// =================================================================


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});


// Connect to MongoDB and start server
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
};

startServer();

module.exports = app;
