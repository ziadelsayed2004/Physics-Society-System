const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { handleCsvUpload } = require('../controllers/uploadController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Session = require('../models/Session');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.csv';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow Excel and CSV files
    const allowedExtensions = /csv|xlsx|xls/;
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {  // Require both extension and mimetype to match
      return cb(null, true);
    } else {
      return cb(new Error('Error: File upload only supports the following filetypes - ' + filetypes), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  }
});

// Apply authentication middleware
router.use(authenticateToken);
router.use(requireAdmin);

// POST /api/upload/csv - Handle CSV file uploads
router.post('/csv', upload.single('file'), async (req, res) => {
  console.log('Upload request received:', {
    body: req.body,
    file: req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : null
  });

  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No file uploaded'
      });
    }

  const { uploadType, sessionId, center } = req.body;

    if (!uploadType) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Upload type is required'
      });
    }

    // Validate session ID for relevant upload types
    if (['attendance', 'grades', 'warnings'].includes(uploadType)) {
      if (!sessionId) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Session ID is required for this upload type'
        });
      }

      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Invalid session ID'
        });
      }
      console.log('Session validated:', session);
    }

  console.log('Starting file processing');
  // Pass center when provided (used for student uploads to set mainCenter)
  const result = await handleCsvUpload(req.file, uploadType, sessionId, center);
    console.log('Processing completed:', result);

    // Format success message in Arabic
    let arabicMessage = '';
    if (uploadType === 'students') {
      arabicMessage = `تم بنجاح! إضافة ${result.created} طالبًا جديدًا وتحديث بيانات ${result.updated} طلاب`;
    } else {
      arabicMessage = `تم معالجة ${result.processed} سجل بنجاح`;
    }

    res.json({
      status: 'success',
      message: arabicMessage,
      details: {
        created: result.created || 0,
        updated: result.updated || 0,
        processed: result.processed || 0,
        errors: result.errors || [],
        logs: result.logs || []
      },
      uploadType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'خطأ في معالجة الملف',
      error: error.message,
      details: error.stack
    });

    // Cleanup: remove uploaded file in case of error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing temporary file:', unlinkError);
      }
    }
  }
});

module.exports = router;