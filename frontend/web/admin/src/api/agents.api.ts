// src/api/agents.api.ts
import { apiClient } from './client';

export const agentsApi = {
  list: async (params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/agents', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get(`/agents/${id}`);
    return res.data;
  },

  create: async (payload: Record<string, unknown>) => {
    const res = await apiClient.post('/agents', payload);
    return res.data;
  },

  update: async (id: string, payload: Record<string, unknown>) => {
    const res = await apiClient.patch(`/agents/${id}`, payload);
    return res.data;
  },

  activate: async (id: string) => {
    const res = await apiClient.post(`/agents/${id}/activate`);
    return res.data;
  },

  deactivate: async (id: string) => {
    const res = await apiClient.post(`/agents/${id}/deactivate`);
    return res.data;
  },

  getCommissions: async (id: string, params: { page?: number; limit?: number } = {}) => {
    const res = await apiClient.get(`/agents/${id}/commissions`, { params });
    return res.data;
  },
};