import api from './api';

let showSessionExpiredModal = () => {};

export const setShowSessionExpiredModal = (fn) => {
  showSessionExpiredModal = fn;
};

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config.url !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showSessionExpiredModal();
    }
    return Promise.reject(error);
  }
);
