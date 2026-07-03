// src/api/settings.api.ts
import { apiClient } from './client';

export const settingsApi = {
  getAll: async () => {
    const res = await apiClient.get('/settings');
    return res.data.data;
  },

  update: async (key: string, value: string) => {
    const res = await apiClient.patch(`/settings/${key}`, { value });
    return res.data;
  },

  getAuditLogs: async (params: {
    module?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const res = await apiClient.get('/audit-logs', { params });
    return res.data;
  },
};