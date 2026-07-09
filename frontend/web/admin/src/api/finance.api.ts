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

  // Backend: POST /finance/disburse/:id { beneficiaryName, accountNumber, ifsc, mode }
  disburse: async (
    id: string,
    payload: { mode: string; beneficiaryName?: string; accountNumber?: string; ifsc?: string },
  ) => {
    const res = await apiClient.post(`/finance/disburse/${id}`, payload);
    return res.data;
  },
};