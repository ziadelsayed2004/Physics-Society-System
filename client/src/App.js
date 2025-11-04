import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import CentersManagement from './pages/CentersManagement';
import FileUploads from './pages/FileUploads';
import SessionManagement from './pages/SessionManagement';
import StudentSearch from './pages/StudentSearch';
import StudentProfilePage from './pages/StudentProfilePage';
import Reports from './pages/Reports';
import SessionExpiredModal from './components/SessionExpiredModal';
import { setShowSessionExpiredModal } from './services/api-interceptor';

const AppRoutes = () => {
  // useAuth hook is available through ProtectedRoute; no need to destructure here

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected Routes with Dashboard Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Default dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Common routes for all authenticated users */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="search" element={<StudentSearch />} />
        <Route path="student/:id" element={<StudentProfilePage />} />
        <Route path="reports" element={<Reports />} />
        
        {/* Admin-only routes */}
        <Route
          path="sessions"
          element={
            <ProtectedRoute requireAdmin={true}>
              <SessionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="upload"
          element={
            <ProtectedRoute requireAdmin={true}>
              <FileUploads />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute requireAdmin={true}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="centers"
          element={
            <ProtectedRoute requireAdmin={true}>
              <CentersManagement />
            </ProtectedRoute>
          }
        />
      </Route>
      
      {/* Legacy routes for backward compatibility */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/staff" element={<Navigate to="/dashboard" replace />} />
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setShowSessionExpiredModal(() => {
      setSessionExpired(true);
    });
  }, []);

  const handleCloseModal = () => {
    setSessionExpired(false);
    window.location.href = '/login';
  };

  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <AppRoutes />
          <SessionExpiredModal show={sessionExpired} onClose={handleCloseModal} />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;