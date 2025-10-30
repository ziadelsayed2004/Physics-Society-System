const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAttendanceReport, getAbsenceReport, getGradesReport, getIssuesReport, exportReport, exportCenterData } = require('../controllers/reportController');

// Get attendance report
router.get('/attendance', authenticateToken, (req, res) => {
  getAttendanceReport(req, res).catch(err => {
    res.status(500).json({ success: false, message: err.message });
  });
});

// Get absence report
router.get('/absence', authenticateToken, (req, res) => {
  getAbsenceReport(req, res).catch(err => {
    res.status(500).json({ success: false, message: err.message });
  });
});

// Get grades report
router.get('/grades', authenticateToken, (req, res) => {
  getGradesReport(req, res).catch(err => {
    res.status(500).json({ success: false, message: err.message });
  });
});

// Get issues report
router.get('/issues', authenticateToken, (req, res) => {
  getIssuesReport(req, res).catch(err => {
    res.status(500).json({ success: false, message: err.message });
  });
});

// Export weekly/filtered report
router.get('/export', authenticateToken, (req, res) => {
  exportReport(req, res).catch(err => {
    if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
    }
  });
});

// Export all student data for a specific center
router.get('/center/:centerName/export', authenticateToken, (req, res) => {
  exportCenterData(req, res).catch(err => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
});

module.exports = router;