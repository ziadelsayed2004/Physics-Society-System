const express = require('express');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Record = require('../models/Record');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and staff middleware to all routes
router.use(authenticateToken);
router.use(requireStaff);

// GET /api/students/search - Search students
router.get('/students/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = q.trim();
    
    // Search by studentId, fullName, or phoneNumber
    const students = await Student.find({
      $or: [
        { studentId: { $regex: searchQuery, $options: 'i' } },
        { fullName: { $regex: searchQuery, $options: 'i' } },
        { phoneNumber: { $regex: searchQuery, $options: 'i' } },
        { parentPhoneNumber: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(20);

    res.json({
      message: 'Search completed',
      students: students.map(student => ({
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        parentPhoneNumber: student.parentPhoneNumber,
        mainCenter: student.mainCenter,
        gender: student.gender,
        division: student.division
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// GET /api/students/:id - Get student profile with records
router.get('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all records for this student with session details
    const records = await Record.find({ student: id })
      .populate('session', 'weekNumber sessionType createdAt fullMark')
      .sort({ 'session.weekNumber': -1 });

    res.json({
      message: 'Student profile retrieved',
      student: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        parentPhoneNumber: student.parentPhoneNumber,
        mainCenter: student.mainCenter,
        gender: student.gender,
        division: student.division
      },
      records: records.map(record => ({
        id: record._id,
        weekNumber: record.session.weekNumber,
        sessionType: record.session.sessionType,
        fullMark: Number(record.session.fullMark || 10),
        attendance: record.attendance,
        grade: record.grade,
        issue: record.issue,
        center: record.center,
        createdAt: record.createdAt
      }))
    });
  } catch (error) {
    console.error('Student profile error:', error);
    res.status(500).json({ message: 'Failed to retrieve student profile', error: error.message });
  }
});

// GET /api/sessions - Get all sessions (for dropdowns)
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ weekNumber: -1 })
      .limit(50);

    res.json({
      message: 'Sessions retrieved',
      sessions: sessions.map(session => ({
        id: session._id,
        weekNumber: session.weekNumber,
        sessionType: session.sessionType,
        createdAt: session.createdAt
      }))
    });
  } catch (error) {
    console.error('Sessions retrieval error:', error);
    res.status(500).json({ message: 'Failed to retrieve sessions', error: error.message });
  }
});

module.exports = router;