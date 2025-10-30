const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Record = require('../models/Record');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// POST /api/students/upload - Upload students CSV
router.post('/students/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        // Validate required fields
        if (!data.studentId || !data.fullName || !data.phoneNumber || !data.mainCenter) {
          errors.push(`Missing required fields for row: ${JSON.stringify(data)}`);
          return;
        }
        results.push(data);
      })
      .on('end', async () => {
        try {
          let createdCount = 0;
          let updatedCount = 0;

          // Process each student
          for (const studentData of results) {
            const existingStudent = await Student.findOne({
              studentId: studentData.studentId
            });

            if (existingStudent) {
              // Update existing student
              await Student.findByIdAndUpdate(existingStudent._id, {
                fullName: studentData.fullName,
                phoneNumber: studentData.phoneNumber,
                parentPhoneNumber: studentData.parentPhoneNumber || '',
                mainCenter: studentData.mainCenter
              });
              updatedCount++;
            } else {
              // Create new student
              await Student.create({
                studentId: studentData.studentId,
                fullName: studentData.fullName,
                phoneNumber: studentData.phoneNumber,
                parentPhoneNumber: studentData.parentPhoneNumber || '',
                mainCenter: studentData.mainCenter
              });
              createdCount++;
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Students processed successfully',
            created: createdCount,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error('Error processing students:', error);
          res.status(500).json({ message: 'Error processing students', error: error.message });
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(400).json({ message: 'Error parsing CSV file', error: error.message });
      });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// POST /api/sessions - Create new weekly session and initialize records
router.post('/sessions', async (req, res) => {
  try {
    const { weekNumber, sessionType, fullMark } = req.body;

    if (!weekNumber) {
      return res.status(400).json({ message: 'Week number is required' });
    }

    // Check if session already exists
    const existingSession = await Session.findOne({ weekNumber });
    if (existingSession) {
      return res.status(400).json({ message: 'Session for this week already exists' });
    }

    // Create new session
    const session = await Session.create({
      weekNumber: parseInt(weekNumber),
      sessionType: sessionType || 'عادية',
      fullMark: fullMark,
      isActive: true
    });

    // Initialize records for all students in their main centers
    const students = await Student.find();
    const records = students.map(student => ({
      student: student._id,
      session: session._id,
      center: student.mainCenter,
      mainCenter: student.mainCenter,
      attendance: 'غياب',  // Default to absent
      grade: '-'  // Default grade
    }));
    
    if (records.length > 0) {
      await Record.insertMany(records);
    }

    res.status(201).json({
      message: 'Weekly session created and initialized for all centers',
      session,
      studentsInitialized: students.length
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ message: 'Error creating session', error: error.message });
  }
});

// POST /api/records/upload/attendance - Upload attendance CSV
router.post('/records/upload/attendance', upload.single('file'), async (req, res) => {
  try {
    const { sessionId, center } = req.body;

    if (!req.file || !sessionId || !center) {
      return res.status(400).json({
        message: 'File, session ID, and center are required'
      });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (!data.studentId) {
          errors.push(`Missing studentId for row: ${JSON.stringify(data)}`);
          return;
        }
        results.push(data);
      })
      .on('end', async () => {
        try {
          let processedCount = 0;

          for (const attendanceData of results) {
            // Find student
            const student = await Student.findOne({
              studentId: attendanceData.studentId
            });

            if (!student) {
              errors.push(`Student not found: ${attendanceData.studentId}`);
              continue;
            }

            // Process attendance with makeup logic
            let attendanceStatus = 'غياب'; // Default to absent
            
            // Find student's record for this session
            let record = await Record.findOne({
              student: student._id,
              session: sessionId
            });

            if (!record) {
              // Create new record if doesn't exist
              record = await Record.create({
                student: student._id,
                session: sessionId,
                attendance: 'غياب',
                center: center,
                mainCenter: student.mainCenter
              });
            }

            // Determine if this is makeup attendance
            if (student.mainCenter !== center) {
              attendanceStatus = 'تعويض حضور';
            } else if (attendanceData.attendance && attendanceData.attendance.trim() !== '') {
              attendanceStatus = attendanceData.attendance.trim();
            }

            // Update attendance
            record.attendance = attendanceStatus;
            record.center = center;
            await record.save();

            // Clear absence in main center if attended elsewhere
            if (attendanceStatus !== 'غياب' && center !== student.mainCenter) {
              await Record.updateOne(
                {
                  student: student._id,
                  session: sessionId,
                  center: student.mainCenter
                },
                {
                  $set: {
                    attendance: 'تعويض حضور',
                    center: center
                  }
                }
              );
            }

            processedCount++;
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Attendance processed successfully',
            processed: processedCount,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error('Error processing attendance:', error);
          res.status(500).json({ message: 'Error processing attendance', error: error.message });
        }
      });
  } catch (error) {
    console.error('Attendance upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// POST /api/records/upload/grades - Upload grades CSV
router.post('/records/upload/grades', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!req.file || !sessionId) {
      return res.status(400).json({
        message: 'File and session ID are required'
      });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (!data.studentId) {
          errors.push(`Missing studentId for row: ${JSON.stringify(data)}`);
          return;
        }
        results.push(data);
      })
      .on('end', async () => {
        try {
          let processedCount = 0;

          for (const gradeData of results) {
            // Find student
            const student = await Student.findOne({
              studentId: gradeData.studentId
            });

            if (!student) {
              errors.push(`Student not found: ${gradeData.studentId}`);
              continue;
            }

            // Process grades with proper handling of missing/failed submissions
            let record = await Record.findOne({
              student: student._id,
              session: sessionId
            });

            if (!record) {
              // Create new record if doesn't exist
              record = await Record.create({
                student: student._id,
                session: sessionId,
                grade: '-',
                center: student.mainCenter,
                mainCenter: student.mainCenter
              });
            }

            // Update grade - use '-' for missing/failed submissions
            record.grade = gradeData.grade || '-';
            await record.save();

            processedCount++;
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Grades processed successfully',
            processed: processedCount,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error('Error processing grades:', error);
          res.status(500).json({ message: 'Error processing grades', error: error.message });
        }
      });
  } catch (error) {
    console.error('Grades upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// POST /api/records/upload/warnings - Upload warnings CSV
router.post('/records/upload/warnings', upload.single('file'), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!req.file || !sessionId) {
      return res.status(400).json({
        message: 'File and session ID are required'
      });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (!data.studentId) {
          errors.push(`Missing studentId for row: ${JSON.stringify(data)}`);
          return;
        }
        results.push(data);
      })
      .on('end', async () => {
        try {
          let processedCount = 0;

          for (const warningData of results) {
            // Find student
            const student = await Student.findOne({
              studentId: warningData.studentId
            });

            if (!student) {
              errors.push(`Student not found: ${warningData.studentId}`);
              continue;
            }

            // Process warnings with warning text
            let record = await Record.findOne({
              student: student._id,
              session: sessionId
            });

            if (!record) {
              // Create new record if doesn't exist
              record = await Record.create({
                student: student._id,
                session: sessionId,
                warning: false,
                center: student.mainCenter,
                mainCenter: student.mainCenter
              });
            }

            // Update warning status and text
            record.warning = warningData.warning === 'true' || warningData.warning === '1';
            if (record.warning && warningData.warningText) {
              record.warningText = warningData.warningText;
            } else {
              record.warningText = null;
            }
            await record.save();

            processedCount++;
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'Warnings processed successfully',
            processed: processedCount,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error('Error processing warnings:', error);
          res.status(500).json({ message: 'Error processing warnings', error: error.message });
        }
      });
  } catch (error) {
    console.error('Warnings upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// PUT /api/students/:id - Update student details
router.put('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber, parentPhoneNumber, mainCenter, gender, division } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !mainCenter) {
      return res.status(400).json({
        message: 'Full name, phone number, and main center are required'
      });
    }

    // Check if student exists
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        fullName,
        phoneNumber,
        parentPhoneNumber: parentPhoneNumber || '',
        mainCenter,
        gender,
        division
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Student updated successfully',
      student: {
        id: updatedStudent._id,
        studentId: updatedStudent.studentId,
        fullName: updatedStudent.fullName,
        phoneNumber: updatedStudent.phoneNumber,
        parentPhoneNumber: updatedStudent.parentPhoneNumber,
        mainCenter: updatedStudent.mainCenter,
        gender: updatedStudent.gender,
        division: updatedStudent.division
      }
    });
  } catch (error) {
    console.error('Student update error:', error);
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
});

// DELETE /api/students/:id - Delete student and all associated records
router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Delete all associated records
    await Record.deleteMany({ student: id });

    // Delete the student
    await Student.findByIdAndDelete(id);

    res.json({
      message: 'Student and all associated records deleted successfully',
      deletedStudent: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName
      }
    });
  } catch (error) {
    console.error('Student deletion error:', error);
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
});

// DELETE /api/records - Delete weekly records for specific session and center
router.delete('/records', async (req, res) => {
  try {
    const { session: sessionId, center } = req.query;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Build query
    let query = { session: sessionId };
    if (center) {
      query.center = center;
    }

    // Delete records
    const result = await Record.deleteMany(query);

    res.json({
      message: 'Weekly records deleted successfully',
      deletedCount: result.deletedCount,
      session: {
        weekNumber: session.weekNumber,
        sessionType: session.sessionType
      },
      center: center || 'All Centers'
    });
  } catch (error) {
    console.error('Records deletion error:', error);
    res.status(500).json({ message: 'Error deleting records', error: error.message });
  }
});

// POST /api/records/paste - Process pasted data from Excel/Sheets
router.post('/records/paste', async (req, res) => {
  try {
    const { sessionId, centerName, dataType, pastedData } = req.body;

    // Validate required fields
    if (!sessionId || !centerName || !dataType || !pastedData) {
      return res.status(400).json({
        message: 'Session ID, center name, data type, and pasted data are required'
      });
    }

    // Verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Parse the pasted data
    const lines = pastedData.trim().split('\n');
    const rows = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        // Split by tab (standard Excel/Sheets delimiter)
        const columns = trimmedLine.split('\t').map(col => col.trim());
        if (columns.length >= 1) {
          rows.push(columns);
        }
      }
    }

    let processedCount = 0;
    const errors = [];

    // Process based on data type
    for (const columns of rows) {
      const studentId = columns[0];
      
      if (!studentId) {
        errors.push('Missing student ID in row');
        continue;
      }

      // Find student
      const student = await Student.findOne({ studentId });
      if (!student) {
        errors.push(`Student not found: ${studentId}`);
        continue;
      }

      // Find or create record
      let record = await Record.findOne({
        student: student._id,
        session: sessionId
      });

      if (!record) {
        record = new Record({
          student: student._id,
          session: sessionId,
          center: centerName
        });
      }

      // Update record based on data type
      if (dataType === 'attendance') {
        const attendanceValue = columns[1] || 'حضور';
        record.attendance = attendanceValue;
        record.center = centerName;
      } else if (dataType === 'grades') {
        const gradeValue = columns[1] || '-';
        record.grade = gradeValue;
      } else if (dataType === 'warnings') {
        const warningValue = columns[1] || 'false';
        record.warning = warningValue === 'true' || warningValue === '1' || warningValue === 'TRUE';
      }

      await record.save();
      processedCount++;
    }

    res.json({
      message: `تمت معالجة ${processedCount} سجلًا بنجاح`,
      processed: processedCount,
      errors: errors.length > 0 ? errors : null,
      session: {
        weekNumber: session.weekNumber,
        sessionType: session.sessionType
      },
      center: centerName
    });
  } catch (error) {
    console.error('Paste data error:', error);
    res.status(500).json({ message: 'Error processing pasted data', error: error.message });
  }
});

// DELETE /api/sessions/:id - Delete a session and associated records
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Delete associated records
    const result = await Record.deleteMany({ session: id });

    // Delete the session
    await Session.findByIdAndDelete(id);

    res.json({
      message: 'Session and associated records deleted successfully',
      deletedRecords: result.deletedCount,
      session: { id: session._id, weekNumber: session.weekNumber }
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ message: 'Error deleting session', error: error.message });
  }
});

module.exports = router;