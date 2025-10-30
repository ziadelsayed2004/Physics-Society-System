import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { staffAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await staffAPI.getSessions();
      setSessions(response.data.sessions.slice(0, 5));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCardClass = (index) => {
    const colors = [
      'dashboard-card-purple',
      'dashboard-card-blue',
      'dashboard-card-green',
      'dashboard-card-orange'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title">مرحباً بك، {user?.username}</h2>
        <p className="dashboard-subtitle">لوحة التحكم الرئيسية</p>
      </div>

      <div className="dashboard-stats">
        <div className={`stat-card ${getCardClass(0)}`}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>النظام</h3>
            <p>إدارة المراكز</p>
          </div>
        </div>

        <div className={`stat-card ${getCardClass(1)}`}>
          <div className="stat-icon">{sessions.length}</div>
          <div className="stat-content">
            <h3>{sessions.length}</h3>
            <p>الأسابيع الأخيرة</p>
          </div>
        </div>

        <div className={`stat-card ${getCardClass(2)}`}>
          <div className="stat-icon">{user?.role}</div>
          <div className="stat-content">
            <h3>{user?.role === 'Admin' ? 'مدير' : 'موظف'}</h3>
            <p>صلاحياتك</p>
          </div>
        </div>

        <div className={`stat-card ${getCardClass(3)}`}>
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h3>جاهز</h3>
            <p>النظام يعمل</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card">
          <div className="card-header">
            <h5>آخر الأسابيع</h5>
          </div>
          <div className="card-body">
            {loading ? (
              <p className="text-center text-muted">جاري التحميل...</p>
            ) : sessions.length > 0 ? (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>رقم الأسبوع</th>
                      <th>نوع الجلسة</th>
                      <th>تاريخ الإنشاء</th>
                      {isAdmin() && <th>الإجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id}>
                        <td>
                          <strong>الأسبوع {session.weekNumber}</strong>
                        </td>
                        <td>{session.sessionType}</td>
                        <td>{new Date(session.createdAt).toLocaleDateString('ar-EG')}</td>
                        {isAdmin() && (
                          <td>
                            <Link to="/sessions" className="btn btn-sm btn-outline-primary">
                              إدارة
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted">لا توجد جلسات حتى الآن</p>
            )}
          </div>
        </div>

        <div className="dashboard-quick-links">
          <h5>روابط سريعة</h5>
          <div className="quick-links-grid">
            <Link to="/search" className="quick-link">
              <span className="link-icon">🔍</span>
              <span className="link-text">بحث عن طالب</span>
            </Link>
            <Link to="/reports" className="quick-link">
              <span className="link-icon">📊</span>
              <span className="link-text">التقارير</span>
            </Link>
            {isAdmin() && (
              <>
                <Link to="/sessions" className="quick-link">
                  <span className="link-icon">🏫</span>
                  <span className="link-text">إدارة الحصص</span>
                </Link>
                <Link to="/upload" className="quick-link">
                  <span className="link-icon">⏫</span>
                  <span className="link-text">رفع البيانات</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
