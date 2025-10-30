import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, staffAPI, centerAPI } from '../services/api';
import UserManagement from './UserManagement';
import CentersManagement from './CentersManagement';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('sessions');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [centers, setCenters] = useState([]);

  // Session creation form
  const [sessionForm, setSessionForm] = useState({
    weekNumber: '',
    sessionType: 'عادية'
  });

  // File upload states
  const [uploadStates, setUploadStates] = useState({
    students: { file: null, center: '', loading: false },
    attendance: { file: null, sessionId: '', center: '', loading: false },
    grades: { file: null, sessionId: '', loading: false },
    warnings: { file: null, sessionId: '', loading: false }
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

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminAPI.createSession(sessionForm);
      setMessage('Session created successfully');
      setSessionForm({ weekNumber: '', sessionType: 'عادية' });
      loadSessions();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
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
          if (!uploadState.center) throw new Error('Please select a center before uploading students');
          response = await adminAPI.uploadStudents(uploadState.file, uploadState.center);
          break;
        case 'attendance':
          if (!uploadState.sessionId || !uploadState.center) {
            throw new Error('Session ID and center are required');
          }
          response = await adminAPI.uploadAttendance(
            uploadState.file, 
            uploadState.sessionId, 
            uploadState.center
          );
          break;
        case 'grades':
          if (!uploadState.sessionId) {
            throw new Error('Session ID is required');
          }
          response = await adminAPI.uploadGrades(uploadState.file, uploadState.sessionId);
          break;
        case 'warnings':
          if (!uploadState.sessionId) {
            throw new Error('Session ID is required');
          }
          response = await adminAPI.uploadWarnings(uploadState.file, uploadState.sessionId);
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

  const renderFileUpload = (type, title, requiresSession = true, requiresCenter = false) => {
    const uploadState = uploadStates[type];
    
    return (
      <div className="card mb-3">
        <div className="card-body">
          <h6>{title}</h6>
          
          {requiresSession && (
            <div className="form-group mb-2">
              <label>Session</label>
              <select
                className="form-control"
                value={uploadState.sessionId}
                onChange={(e) => handleInputChange(type, 'sessionId', e.target.value)}
              >
                <option value="">Select a session</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    Week {session.weekNumber} - {session.sessionType}
                  </option>
                ))}
              </select>
            </div>
          )}

          {requiresCenter && (
            <div className="form-group mb-2">
              <label>Center</label>
              <select
                className="form-control"
                value={uploadState.center}
                onChange={(e) => handleInputChange(type, 'center', e.target.value)}
                required
              >
                <option value="">Select a center</option>
                {centers.map(center => (
                  <option key={center.id} value={center.name}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group mb-2">
            <input
              type="file"
              className="form-control"
              accept=".csv"
              onChange={(e) => handleFileChange(type, e.target.files[0])}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handleFileUpload(type)}
            disabled={uploadState.loading || !uploadState.file}
          >
            {uploadState.loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Admin Dashboard</h1>
        <div className="d-flex align-items-center gap-3">
          <span>Welcome, {user?.username}</span>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
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

      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                Sessions
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'uploads' ? 'active' : ''}`}
                onClick={() => setActiveTab('uploads')}
              >
                File Uploads
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                User Management
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'centers' ? 'active' : ''}`}
                onClick={() => setActiveTab('centers')}
              >
                Centers Management
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === 'sessions' && (
            <div>
              <h5>Create New Session</h5>
              <form onSubmit={handleSessionSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Week Number</label>
                      <input
                        type="number"
                        className="form-control"
                        value={sessionForm.weekNumber}
                        onChange={(e) => setSessionForm({
                          ...sessionForm,
                          weekNumber: e.target.value
                        })}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Session Type</label>
                      <select
                        className="form-control"
                        value={sessionForm.sessionType}
                        onChange={(e) => setSessionForm({
                          ...sessionForm,
                          sessionType: e.target.value
                        })}
                      >
                        <option value="عادية">عادية</option>
                        <option value="امتحان شامل">امتحان شامل</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
              </form>

              <hr />

              <h5>Recent Sessions</h5>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Type</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id}>
                        <td>{session.weekNumber}</td>
                        <td>{session.sessionType}</td>
                        <td>{new Date(session.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'uploads' && (
            <div>
              <h5>File Uploads</h5>
              
              {renderFileUpload('students', 'Upload Students Data', false, true)}
              {renderFileUpload('attendance', 'Upload Attendance Data', true, true)}
              {renderFileUpload('grades', 'Upload Grades Data', true)}
              {renderFileUpload('warnings', 'Upload Warnings Data', true)}

              <hr className="my-4" />
              
              <h5>Delete Weekly Data</h5>
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Session</label>
                        <select
                          className="form-control"
                          value={uploadStates.attendance.sessionId}
                          onChange={(e) => handleInputChange('attendance', 'sessionId', e.target.value)}
                        >
                          <option value="">Select a session</option>
                          {sessions.map(session => (
                            <option key={session.id} value={session.id}>
                              Week {session.weekNumber} - {session.sessionType}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Center (Optional)</label>
                        <select
                          className="form-control"
                          value={uploadStates.attendance.center}
                          onChange={(e) => handleInputChange('attendance', 'center', e.target.value)}
                        >
                          <option value="">All Centers</option>
                          {centers.map(center => (
                            <option key={center.id} value={center.name}>
                              {center.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>&nbsp;</label>
                        <button
                          className="btn btn-danger w-100"
                          onClick={handleDeleteWeeklyData}
                          disabled={loading || !uploadStates.attendance.sessionId}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Deleting...
                            </>
                          ) : (
                            'Delete Weekly Data'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'centers' && <CentersManagement />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
