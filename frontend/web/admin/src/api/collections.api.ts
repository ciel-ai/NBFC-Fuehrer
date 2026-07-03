// src/api/collections.api.ts
import { apiClient } from './client';

export const collectionsApi = {
  listCases: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/collections/cases', { params });
    return res.data;
  },

  getCase: async (id: string) => {
    const res = await apiClient.get(`/collections/cases/${id}`);
    return res.data;
  },

  logContact: async (id: string, payload: {
    channel: string;
    outcome: string;
    notes: string;
    ptpDate?: string;
  }) => {
    const res = await apiClient.post(`/collections/cases/${id}/contact-log`, payload);
    return res.data;
  },

  assignCase: async (id: string, payload: { agentId: string }) => {
    const res = await apiClient.patch(`/collections/cases/${id}/assign`, payload);
    return res.data;
  },

  getSummary: async () => {
    const res = await apiClient.get('/collections/summary');
    return res.data;
  },
};