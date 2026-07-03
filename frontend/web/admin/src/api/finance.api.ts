// src/api/finance.api.ts
import { apiClient } from './client';

export const financeApi = {
  getQueue: async (params: { page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/finance/queue', { params });
    return res.data;
  },

  getSummary: async () => {
    const res = await apiClient.get('/finance/summary');
    return res.data.data;
  },

  disburse: async (id: string, payload: { mode: string }) => {
    const res = await apiClient.post(`/finance/${id}/disburse`, payload);
    return res.data.data;
  },
};