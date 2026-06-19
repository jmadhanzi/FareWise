import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.API_BASE_URL || 'https://api.farewise.co.zw/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const oldToken = await SecureStore.getItemAsync('farewise_auth_token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: oldToken });
        await SecureStore.setItemAsync('farewise_auth_token', data.token);
        originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('farewise_auth_token');
        await SecureStore.deleteItemAsync('farewise_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
