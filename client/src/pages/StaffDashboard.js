import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { staffAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import ReportTable from '../components/ReportTable';
import StudentProfile from './StudentProfile';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Reports state
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('attendance');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await staffAPI.getSessions();
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleSearch = async (query) => {
    setLoading(true);
    setError('');

    try {
      const response = await staffAPI.searchStudents(query);
      setSearchResults(response.data.students);
      setMessage(`Found ${response.data.students.length} students`);
    } catch (error) {
      setError(error.response?.data?.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (student) => {
    setLoading(true);
    setError('');

    try {
      const response = await staffAPI.getStudentProfile(student.id);
      setSelectedStudent(response.data);
      setActiveTab('profile');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load student profile');
    } finally {
      setLoading(false);
    }
  };

  const handleReportGenerate = async () => {
    if (!selectedSession) {
      setError('Please select a session');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      switch (reportType) {
        case 'attendance':
          response = await staffAPI.getAttendanceReport(selectedSession, selectedCenter);
          break;
        case 'absence':
          response = await staffAPI.getAbsenceReport(selectedSession, selectedCenter);
          break;
        case 'grades':
          response = await staffAPI.getGradesReport(selectedSession);
          break;
        case 'warnings':
          response = await staffAPI.getWarningsReport(selectedSession);
          break;
        default:
          throw new Error('Invalid report type');
      }

      setReportData(response.data);
      setMessage(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getReportColumns = () => {
    switch (reportType) {
      case 'attendance':
        return [
          { key: 'studentId', header: 'Student ID' },
          { key: 'fullName', header: 'Full Name' },
          { key: 'phoneNumber', header: 'Phone' },
          { key: 'mainCenter', header: 'Main Center' },
          { key: 'attendance', header: 'Attendance' },
          { key: 'center', header: 'Center' }
        ];
      case 'absence':
        return [
          { key: 'studentId', header: 'Student ID' },
          { key: 'fullName', header: 'Full Name' },
          { key: 'phoneNumber', header: 'Phone' },
          { key: 'mainCenter', header: 'Main Center' },
          { key: 'center', header: 'Center' }
        ];
      case 'grades':
        return [
          { key: 'studentId', header: 'Student ID' },
          { key: 'fullName', header: 'Full Name' },
          { key: 'mainCenter', header: 'Main Center' },
          { key: 'grade', header: 'Grade' },
          { key: 'attendance', header: 'Attendance' }
        ];
      case 'warnings':
        return [
          { key: 'studentId', header: 'Student ID' },
          { key: 'fullName', header: 'Full Name' },
          { key: 'phoneNumber', header: 'Phone' },
          { key: 'mainCenter', header: 'Main Center' },
          { key: 'attendance', header: 'Attendance' },
          { key: 'grade', header: 'Grade' }
        ];
      default:
        return [];
    }
  };

  const renderSearchTab = () => (
    <div>
      <h5>Search Students</h5>
      <SearchBar onSearch={handleSearch} />
      
      {loading && <div className="text-center">Searching...</div>}
      
      {searchResults.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Phone</th>
                <th>Main Center</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map(student => (
                <tr key={student.id}>
                  <td>{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.phoneNumber}</td>
                  <td>{student.mainCenter}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleStudentSelect(student)}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div>
      <h5>Generate Reports</h5>
      
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="form-group">
            <label>Report Type</label>
            <select
              className="form-control"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="attendance">Attendance Report</option>
              <option value="absence">Absence Report</option>
              <option value="grades">Grades Report</option>
              <option value="warnings">Warnings Report</option>
            </select>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="form-group">
            <label>Session</label>
            <select
              className="form-control"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
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
        
        {(reportType === 'attendance' || reportType === 'absence') && (
          <div className="col-md-4">
            <div className="form-group">
              <label>Center (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Leave empty for all centers"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleReportGenerate}
        disabled={loading || !selectedSession}
      >
        {loading ? 'Generating...' : 'Generate Report'}
      </button>

      {reportData && (
        <div className="mt-4">
          <ReportTable
            title={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
            data={reportData.students}
            columns={getReportColumns()}
            emptyMessage={`No ${reportType} data found for this session`}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Staff Dashboard</h1>
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
                className={`nav-link ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                Search Students
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                Reports
              </button>
            </li>
            {selectedStudent && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Student Profile
                </button>
              </li>
            )}
          </ul>
        </div>
        <div className="card-body">
          {activeTab === 'search' && renderSearchTab()}
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'profile' && selectedStudent && (
            <StudentProfile 
              student={selectedStudent} 
              onBack={() => setActiveTab('search')}
              onStudentUpdate={(updatedStudent) => {
                setSelectedStudent(prev => ({
                  ...prev,
                  student: updatedStudent
                }));
              }}
              onStudentDelete={() => {
                setSelectedStudent(null);
                setActiveTab('search');
                setSearchResults([]);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
