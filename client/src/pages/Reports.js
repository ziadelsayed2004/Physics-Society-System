import React, { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../services/api';
import ReportTable from '../components/ReportTable';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [centers, setCenters] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    sessionId: '',
    center: '',
    reportType: 'attendance' // attendance, grades, issues
  });

  useEffect(() => {
    loadSessions();
    loadCenters();
  }, []);

  useEffect(() => {
    setReportData([]);
    setIsReportGenerated(false);
  }, [activeTab]);

  const handleGenerateReport = useCallback(async () => {
    setIsReportGenerated(true);
    setLoading(true);
    setError('');
    
    try {
      let response;
      switch (activeTab) {
        case 'attendance':
          response = await staffAPI.getAttendanceReport(filters);
          break;
        case 'absence':
          response = await staffAPI.getAbsenceReport(filters);
          break;
        case 'grades':
          response = await staffAPI.getGradesReport(filters);
          break;
        case 'issues':
          response = await staffAPI.getIssuesReport(filters);
          break;
        default:
          throw new Error('نوع تقرير غير صحيح');
      }
      
      setReportData(response.data.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء توليد التقرير');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  const loadSessions = async () => {
    try {
      const response = await staffAPI.getSessions();
      console.log('Sessions response:', response.data);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('خطأ في تحميل الحصص: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadCenters = async () => {
    try {
      const response = await staffAPI.getCenters();
      console.log('Centers response:', response.data);
      setCenters(response.data.centers || []);
    } catch (error) {
      console.error('Error loading centers:', error);
      setError('خطأ في تحميل السناتر/المجموعات: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportExcel = async () => {
    try {
      // Find the selected session object to get its details
      const selectedSession = sessions.find(s => s.id === filters.sessionId);
      const sessionName = selectedSession ? `الأسبوع ${selectedSession.weekNumber} - ${selectedSession.sessionType}` : 'الكل';

      // Get the center name from filters
      const centerName = filters.center || 'الكل';

      // Map activeTab to the desired Arabic report type name
      const reportTypeMap = {
        attendance: 'حضور',
        absence: 'غياب',
        grades: 'درجات',
        issues: 'مشاكل',
      };
      const reportTypeName = reportTypeMap[activeTab] || activeTab;

      // Get the current date in YYYY-MM-DD format
      const reportDate = new Date().toISOString().split('T')[0];

      // Construct the final filename
      const fileName = `${centerName} ${sessionName} ${reportTypeName} ${reportDate}.xlsx`;

      const response = await staffAPI.exportReport({
        ...filters,
        reportType: activeTab,
      });
      
      // Create a blob and download xlsx file
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // Use the new client-side generated name
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('خطأ في تصدير التقرير');
    }
  };

  const getReportColumns = () => {
    const baseColumns = [
      { header: 'كود الطالب', render: (row) => row.student?.studentId },
      { header: 'الاسم', render: (row) => row.student?.fullName },
      { header: 'رقم الهاتف', render: (row) => row.student?.phoneNumber },
      { header: 'رقم ولي الأمر', render: (row) => row.student?.parentPhoneNumber },
    ];

    switch (activeTab) {
      case 'grades':
        return [
          ...baseColumns,
          { key: 'grade', header: 'الدرجة' },
        ];
      default:
        return baseColumns;
    }
  };

  const getReportTitle = () => {
    switch (activeTab) {
      case 'attendance':
        return 'تقرير الحضور';
      case 'absence':
        return 'تقرير الغياب';
      case 'grades':
        return 'تقرير الدرجات';
      case 'issues':
        return 'تقرير المشاكل';
      default:
        return 'تقرير';
    }
  };

  return (
    <div className="content-page">
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                تقرير الحضور
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'absence' ? 'active' : ''}`}
                onClick={() => setActiveTab('absence')}
              >
                تقرير الغياب
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'grades' ? 'active' : ''}`}
                onClick={() => setActiveTab('grades')}
              >
                تقرير الدرجات
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'issues' ? 'active' : ''}`}
                onClick={() => setActiveTab('issues')}
              >
                تقرير المشاكل
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body">
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">الحصة</label>
                <select
                  className="form-control"
                  value={filters.sessionId}
                  onChange={(e) => handleFilterChange('sessionId', e.target.value)}
                >
                  <option value="">كل الحصص</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      الأسبوع {session.weekNumber} - {session.sessionType}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="form-group">
                <label className="form-label">السنتر / المجموعة</label>
                <select
                  className="form-control"
                  value={filters.center}
                  onChange={(e) => handleFilterChange('center', e.target.value)}
                >
                  <option value="">كل السناتر/المجموعات</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.name}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mb-4">
            <button
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? 'جاري التحميل...' : 'عرض التقرير'}
            </button>
            
            <button
              className="btn btn-success"
              onClick={handleExportExcel}
              disabled={loading || reportData.length === 0}
            >
              تصدير XLSX
            </button>
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {reportData.length > 0 ? (
            <ReportTable
              title={getReportTitle()}
              data={reportData}
              columns={getReportColumns()}
              emptyMessage="لا توجد بيانات لهذا التقرير"
            />
          ) : isReportGenerated && !loading ? (
            <p>لا توجد بيانات لعرضها.</p>
          ) : !loading && (
            <p>حدد سنتر وحصة لعرض التقرير</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
