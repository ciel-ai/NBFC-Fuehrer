// src/api/dashboard.api.ts
import { apiClient } from './client';

export const dashboardApi = {
  getKpis: async () => {
    const res = await apiClient.get('/dashboard/kpis');
    return res.data.data;
  },

  getTrends: async () => {
    const res = await apiClient.get('/dashboard/trends');
    return res.data.data;
  },

  getPendingActions: async () => {
    const res = await apiClient.get('/dashboard/pending-actions');
    return res.data.data;
  },

  getRecentApplications: async () => {
    const res = await apiClient.get('/dashboard/recent-applications');
    return res.data.data;
  },
};