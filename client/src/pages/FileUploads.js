import React, { useState, useEffect } from 'react';
import { adminAPI, staffAPI, centerAPI } from '../services/api';

const FileUploads = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [centers, setCenters] = useState([]);

  // File upload states
  const [uploadStates, setUploadStates] = useState({
    students: { file: null, center: '', loading: false },
    attendance: { file: null, sessionId: '', center: '', loading: false },
    grades: { file: null, sessionId: '', center: '', loading: false },
    issues: { file: null, sessionId: '', center: '', loading: false },
  });

  useEffect(() => {
    loadSessions();
    loadCenters();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await staffAPI.getSessions();
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadCenters = async () => {
    try {
      const response = await centerAPI.getCenters();
      setCenters(response.data.centers);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const handleFileUpload = async (type) => {
    const uploadState = uploadStates[type];
    if (!uploadState.file) {
      setError('Please select a file');
      return;
    }

    setUploadStates(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true }
    }));
    setError('');

    try {
      let response;
      switch (type) {
        case 'students':
          if (!uploadState.center) throw new Error('يجب اختيار السنتر / المجموعة قبل رفع بيانات الطلاب');
          response = await adminAPI.uploadStudents(uploadState.file, uploadState.center);
          break;
        case 'attendance':
          if (!uploadState.sessionId || !uploadState.center) {
            throw new Error('يجب اختيار الأسبوع والسنتر / المجموعة');
          }
          response = await adminAPI.uploadAttendance(
            uploadState.file, 
            uploadState.sessionId, 
            uploadState.center
          );
          break;

        case 'grades':
          if (!uploadState.sessionId || !uploadState.center) {
            throw new Error('يجب اختيار الأسبوع والسنتر / المجموعة');
          }
          response = await adminAPI.uploadGrades(
            uploadState.file, 
            uploadState.sessionId,
            uploadState.center
          );
          break;
        case 'issues':
          if (!uploadState.sessionId || !uploadState.center) {
            throw new Error('يجب اختيار الأسبوع والسنتر / المجموعة');
          }
          response = await adminAPI.uploadIssues(
            uploadState.file, 
            uploadState.sessionId,
            uploadState.center
          );
          break;
        default:
          throw new Error('Invalid upload type');
      }

      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      
      // Reset file input
      setUploadStates(prev => ({
        ...prev,
        [type]: { ...prev[type], file: null, loading: false }
      }));
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Upload failed');
    } finally {
      setUploadStates(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false }
      }));
    }
  };

  const handleFileChange = (type, file) => {
    setUploadStates(prev => ({
      ...prev,
      [type]: { ...prev[type], file }
    }));
  };

  const handleInputChange = (type, field, value) => {
    setUploadStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleDeleteWeeklyData = async () => {
    if (!window.confirm('Are you sure you want to delete all weekly data for the selected session and center? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.deleteWeeklyRecords(
        uploadStates.attendance.sessionId,
        uploadStates.attendance.center || null
      );
      
      setMessage(`Successfully deleted ${response.data.deletedCount} records`);
      
      // Reset form
      setUploadStates(prev => ({
        ...prev,
        attendance: { ...prev.attendance, sessionId: '', center: '' }
      }));
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete weekly data');
    } finally {
      setLoading(false);
    }
  };

  const renderFileUpload = (type, title, requiresSession = true, requiresCenter = false, infoText = null) => {
    const uploadState = uploadStates[type];
    
    return (
      <div className="upload-section p-3 border rounded bg-light">
        <h6 className="text-primary mb-3">{title}</h6>
        {infoText && <p className="small text-muted">{infoText}</p>}
        
        <div className="row g-3">
          {requiresSession && (
            <div className="col-12">
              <div className="form-group">
                <label className="small mb-1">الأسبوع</label>
                <select
                  className="form-select"
                  value={uploadState.sessionId}
                  onChange={(e) => handleInputChange(type, 'sessionId', e.target.value)}
                >
                  <option value="">اختر الأسبوع</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      أسبوع {session.weekNumber} - {session.sessionType}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {requiresCenter && (
            <div className="col-12">
              <div className="form-group">
                <label className="small mb-1">السنتر / المجموعة</label>
                <select
                  className="form-select"
                  value={uploadState.center}
                  onChange={(e) => handleInputChange(type, 'center', e.target.value)}
                  required
                >
                  <option value="">اختر السنتر / المجموعة</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.name}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="col-12">
            <div className="form-group">
              <label className="small mb-1">الملف</label>
              <input
                type="file"
                className="form-control"
                accept=".xlsx,.csv"
                onChange={(e) => handleFileChange(type, e.target.files[0])}
              />
            </div>
          </div>

          <div className="col-12">
            <button
              className="btn btn-primary w-100"
              onClick={() => handleFileUpload(type)}
              disabled={uploadState.loading || !uploadState.file}
            >
              {uploadState.loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  جاري الرفع...
                </>
              ) : (
                'رفع الملف'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="content-page">
      {message && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                بيانات الطلاب
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                الحضور والدرجات
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'management' ? 'active' : ''}`}
                onClick={() => setActiveTab('management')}
              >
                إدارة البيانات
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body">
          {activeTab === 'students' && (
            <div className="row g-3">
              <div className="col-12">
                {renderFileUpload('students', 'رفع بيانات الطلاب', false, true)}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="row g-3">
              <div className="col-md-4">
                {renderFileUpload('attendance', 'رفع بيانات الحضور', true, true)}
              </div>
              <div className="col-md-4">
                {renderFileUpload('grades', 'رفع بيانات الدرجات', true, true)}
              </div>
              <div className="col-md-4">
                {renderFileUpload('issues', 'رفع شيت الإنذارات', true, true)}
              </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="card border-danger">
              <div className="card-body">
                <h6 className="card-subtitle mb-3 text-danger">⚠️ حذف بيانات الأسبوع</h6>
                <div className="row g-3">
                  <div className="col-md-5">
                    <div className="form-group">
                      <label className="form-label">الأسبوع</label>
                      <select
                        className="form-control"
                        value={uploadStates.attendance.sessionId}
                        onChange={(e) => handleInputChange('attendance', 'sessionId', e.target.value)}
                      >
                        <option value="">اختر الأسبوع</option>
                        {sessions.map(session => (
                          <option key={session.id} value={session.id}>
                            أسبوع {session.weekNumber} - {session.sessionType}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label className="form-label">السنتر / المجموعة (اختياري)</label>
                      <select
                        className="form-control"
                        value={uploadStates.attendance.center}
                        onChange={(e) => handleInputChange('attendance', 'center', e.target.value)}
                      >
                        <option value="">جميع السناتر / المجموعات</option>
                        {centers.map(center => (
                          <option key={center.id} value={center.name}>
                            {center.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label className="form-label">&nbsp;</label>
                      <button
                        className="btn btn-danger w-100"
                        onClick={handleDeleteWeeklyData}
                        disabled={loading || !uploadStates.attendance.sessionId}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            جاري الحذف...
                          </>
                        ) : (
                          'حذف البيانات'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploads;