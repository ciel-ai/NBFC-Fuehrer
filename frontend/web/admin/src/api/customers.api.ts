// src/api/customers.api.ts
import { apiClient } from './client';

export const customersApi = {
  list: async (params: { search?: string; page?: number; limit?: number } = {}) => {
    const res = await apiClient.get('/customers', { params });
    return res.data;
  },

  get: async (id: string) => {
    const res = await apiClient.get(`/customers/${id}`);
    return res.data;
  },

  getLoans: async (id: string, params: { page?: number; limit?: number } = {}) => {
    const res = await apiClient.get(`/customers/${id}/loans`, { params });
    return res.data;
  },
};