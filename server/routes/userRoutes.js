const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ 
        message: 'Username, password, and role are required' 
      });
    }

    // Validate role
    if (!['Admin', 'Staff'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be either Admin or Staff' 
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      password,
      role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Users retrieved successfully',
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('Users retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving users', error: error.message });
  }
});

// PUT /api/users/:id - Update user details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password } = req.body;

    // Validate role if provided
    if (role && !['Admin', 'Staff'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be either Admin or Staff' 
      });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is being changed and if it already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      user.username = username;
    }

    if (role) {
      user.role = role;
    }

    if (password) {
      user.password = password;
    }

    // Save the updated user
    const updatedUser = await user.save();


    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the last admin user' 
        });
      }
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;
