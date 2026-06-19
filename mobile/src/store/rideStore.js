import { create } from 'zustand';
import api from '../services/api';

export const useRideStore = create((set, get) => ({
  activeRide: null,
  rideHistory: [],
  nearbyDrivers: [],
  isLoading: false,

  requestRide: async (rideData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/rides/request', rideData);
      set({ activeRide: data, isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  refreshRide: async (rideId) => {
    const { data } = await api.get(`/rides/${rideId}`);
    set({ activeRide: data });
    return data;
  },

  cancelRide: async (rideId, reason) => {
    await api.post(`/rides/${rideId}/cancel`, { reason });
    set({ activeRide: null });
  },

  rateRide: async (rideId, rating, comment) => {
    await api.post(`/rides/${rideId}/rate`, { rating, comment });
  },

  fetchNearbyDrivers: async (lat, lng) => {
    const { data } = await api.get('/drivers/nearby', { params: { lat, lng } });
    set({ nearbyDrivers: data });
    return data;
  },

  fetchHistory: async () => {
    const { data } = await api.get('/riders/rides');
    set({ rideHistory: data.rides });
    return data;
  },

  triggerSOS: async (rideId) => {
    await api.post(`/rides/${rideId}/sos`);
  },

  clearActiveRide: () => set({ activeRide: null })
}));
