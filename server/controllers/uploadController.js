const fs = require('fs');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const Record = require('../models/Record');
const Session = require('../models/Session');

// Header mappings for bilingual support
const HEADER_MAPPINGS = {
  students: {
    'ID': ['رقم الـ ID'],
    'Student Name': ['اسم الطالب'],
    'Student Phone': ['رقم الطالب'],
    'Parent Phone': ['رقم ولي الأمر'],
    'Gender': ['النوع'],
    'Division': ['الشعبة']
  },
  attendance: {
    'Parent Phone': ['رقم ولي الامر'],
    'Student Phone': ['رقم الطالب'],
    'Student Name': ['اسم الطالب'],
    'ID': ['كود الطالب']
  }
};

const EXPECTED_STUDENT_HEADERS_EN = ["ID", "Student Name", "Student Phone", "Parent Phone", "Gender", "Division"];
const EXPECTED_STUDENT_HEADERS_AR = ["رقم الـ ID", "اسم الطالب", "رقم الطالب", "رقم ولي الأمر", "النوع", "الشعبة"];

// Headers for attendance/absence sheets in exact order
const EXPECTED_ATTENDANCE_HEADERS = ["رقم ولي الامر", "رقم الطالب", "اسم الطالب", "كود الطالب"];


// Utility function for consistent logging
const logOperation = async (operation, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${operation}:`, JSON.stringify(data, null, 2));
};

// New function to mark remaining students as absent for a session
const markRemainingStudentsAsAbsent = async (session, center) => {
  try {
    if (!center) {
      throw new Error('Center is required for marking absences');
    }

    await logOperation('Starting automatic absence marking process', { 
      sessionId: session._id,
      center,
      weekNumber: session.weekNumber
    });

    // First, check how many students are registered in this center with detailed logging
    const totalStudents = await Student.countDocuments({ mainCenter: center });
    const registeredStudents = await Student.find({ mainCenter: center })
      .select('studentId fullName mainCenter')
      .lean();
    
    await logOperation('Found students in center', { 
      center,
      totalStudents,
      registeredStudentIds: registeredStudents.map(s => s.studentId)
    });

    if (totalStudents === 0) {
      await logOperation('Skipping absence marking', { 
        center,
        reason: 'No students found registered in this center.'
      });
      return; // Exit gracefully
    }

    // Find all students who already have a record in this session with detailed logging
    const existingRecords = await Record.find({ 
      session: session._id 
    })
    .select('student attendance mainCenter')
    .populate('student', 'studentId fullName mainCenter');
    
    const existingStudentIds = existingRecords.map(r => r.student._id);
    const presentCount = existingRecords.filter(r => 
      ['حضور', 'تعويض حضور'].includes(r.attendance)
    ).length;
    
    // Log detailed attendance status
    await logOperation('Current attendance details', {
      totalExistingRecords: existingRecords.length,
      presentCount,
      presentStudents: existingRecords
        .filter(r => ['حضور', 'تعويض حضور'].includes(r.attendance))
        .map(r => ({
          studentId: r.student.studentId,
          mainCenter: r.mainCenter,
          attendance: r.attendance
        }))
    });

    await logOperation('Current attendance status', {
      totalRecords: existingRecords.length,
      presentStudents: presentCount
    });

    // Find all students from the center who don't have a record yet
    const absentStudents = await Student.find({
      mainCenter: center,
      _id: { $nin: existingStudentIds }
    });

    if (absentStudents.length > 0) {
      // Prepare bulk operations for marking students as absent
      const operations = absentStudents.map(student => ({
        insertOne: {
          document: {
            student: student._id,
            session: session._id,
            center: student.mainCenter,
            mainCenter: student.mainCenter,
            attendance: 'غياب',
            grade: '-'
          }
        }
      }));

    if (operations.length > 0) {
      const result = await Record.bulkWrite(operations);
      await logOperation('Bulk absence marking complete', { 
        sessionId: session._id,
        result: result.result 
      });
    }
    }
  } catch (error) {
    await logOperation('Error marking remaining students as absent', {
      sessionId: session._id,
      error: error.message
    });
    throw error;
  }
};

// New function to set default grades for absentees
const setDefaultGradesForAbsentees = async (session) => {
  try {
    await logOperation('Setting default grades for absentees', { sessionId: session._id });

    const result = await Record.updateMany(
      { 
        session: session._id,
        $or: [
          { grade: { $exists: false } },
          { grade: null },
          { grade: '' }
        ]
      },
      { $set: { grade: '-' } }
    );

    await logOperation('Default grades set for absentees', {
      sessionId: session._id,
      modifiedCount: result.modifiedCount
    });

    return result;
  } catch (error) {
    await logOperation('Error setting default grades', {
      sessionId: session._id,
      error: error.message
    });
    throw error;
  }
};

// Process a single student CSV row matching the exact CSV spec
const processStudentData = async (row, selectedCenter) => {
  await logOperation('Processing student row', { row, selectedCenter });
  try {
    if (!selectedCenter) {
      throw new Error('Center selection is required for student data upload');
    }

    // Expected columns: ID, Student Name, Student Phone, Parent Phone, Gender, Division
    const id = row['ID'];
    const name = row['Student Name'];
    const phone = row['Student Phone'];
    const parentPhone = row['Parent Phone'];
    const gender = row['Gender'];
    const division = row['Division'];

    const mainCenter = selectedCenter.toString().trim();

    const missing = [];
    if (!id) missing.push('ID');
    if (!name) missing.push('Student Name');
    if (!phone) missing.push('Student Phone');
    // Gender and Division are optional
    if (!mainCenter) missing.push('Center (mainCenter)');

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate numbers: ID and phones must be exactly 11 digits
    const cleanNumber = (val) => val.toString().replace(/\D/g, '');
    const studentIdClean = cleanNumber(id);
    if (studentIdClean.length !== 11) throw new Error(`ID must be exactly 11 digits (got ${studentIdClean.length})`);

    const phoneClean = cleanNumber(phone);
    if (phoneClean.length !== 11) throw new Error(`Student Phone must be exactly 11 digits (got ${phoneClean.length})`);

    const parentPhoneClean = parentPhone ? cleanNumber(parentPhone) : '';
    if (parentPhone && parentPhoneClean.length !== 11) throw new Error(`Parent Phone must be exactly 11 digits (got ${parentPhoneClean.length})`);

    // Validate gender and division if provided (they are optional)
    const genderTrimmed = gender ? gender.toString().trim() : '';
    if (genderTrimmed !== '') {
      const allowedGenders = ['ذكر', 'انثى'];
      if (!allowedGenders.includes(genderTrimmed)) {
        throw new Error(`Invalid Gender value: ${genderTrimmed}. Allowed: ${allowedGenders.join(', ')}`);
      }
    }

    const divisionTrimmed = division ? division.toString().trim() : '';
    if (divisionTrimmed !== '') {
      const allowedDivisions = ['علمي علوم', 'علمي رياضة', 'أزهر'];
      if (!allowedDivisions.includes(divisionTrimmed)) {
        throw new Error(`Invalid Division value: ${divisionTrimmed}. Allowed: ${allowedDivisions.join(', ')}`);
      }
    }

    const studentData = {
      studentId: studentIdClean,
      fullName: name.toString().trim(),
      phoneNumber: phoneClean,
      parentPhoneNumber: parentPhoneClean || undefined,
      mainCenter,
      ...(genderTrimmed && { gender: genderTrimmed }),
      ...(divisionTrimmed && { division: divisionTrimmed })
    };

    await logOperation('Attempting to find student', { id: studentIdClean });
    const existing = await Student.findOne({ studentId: studentIdClean });
    if (existing) {
      await logOperation('Updating existing student', { id: existing._id, data: studentData, currentMainCenter: existing.mainCenter });
      // Explicitly set mainCenter in update operation to ensure it's not lost
      // Use $set operator to explicitly set each field without affecting others
      const updateData = {
        $set: {
          studentId: studentData.studentId,
          fullName: studentData.fullName,
          phoneNumber: studentData.phoneNumber,
          parentPhoneNumber: studentData.parentPhoneNumber,
          mainCenter: mainCenter, // Explicitly set mainCenter
        }
      };
      
      // Only add gender and division if they have values (optional fields)
      if (genderTrimmed) {
        updateData.$set.gender = genderTrimmed;
      }
      if (divisionTrimmed) {
        updateData.$set.division = divisionTrimmed;
      }
      
      const updated = await Student.findByIdAndUpdate(
        existing._id,
        updateData,
        {
          new: true,
          runValidators: true,
          context: 'query'
        }
      );
      if (!updated) throw new Error('Failed to update student');
      if (updated.mainCenter !== mainCenter) {
        throw new Error('Failed to update mainCenter');
      }
      await logOperation('Student updated', {
        id: updated._id,
        oldMainCenter: existing.mainCenter,
        newMainCenter: updated.mainCenter
      });
      return { action: 'updated', id: studentIdClean, data: updated };
    } else {
      await logOperation('Creating new student', studentData);
      const created = await Student.create(studentData);
      await logOperation('Student created', created);
      return { action: 'created', id: studentIdClean, data: created };
    }
  } catch (error) {
    await logOperation('Error processing student', { error: error.message, row });
    return { error: true, id: (row && (row['ID'] || row.ID)) || 'unknown', message: error.message, data: row };
  }
};

const processAttendanceAndIssues = async (row, session, type, center) => {
  try {
    if (!center) {
      throw new Error('Center is required for processing');
    }

    const id = row['كود الطالب'];
    const student = await Student.findOne({ studentId: id });
    if (!student) {
      return { error: true, id, message: 'Student not found' };
    }

    const recordData = {
      student: student._id,
      session: session._id,
      center: center,
      mainCenter: student.mainCenter
    };

    if (type === 'attendance') {
      if (student.mainCenter !== center) {
        recordData.attendance = 'تعويض حضور';
        recordData.makeupReason = `حضور في سنتر / مجموعة ${center} بدلاً من السنتر / المجموعة الأساسي ${student.mainCenter}`;
      } else {
        recordData.attendance = 'حضور';
      }
    } else if (type === 'issues') {
      recordData.issue = true;
    }

    const record = await Record.findOneAndUpdate(
      { student: student._id, session: session._id },
      { $set: recordData },
      { upsert: true, new: true, runValidators: true }
    );

    if (!record) {
      throw new Error('Failed to save record');
    }

    return { action: 'processed', id };
  } catch (error) {
    return { error: true, id: row['كود الطالب'], message: error.message };
  }
};


// Absence handling is now done automatically by markRemainingStudentsAsAbsent

const EXPECTED_GRADE_HEADERS = ["رقم وليامر", "رقم الطالب", "اسم الطالب", "كود الطالب", "الدرجة"];

const processGrades = async (row, session, center) => {
  try {
    if (!center) {
      throw new Error('يجب تحديد السنتر / المجموعة لرفع الدرجات');
    }
    // Extract values from row using exact Arabic headers
    const grade = row['الدرجة']?.toString().trim();
    const id = row['كود الطالب']?.toString().trim();
    const studentPhone = row['رقم الطالب']?.toString().trim();
    const parentPhone = row['رقم وليامر']?.toString().trim();
    const studentName = row['اسم الطالب']?.toString().trim();

    // Validate required fields
    if (!grade && grade !== '0') {
      throw new Error('الدرجة مطلوبة (Grade is required)');
    }
    if (!id) {
      throw new Error('كود الطالب مطلوب (Student ID is required)');
    }

    // تنظيف وتحقق من رقم ID (11 رقم)
    const studentId = id.toString().replace(/\D/g, '');
    if (studentId.length !== 11) {
      throw new Error(`Student ID must be exactly 11 digits (got ${studentId.length} digits)`);
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      await logOperation('Student not found', { id: studentId });
      return { error: true, id: studentId, message: 'Student not found' };
    }

    // Update or create record with better error handling
    try {
      const record = await Record.findOneAndUpdate(
        { student: student._id, session: session._id },
        {
          grade,
          center: student.mainCenter, // Always use student's main center
          mainCenter: student.mainCenter
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      if (!record) {
        throw new Error('Failed to save grade record');
      }

      await logOperation('Grade processed successfully', {
        id: studentId,
        grade,
        recordId: record._id
      });

      return { action: 'processed', id: studentId };
    } catch (error) {
      await logOperation('Failed to save grade', {
        error: error.message,
        id: studentId,
        grade
      });
      throw error;
    }
  } catch (error) {
    await logOperation('Error processing grade', {
      error: error.message,
      row: row
    });
    return { error: true, id: (row && (row['ID'] || row.ID)) || 'unknown', message: error.message };
  }
};

const validateSession = async (sessionId) => {
  try {
    if (!sessionId) {
      await logOperation('Session validation failed', { error: 'Session ID is required' });
      throw new Error('Session ID is required for this upload type');
    }
    
    const session = await Session.findById(sessionId);
    if (!session) {
      await logOperation('Session validation failed', { error: 'Invalid session ID', sessionId });
      throw new Error('Invalid session ID');
    }
    
    await logOperation('Session validated', { sessionId, weekNumber: session.weekNumber });
    return session;
  } catch (error) {
    await logOperation('Session validation error', {
      error: error.message,
      sessionId
    });
    throw error;
  }
};

// Cleanup handled above - removing duplicate declaration

const handleCsvUpload = async (file, uploadType, sessionId = null, center = null) => {
  await logOperation('Starting upload process (xlsx/csv compatible)', {
    fileName: file.originalname,
    uploadType,
    sessionId,
    center,
    fileSize: file.size
  });

  // Validate center parameter for attendance uploads
  if (uploadType === 'attendance' && !center) {
    throw new Error('Center selection is required for attendance uploads');
  }

  let session = null;
  if (['attendance', 'issues', 'grades'].includes(uploadType)) {
    try {
      session = await validateSession(sessionId);
    } catch (error) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  try {
    // Read workbook (supports .xlsx and .xls) from uploaded file path
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames && workbook.SheetNames[0];
    if (!sheetName) {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      throw new Error('Uploaded Excel file contains no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Get header row as an ordered array to validate exact headers when required
    const sheetAsArrays = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!sheetAsArrays || sheetAsArrays.length === 0) {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      throw new Error('The Excel sheet is empty');
    }

    const receivedHeaders = sheetAsArrays[0].map(h => h.toString().trim());

    // Validate headers for different upload types with more flexible matching
    if (uploadType === 'students') {
      // Check if all required headers are present (in either English or Arabic)
      const hasAllArabicHeaders = EXPECTED_STUDENT_HEADERS_AR.every(header => 
        receivedHeaders.some(h => h.trim() === header.trim())
      );
      const hasAllEnglishHeaders = EXPECTED_STUDENT_HEADERS_EN.every(header => 
        receivedHeaders.some(h => h.trim() === header.trim())
      );
      
      // Log received headers for debugging
      await logOperation('Validating student headers', {
        receivedHeaders,
        hasAllArabicHeaders,
        hasAllEnglishHeaders
      });

      if (!hasAllArabicHeaders && !hasAllEnglishHeaders) {
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
        throw new Error(
          `Missing required headers. Expected either:\n` +
          `English: ${EXPECTED_STUDENT_HEADERS_EN.join(', ')}\n` +
          `Arabic: ${EXPECTED_STUDENT_HEADERS_AR.join(', ')}\n` +
          `Found: ${receivedHeaders.join(', ')}\n\n` +
          `Note: Headers must match exactly (check for extra spaces)`
        );
      }
    } else if (uploadType === 'attendance' || uploadType === 'issues') {
      // Verify all required attendance headers are present with exact matching
      const missingHeaders = EXPECTED_ATTENDANCE_HEADERS.filter(header => 
        !receivedHeaders.some(h => h.trim() === header.trim())
      );
      
      // Log attendance header validation
      await logOperation('Validating attendance headers', {
        receivedHeaders,
        expectedHeaders: EXPECTED_ATTENDANCE_HEADERS,
        missingHeaders
      });
      
      if (missingHeaders.length > 0) {
        if (fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
        throw new Error(
          `Missing required headers:\n` +
          `${missingHeaders.join(', ')}\n\n` +
          `Required headers are: ${EXPECTED_ATTENDANCE_HEADERS.join(', ')}\n` +
          `Found: ${receivedHeaders.join(', ')}\n\n` +
          `Note: Headers must match exactly (check for extra spaces)`
        );
      }
    }

    // Convert sheet to array of objects using the first row as headers
    let data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    // For student uploads, normalize the data to use English keys internally
    if (uploadType === 'students') {
      data = data.map(row => {
        const normalizedRow = {};
        for (const [englishKey, arabicKeys] of Object.entries(HEADER_MAPPINGS.students)) {
          // Try English key first, then Arabic alternatives
          normalizedRow[englishKey] = row[englishKey] || arabicKeys.reduce((val, arKey) => val || row[arKey], null) || '';
        }
        return normalizedRow;
      });
    }

    const results = [];
    const errors = [];
    let processed = 0;
    let created = 0;
    let updated = 0;
    let rowIndex = 0;

    for (const row of data) {
      rowIndex++;
      try {
        let result;
        console.log('Processing row with uploadType:', uploadType);
        switch (uploadType) {
          case 'students':
            result = await processStudentData(row, center);
            break;
          case 'attendance':
            result = await processAttendanceAndIssues(row, session, 'attendance', center);
            break;
          case 'issues':
            result = await processAttendanceAndIssues(row, session, 'issues', center);
            break;
          case 'grades':
            result = await processGrades(row, session, center);
            break;
          default:
            throw new Error('Invalid upload type');
        }

        if (result.error) {
          errors.push({ ...result, rowNumber: rowIndex });
        } else {
          processed++;
          if (result.action === 'created') created++;
          if (result.action === 'updated') updated++;
          results.push(result);
        }
      } catch (error) {
        await logOperation(`Error processing row ${rowIndex}`, { row, error: error.message });
        errors.push({ error: true, rowNumber: rowIndex, message: error.message, data: row });
      }
    }

    await logOperation('Initial processing complete', { totalRows: rowIndex, processed, created, updated, errors: errors.length });

    // Additional processing based on upload type
    if (uploadType === 'attendance') {
      if (!center) {
        throw new Error('Center is required for attendance processing');
      }
      await logOperation('Starting automatic absence marking', { center });
      await markRemainingStudentsAsAbsent(session, center);
    } else if (uploadType === 'grades') {
      await logOperation('Setting default grades for absentees');
      await setDefaultGradesForAbsentees(session);
    }

    // Clean up uploaded file
    if (fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (e) {
        await logOperation('Warning: Failed to clean up temporary file', { path: file.path, error: e.message });
      }
    }

    return { 
      status: 'success', 
      processed, 
      created, 
      updated, 
      errors: errors.length > 0 ? errors : null, 
      message: `Successfully processed ${processed} records (${created} created, ${updated} updated)` 
    }; 
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (e) {
        await logOperation('Warning: Failed to clean up temporary file after error', { path: file.path, error: e.message });
      }
    }
    
    await logOperation('Upload processing error', { error: error.message });
    throw error;
  }
};

module.exports = {
  handleCsvUpload
};
