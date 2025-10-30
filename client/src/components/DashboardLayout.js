import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useMobileMenu } from '../hooks/useMobileMenu';
import './DashboardLayout.css';
import '../responsive.css';

const DashboardLayout = () => {
  const { isOpen, toggle, close } = useMobileMenu();

  return (
    <div className="dashboard-layout">
      {/* Mobile Menu Toggle Button */}
      <button 
        className={`mobile-menu-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggle}
        aria-label="Toggle menu"
      >
        <span />
      </button>

      {/* Backdrop */}
      <div 
        className={`sidebar-backdrop ${isOpen ? 'show' : ''}`}
        onClick={close}
      />

      {/* Sidebar */}
      <Sidebar isOpen={isOpen} onNavigate={close} />

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
