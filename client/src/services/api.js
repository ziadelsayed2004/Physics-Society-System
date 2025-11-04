import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);



// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// Admin API
export const adminAPI = {
  uploadStudents: (file, center) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'students');
    if (center) formData.append('center', center);
  return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  createSession: (sessionData) => api.post('/sessions', sessionData),
  deleteSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
  
  uploadAttendance: (file, sessionId, center) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'attendance');
    formData.append('sessionId', sessionId);
    formData.append('center', center);
  return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadAbsence: (file, sessionId, center) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'absence');
    formData.append('sessionId', sessionId);
    formData.append('center', center);
  return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadGrades: (file, sessionId, center) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'grades');
    formData.append('sessionId', sessionId);
    formData.append('center', center);
  return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadIssues: (file, sessionId, center) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'issues');
    formData.append('sessionId', sessionId);
    formData.append('center', center);
  return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateStudent: (studentId, studentData) => api.put(`/students/${studentId}`, studentData),
  
  deleteStudent: (studentId) => api.delete(`/students/${studentId}`),
  
  deleteWeeklyRecords: (sessionId, center) => {
    const params = new URLSearchParams();
    params.append('session', sessionId);
    if (center) params.append('center', center);
    return api.delete(`/records?${params}`);
  },

  pasteData: (data) => api.post('/records/paste', data),
};

// Staff API
export const staffAPI = {
  searchStudents: (query) => api.get(`/students/search?q=${encodeURIComponent(query)}`),
  
  getStudentProfile: (studentId) => api.get(`/students/${studentId}`),
  
  getAttendanceReport: (filters) => {
    const params = new URLSearchParams();
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.center) params.append('center', filters.center);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    return api.get(`/reports/attendance?${params}`);
  },
  
  getAbsenceReport: (filters) => {
    const params = new URLSearchParams();
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.center) params.append('center', filters.center);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    return api.get(`/reports/absence?${params}`);
  },
  
  getGradesReport: (filters) => {
    const params = new URLSearchParams();
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.center) params.append('center', filters.center);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    return api.get(`/reports/grades?${params}`);
  },
  
  getIssuesReport: (filters) => {
    const params = new URLSearchParams();
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.center) params.append('center', filters.center);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    return api.get(`/reports/issues?${params}`);
  },
  
  getSessions: () => api.get('/sessions'),
  
  getCenters: () => api.get('/centers'),
  
  exportReport: (filters) => {
    const params = new URLSearchParams();
    if (filters.sessionId) params.append('sessionId', filters.sessionId);
    if (filters.center) params.append('center', filters.center);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.reportType) params.append('type', filters.reportType);
    return api.get(`/reports/export?${params}`, { responseType: 'blob' });
  },
};

// User Management API
export const userAPI = {
  getUsers: () => api.get('/users'),
  
  createUser: (userData) => api.post('/users', userData),
  
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

// Center Management API
export const centerAPI = {
  getCenters: () => api.get('/centers'),
  createCenter: (centerData) => api.post('/centers', centerData),
  updateCenter: (centerId, centerData) => api.put(`/centers/${centerId}`, centerData),
  deleteCenter: (centerId) => api.delete(`/centers/${centerId}`),
  exportCenterData: (centerName) => {
    return api.get(`/reports/center/${encodeURIComponent(centerName)}/export`, { responseType: 'blob' });
  },
};

export default api;