import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen = false, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [showCredits, setShowCredits] = useState(false);

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleLogout = () => {
    logout();
    if (onNavigate) {
      onNavigate();
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/201020572730', '_blank');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h4>نظام إدارة السناتر</h4>
        <p className="user-info">{user?.username}</p>
        <span className={`user-badge ${user?.role === 'Admin' ? 'badge-admin' : 'badge-staff'}`}>
          {user?.role}
        </span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="nav-item" onClick={handleNavClick}>
          <i className="icon">📊</i>
          <span>لوحة التحكم</span>
        </NavLink>

        <div className="nav-divider">الطلاب والتقارير</div>
        
        <NavLink to="/search" className="nav-item" onClick={handleNavClick}>
          <i className="icon">🔍</i>
          <span>بحث عن طالب</span>
        </NavLink>

        <NavLink to="/reports" className="nav-item" onClick={handleNavClick}>
          <i className="icon">📊</i>
          <span>تقارير الحصص</span>
        </NavLink>

        {isAdmin() && (
          <>
            <div className="nav-divider">إدارة الحصص والبيانات</div>
            
            <NavLink to="/sessions" className="nav-item" onClick={handleNavClick}>
              <i className="icon">🏫</i>
              <span>إدارة الحصص</span>
            </NavLink>
            
            <NavLink to="/upload" className="nav-item" onClick={handleNavClick}>
              <i className="icon">⏫</i>
              <span>رفع البيانات الأسبوعية</span>
            </NavLink>

            <div className="nav-divider">الإدارة</div>

            <NavLink to="/users" className="nav-item" onClick={handleNavClick}>
              <i className="icon">👤</i>
              <span>إدارة المستخدمين</span>
            </NavLink>

            <NavLink to="/centers" className="nav-item" onClick={handleNavClick}>
              <i className="icon">⚙️</i>
              <span>إدارة السناتر / المجموعات</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-credits" onClick={() => setShowCredits(true)}>
          <i className="icon">©</i>
          <span>المطور</span>
        </button>
        <button className="btn-logout" onClick={handleLogout}>
          <i className="icon">🚪</i>
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {/* Credits Modal */}
      {showCredits && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ width: '50%', margin: '0 auto', transform: 'translateX(20%)', top: '10%' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '8px 8px 0 0' }}>
              <h5 className="modal-title" style={{ color: 'white', margin: 0 }}>© Credits</h5>
              <button 
                type="button" 
                className="close" 
                onClick={() => setShowCredits(false)}
                style={{ color: 'white', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👨‍💻</div>
              <h4 style={{ color: '#1f2937', marginBottom: '0.5rem' }}>Ziad Elsayed</h4>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                This System is developed by Ziad Elsayed
              </p>
              
              <button
                type="button"
                className="btn btn-success"
                onClick={openWhatsApp}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'linear-gradient(135deg, #25D366 0%, #1cb554 100%)',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}
              >
                💬 التواصل عبر واتساب
              </button>
            </div>
            <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              <p style={{textAlign: 'center', width: '100%', margin: '0 auto' }}>© 2025 جميع الحقوق محفوظة</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
