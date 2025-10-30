const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is Admin or Staff
const requireStaff = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Staff or Admin access required' });
  }
  
  // Enforce view-only access for Staff role
  if (req.user.role === 'Staff' && 
      (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
    return res.status(403).json({ 
      message: 'Staff members have view-only access. Contact an administrator for data modifications.' 
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStaff
};
