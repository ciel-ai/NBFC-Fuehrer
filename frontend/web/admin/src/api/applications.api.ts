// src/api/applications.api.ts
import { apiClient } from './client';

export interface ListApplicationsParams {
  status?: string;
  productType?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const applicationsApi = {
  list: async (params: ListApplicationsParams = {}) => {
    const res = await apiClient.get('/applications', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get(`/applications/${id}`);
    // The web BFF detail route responds unwrapped (no {success,data} envelope)
    return res.data.data ?? res.data;
  },
};