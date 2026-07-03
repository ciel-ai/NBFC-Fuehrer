// src/api/reports.api.ts
import { apiClient } from './client';

export interface ReportParams {
  from?: string;
  to?: string;
  format?: 'json' | 'csv';
}

export const reportsApi = {
  getPortfolio: async (params: ReportParams = {}) => {
    const res = await apiClient.get('/reports/portfolio', { params });
    return res.data;
  },

  getCollection: async (params: ReportParams = {}) => {
    const res = await apiClient.get('/reports/collection', { params });
    return res.data;
  },

  getRbi: async (params: ReportParams = {}) => {
    const res = await apiClient.get('/reports/rbi', { params });
    return res.data;
  },
};