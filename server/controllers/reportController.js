const Record = require('../models/Record');
const Session = require('../models/Session');
const Student = require('../models/Student');
const excel = require('exceljs');

// Helper function to apply styling to a worksheet
const applyStyling = (worksheet) => {
  // Apply border and alignment to all cells
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
    });
  });

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    bold: true,
    size: 14,
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 60; // Set header row height to 60
};

// Utility function for filtering records
const buildFilterQuery = (reqQuery) => {
  const query = {};
  
  const sessionId = reqQuery.sessionId || reqQuery.session;
  const center = reqQuery.center;
  
  if (sessionId) {
    query.session = sessionId;
  }
  
  if (center) {
    query.center = center;
  }

  return query;
};

// Get attendance report
const getAttendanceReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    filter.attendance = { $in: ['حضور', 'تعويض حضور'] };
    
    const records = await Record.find(filter)
      .populate('student', 'studentId fullName phoneNumber parentPhoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get absence report
const getAbsenceReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    filter.attendance = 'غياب';
    
    const records = await Record.find(filter)
      .populate('student', 'studentId fullName phoneNumber parentPhoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get grades report
const getGradesReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    filter.grade = { $ne: '-' };
    
    const records = await Record.find(filter)
      .populate('student', 'studentId fullName phoneNumber parentPhoneNumber')
      .sort({ 'session.weekNumber': -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get issues report
const getIssuesReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    filter.issue = true;
    
    const records = await Record.find(filter)
      .populate('student', 'studentId fullName phoneNumber parentPhoneNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export report data
const exportReport = async (req, res) => {
  const { type } = req.query;
  const filter = buildFilterQuery(req.query);
  let records;
  
  switch (type) {
    case 'attendance':
      filter.attendance = { $in: ['حضور', 'تعويض حضور'] };
      records = await Record.find(filter)
        .populate('student', 'studentId fullName phoneNumber parentPhoneNumber mainCenter')
        .populate('session', 'weekNumber sessionType')
        .lean();
      break;
    
    case 'absence':
      filter.attendance = 'غياب';
      records = await Record.find(filter)
        .populate('student', 'studentId fullName phoneNumber parentPhoneNumber mainCenter')
        .populate('session', 'weekNumber sessionType')
        .lean();
      break;

    case 'grades':
      filter.grade = { $ne: '-' };
      records = await Record.find(filter)
        .populate('student', 'studentId fullName phoneNumber parentPhoneNumber mainCenter')
        .populate('session', 'weekNumber sessionType')
        .lean();
      break;

    case 'issues':
      filter.issue = true;
      records = await Record.find(filter)
        .populate('student', 'studentId fullName phoneNumber parentPhoneNumber mainCenter')
        .populate('session', 'weekNumber sessionType')
        .lean();
      break;

    default:
      throw new Error('نوع التقرير غير صحيح');
  }

  if (records.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'لا توجد بيانات للتصدير',
    });
  }

  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  const columns = [
    { header: 'كود الطالب', key: 'studentId', width: 15 },
    { header: 'الاسم الكامل', key: 'fullName', width: 30 },
    { header: 'رقم الهاتف', key: 'phoneNumber', width: 15 },
    { header: 'رقم ولي الأمر', key: 'parentPhoneNumber', width: 15 },
    { header: 'السنتر / المجموعة', key: 'mainCenter', width: 20 },
  ];

  if (type === 'grades') {
    columns.push({ header: 'الدرجة', key: 'grade', width: 10 });
  }

  worksheet.columns = columns;

  records.forEach(record => {
    if (record.student) {
      const row = {
        studentId: record.student.studentId || '-',
        fullName: record.student.fullName || 'N/A',
        phoneNumber: record.student.phoneNumber || '-',
        parentPhoneNumber: record.student.parentPhoneNumber || '-',
        mainCenter: record.student.mainCenter || '-',
      };

      if (type === 'grades') {
        row.grade = record.grade;
      }

      worksheet.addRow(row);
    }
  });

    applyStyling(worksheet);

    const session = filter.session ? await Session.findById(filter.session).lean() : null;
    
    let sessionName = 'الكل';
    if (session) {
        sessionName = `${session.sessionType} ${session.weekNumber}`;
    }

    const centerName = filter.center || 'الكل';

    const reportTypeArabic = {
      attendance: 'حضور',
      absence: 'غياب',
      grades: 'درجات',
      issues: 'مشاكل',
    };
    const reportTypeName = reportTypeArabic[type] || type;

    const fileName = `${centerName} ${sessionName} ${reportTypeName}.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*="UTF-8''${encodedFileName}"`
    );

    await workbook.xlsx.write(res);
};

const exportCenterData = async (req, res) => {
  try {
    const { centerName } = req.params;

    const students = await Student.find({ mainCenter: centerName }).lean();

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No students found for center: ${centerName}`,
      });
    }

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet(`بيانات سنتر ${centerName}`);

    worksheet.columns = [
      { header: 'كود الطالب', key: 'studentId', width: 15 },
      { header: 'اسم الطالب', key: 'fullName', width: 30 },
      { header: 'رقم الطالب', key: 'phoneNumber', width: 15 },
      { header: 'رقم ولي الامر', key: 'parentPhoneNumber', width: 15 },
      { header: 'الشعبة', key: 'division', width: 15 },
      { header: 'النوع', key: 'gender', width: 10 },
    ];

    students.forEach(student => {
      worksheet.addRow({
        studentId: student.studentId,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        parentPhoneNumber: student.parentPhoneNumber,
        division: student.division,
        gender: student.gender,
      });
    });

    applyStyling(worksheet);

    const fileName = `بيانات سنتر ${centerName}.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*="UTF-8''${encodedFileName}"`
    );

    await workbook.xlsx.write(res);

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export center data', error: error.message });
  }
};

module.exports = {
  getAttendanceReport,
  getAbsenceReport,
  getGradesReport,
  getIssuesReport,
  exportReport,
  exportCenterData
};