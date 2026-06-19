import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const TOKEN_KEY = 'farewise_auth_token';
const USER_KEY = 'farewise_user';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token, user, isAuthenticated: true });
  },

  updateUser: async (updates) => {
    const user = { ...get().user, ...updates };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    set({ token: null, user: null, isAuthenticated: false });
  }
}));
