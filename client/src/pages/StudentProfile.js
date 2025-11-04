import React, { useState, useRef } from 'react';
import ReportTable from '../components/ReportTable';
import { adminAPI, centerAPI } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext';

const StudentProfile = ({ student, onBack, onStudentUpdate, onStudentDelete }) => {
  const { user, isAdmin } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: student.student.fullName,
    phoneNumber: student.student.phoneNumber,
    parentPhoneNumber: student.student.parentPhoneNumber || '',
    mainCenter: student.student.mainCenter,
    division: student.student.division,
    gender: student.student.gender,
  });
  const [centers, setCenters] = useState([]);
  const profileContentRef = useRef();
  const pdfContentRef = useRef();

  const handleExportPdf = () => {
    const input = pdfContentRef.current;
    
    html2canvas(input, { 
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / pdfWidth;
      let height = canvasHeight / ratio;
      let yPosition = 0;

      if (height > pdfHeight) {
        height = pdfHeight;
      }

      pdf.addImage(imgData, 'JPEG', 0, yPosition, pdfWidth, height);

      // Add more pages if needed
      let remainingHeight = canvasHeight / ratio - height;
      while (remainingHeight > 0) {
        pdf.addPage();
        yPosition = -pdfHeight + remainingHeight;
        const currentHeight = remainingHeight > pdfHeight ? pdfHeight : remainingHeight;
        pdf.addImage(imgData, 'JPEG', 0, yPosition, pdfWidth, currentHeight);
        remainingHeight -= pdfHeight;
      }

      pdf.save(`تقرير ${student.student.fullName}.pdf`);
    });
  };

  const getGradeBadge = (grade, fullMark) => {
    if (!grade || grade === '-') {
      return <span className="badge bg-secondary">لا توجد درجة</span>;
    }
    
    const numGrade = parseFloat(grade);
    const numFullMark = parseFloat(fullMark);

    if (isNaN(numGrade) || isNaN(numFullMark) || numFullMark === 0) {
      return <span className="badge bg-info">{grade}</span>;
    }
    
    const percentage = (numGrade / numFullMark) * 100;
    let badgeClass = 'bg-danger';
    if (percentage >= 90) badgeClass = 'bg-success';
    else if (percentage >= 80) badgeClass = 'bg-primary';
    else if (percentage >= 70) badgeClass = 'bg-warning';
    
    return <span className={`badge ${badgeClass}`}>{`${grade}/${fullMark}`}</span>;
  };

  const handleEdit = async () => {
    if (centers.length === 0) {
      try {
        const response = await centerAPI.getCenters();
        setCenters(response.data.centers);
      } catch (error) {
        setError('فشل في تحميل قائمة السناتر');
      }
    }
    setEditForm({
      fullName: student.student.fullName,
      phoneNumber: student.student.phoneNumber,
      parentPhoneNumber: student.student.parentPhoneNumber || '',
      mainCenter: student.student.mainCenter,
      division: student.student.division,
      gender: student.student.gender,
    });
    setShowEditModal(true);
    setError('');
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setError('');
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      await adminAPI.deleteStudent(student.student.id);
      setMessage('تم حذف الطالب بنجاح');
      setTimeout(() => {
        onStudentDelete && onStudentDelete();
        onBack();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'فشل حذف الطالب');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.updateStudent(student.student.id, editForm);
      setMessage('تم تحديث الطالب بنجاح');
      setShowEditModal(false);
      
      if (onStudentUpdate) {
        onStudentUpdate(response.data.student);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'فشل تحديث الطالب');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const attendanceRecords = student.records.filter(r => r.attendance === 'حضور' || r.attendance === 'تعويض حضور');
  const absenceRecords = student.records.filter(r => r.attendance === 'غياب');
  const issuesRecords = student.records.filter(r => r.issue);

  const attendanceColumns = [
    { key: 'weekNumber', header: 'الأسبوع' },
    { key: 'sessionType', header: 'نوع الحصة' },
    { key: 'grade', header: 'الدرجة', render: (record) => getGradeBadge(record.grade, record.fullMark) },
    { key: 'center', header: 'السنتر' },
  ];

  const absenceColumns = [
    { key: 'weekNumber', header: 'الأسبوع' },
    { key: 'sessionType', header: 'نوع الحصة' },
    { key: 'center', header: 'السنتر' },
  ];

  const issuesColumns = [
    { key: 'weekNumber', header: 'الأسبوع' },
    { key: 'center', header: 'السنتر' },
  ];

  const totalRecords = student.records.length;
  const attendanceStats = student.records.reduce((acc, record) => {
    acc[record.attendance] = (acc[record.attendance] || 0) + 1;
    return acc;
  }, {});

  const issueCount = student.records.filter(record => record.issue).length;
  const makeupCount = attendanceStats['تعويض حضور'] || 0;
  const grades = student.records
    .map(record => {
      const grade = parseFloat(record.grade);
      const fullMark = parseFloat(record.fullMark);
      if (!isNaN(grade) && !isNaN(fullMark) && fullMark > 0) {
        return (grade / fullMark) * 100;
      }
      return null;
    })
    .filter(grade => grade !== null);

  const gradesCount = grades.length;
  const averageGrade = gradesCount > 0 ? (grades.reduce((a, b) => a + b, 0) / gradesCount).toFixed(2) : 0;
  const attendanceRate = totalRecords > 0 ? Math.round(((attendanceStats['حضور'] || 0) + makeupCount) / totalRecords * 100) : 0;
  const absenceRate = totalRecords > 0 ? Math.round((attendanceStats['غياب'] || 0) / totalRecords * 100) : 0;


  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 action-buttons-group">
        <h5>ملف الطالب</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-info" onClick={handleExportPdf}>تحميل PDF</button>
          {isAdmin() && (
            <>
              <button className="btn btn-outline-primary" onClick={handleEdit}>
                تعديل الطالب
              </button>
              <button className="btn btn-outline-danger" onClick={handleDeleteClick} disabled={loading}>
                حذف الطالب
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={onBack}>
            العودة إلى البحث
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
          <button 
            type="button" 
            className="close" 
            onClick={() => setMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
          <button 
            type="button" 
            className="close" 
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Professional PDF Content - Hidden */}
      <div ref={pdfContentRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm', padding: '20px', backgroundColor: 'white', direction: 'rtl' }}>
        {/* PDF Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '3px solid #667eea' }}>
          <h1 style={{ color: '#667eea', margin: '0 0 10px 0', fontSize: '28px' }}>تقرير الطالب</h1>
          <p style={{ color: '#718096', margin: '0', fontSize: '14px' }}>نظام إدارة المراكز والمجموعات</p>
        </div>

        {/* Student Info Card - PDF Style */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', marginBottom: '25px', color: 'white' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '22px' }}>{student.student.fullName}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div><strong>كود الطالب:</strong> {student.student.studentId}</div>
            <div><strong>النوع:</strong> {student.student.gender}</div>
            <div><strong>الشعبة:</strong> {student.student.division}</div>
            <div><strong>السنتر:</strong> {student.student.mainCenter}</div>
            <div><strong>رقم الهاتف:</strong> {student.student.phoneNumber}</div>
            <div><strong>رقم ولي الأمر:</strong> {student.student.parentPhoneNumber || 'N/A'}</div>
          </div>
        </div>

        {/* Statistics Cards - PDF Style */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
          <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #3b82f6' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#1e40af' }}>{totalRecords}</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>إجمالي الحصص</p>
          </div>
          <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #22c55e' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#15803d' }}>{attendanceRate}%</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>نسبة الحضور</p>
          </div>
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#991b1b' }}>{absenceRate}%</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>نسبة الغياب</p>
          </div>
          <div style={{ background: '#fef9e7', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #f59e0b' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#92400e' }}>{makeupCount}</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>حصص التعويض</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
          <div style={{ background: '#fefce8', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #eab308' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#854d0e' }}>{averageGrade}%</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>متوسط الدرجات</p>
          </div>
          <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#991b1b' }}>{issueCount}</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#64748b' }}>المشاكل</p>
          </div>
        </div>

        {/* Attendance Table */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ background: '#667eea', color: 'white', padding: '12px', margin: '0 0 10px 0', borderRadius: '6px', fontSize: '18px' }}>سجلات الحضور</h3>
          {attendanceRecords.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>الأسبوع</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>نوع الحصة</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>الدرجة</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>السنتر</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.weekNumber}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.sessionType}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.grade}/{record.fullMark}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.center}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا توجد سجلات حضور</p>
          )}
        </div>

        {/* Absence Table */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ background: '#ef4444', color: 'white', padding: '12px', margin: '0 0 10px 0', borderRadius: '6px', fontSize: '18px' }}>سجلات الغياب</h3>
          {absenceRecords.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>الأسبوع</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>نوع الحصة</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>السنتر</th>
                </tr>
              </thead>
              <tbody>
                {absenceRecords.map((record, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.weekNumber}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.sessionType}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.center}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا توجد سجلات غياب</p>
          )}
        </div>

        {/* Issues Table */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ background: '#f59e0b', color: 'white', padding: '12px', margin: '0 0 10px 0', borderRadius: '6px', fontSize: '18px' }}>سجلات المشاكل</h3>
          {issuesRecords.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>الأسبوع</th>
                  <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'right' }}>السنتر</th>
                </tr>
              </thead>
              <tbody>
                {issuesRecords.map((record, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.weekNumber}</td>
                    <td style={{ border: '1px solid #dee2e6', padding: '10px' }}>{record.center}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>لا توجد سجلات مشاكل</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
          <p>تم إنشاء هذا التقرير في {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* Visible Content for Website */}
      <div ref={profileContentRef}>
        {/* Student Information */}
        <div className="card mb-4">
          <div className="card-body">
            <h6>معلومات الطالب</h6>
            <div className="row">
              <div className="col-md-6">
                <p><strong>كود الطالب:</strong> {student.student.studentId}</p>
                <p><strong>الاسم بالكامل:</strong> {student.student.fullName}</p>
                <p><strong>النوع:</strong> {student.student.gender}</p>
                <p><strong>الشعبة:</strong> {student.student.division}</p>
              </div>
              <div className="col-md-6">
                <p><strong>رقم الهاتف:</strong> {student.student.phoneNumber}</p>
                <p><strong>رقم ولي الأمر:</strong> {student.student.parentPhoneNumber}</p>
                <p><strong>السنتر / المجموعة الأساسية:</strong> {student.student.mainCenter}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title">{totalRecords}</h5>
                <p className="card-text">إجمالي الحصص</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title text-success">{attendanceRate}%</h5>
                <p className="card-text">نسبة الحضور</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title text-danger">{absenceRate}%</h5>
                <p className="card-text">نسبة الغياب</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title text-warning">{makeupCount}</h5>
                <p className="card-text">حصص التعويض</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title">{averageGrade}%</h5>
                <p className="card-text">متوسط الدرجات</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="card-title text-danger">{issueCount}</h5>
                <p className="card-text">المشاكل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Records Tables */}
        <div className="row">
          <div className="col-12">
            <ReportTable
              title="سجلات الحضور"
              data={attendanceRecords}
              columns={attendanceColumns}
              emptyMessage="لا توجد سجلات حضور"
            />
          </div>
          <div className="col-12 mt-4">
            <ReportTable
              title="سجلات الغياب"
              data={absenceRecords}
              columns={absenceColumns}
              emptyMessage="لا توجد سجلات غياب"
            />
          </div>
          <div className="col-12 mt-4">
            <ReportTable
              title="سجلات المشاكل"
              data={issuesRecords}
              columns={issuesColumns}
              emptyMessage="لا توجد سجلات مشاكل"
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', borderRadius: '8px 8px 0 0' }}>
              <h5 className="modal-title" style={{ color: 'white', margin: 0 }}>⚠️ تأكيد الحذف</h5>
              <button 
                type="button" 
                className="close" 
                onClick={() => setShowDeleteModal(false)}
                style={{ color: 'white', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗑️</div>
                <h4 style={{ color: '#1f2937', marginBottom: '1rem' }}>هل أنت متأكد من الحذف؟</h4>
                <p style={{ color: '#6b7280', fontSize: '1.1rem', lineHeight: '1.6' }}>
                  أنت على وشك حذف الطالب <strong style={{ color: '#ef4444' }}>{student.student.fullName}</strong>
                </p>
                <p style={{ color: '#ef4444', fontWeight: '600', marginTop: '1rem' }}>
                  ⚠️ سيتم حذف جميع سجلات الطالب ولا يمكن التراجع عن هذا الإجراء!
                </p>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                style={{ minWidth: '100px' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={loading}
                style={{ minWidth: '100px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none' }}
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">تعديل الطالب</h5>
              <button 
                type="button" 
                className="close" 
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>الاسم بالكامل</label>
                  <input
                    type="text"
                    className="form-control"
                    name="fullName"
                    value={editForm.fullName}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phoneNumber"
                    value={editForm.phoneNumber}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>رقم ولي الأمر</label>
                  <input
                    type="text"
                    className="form-control"
                    name="parentPhoneNumber"
                    value={editForm.parentPhoneNumber}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group">
                  <label>السنتر / المجموعة الأساسية</label>
                  <select
                    className="form-control"
                    name="mainCenter"
                    value={editForm.mainCenter}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">اختر سنتر</option>
                    {centers.map(center => (
                      <option key={center.id} value={center.name}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
                 <div className="form-group">
                  <label>الشعبة</label>
                  <select
                    className="form-control"
                    name="division"
                    value={editForm.division}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="علمي علوم">علمي علوم</option>
                    <option value="علمي رياضة">علمي رياضة</option>
                    <option value="أزهر">أزهر</option>
                  </select>
                </div>
                 <div className="form-group">
                  <label>النوع</label>
                  <select
                    className="form-control"
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="انثى">انثى</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'جاري التحديث...' : 'تحديث الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
