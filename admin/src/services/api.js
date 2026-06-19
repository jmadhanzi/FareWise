import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = (() => { try { return JSON.parse(localStorage.getItem('fw_admin_token')); } catch { return null; } })();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fw_admin_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
