// src/api/credit.api.ts
import { apiClient } from './client';

export interface ApproveLoanPayload {
  approvedAmount: number;
  interestRate: number;
  processingFee: number;
}

export interface RejectLoanPayload {
  reason: string;
}

export const creditApi = {
  getQueue: async (params: { page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/credit/queue', { params });
    return res.data;
  },

  getSummary: async () => {
    const res = await apiClient.get('/credit/summary');
    return res.data.data;
  },

  approve: async (id: string, payload: ApproveLoanPayload) => {
    const res = await apiClient.post(`/credit/${id}/approve`, payload);
    return res.data.data;
  },

  reject: async (id: string, payload: RejectLoanPayload) => {
    const res = await apiClient.post(`/credit/${id}/reject`, payload);
    return res.data.data;
  },
};