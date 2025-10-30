import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen = false, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

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
        <button className="btn-credits" onClick={openWhatsApp}>
          <i className="icon">©</i>
          <span>ZIAD ELSAYED</span>
        </button>
        <button className="btn-logout" onClick={handleLogout}>
          <i className="icon">🚪</i>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
