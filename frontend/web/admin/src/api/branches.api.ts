// src/api/branches.api.ts
import { apiClient } from './client';

export const branchesApi = {
  list: async (params: { city?: string; isActive?: boolean; page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/branches', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get(`/branches/${id}`);
    return res.data;
  },

  create: async (payload: Record<string, unknown>) => {
    const res = await apiClient.post('/branches', payload);
    return res.data;
  },

  update: async (id: string, payload: Record<string, unknown>) => {
    const res = await apiClient.patch(`/branches/${id}`, payload);
    return res.data;
  },

  activate: async (id: string) => {
    const res = await apiClient.post(`/branches/${id}/activate`);
    return res.data;
  },

  deactivate: async (id: string) => {
    const res = await apiClient.post(`/branches/${id}/deactivate`);
    return res.data;
  },
};