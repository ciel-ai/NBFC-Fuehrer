// src/api/dashboard.api.ts
import { apiClient } from './client';

export const dashboardApi = {
  getKpis: async () => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },
};