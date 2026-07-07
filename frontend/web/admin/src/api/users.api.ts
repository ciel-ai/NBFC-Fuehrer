// src/api/users.api.ts
//
// Staff user management — GET/POST/PATCH /users + activate/deactivate,
// matching the backend web BFF (modules/web/users). List rows are mapped
// onto the frontend PortalUser shape.

import { apiClient } from './client';
import type { PortalUser, Role } from '../types';

interface BackendUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

function mapUser(row: BackendUserRow): PortalUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as Role,
    status: (row.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
    branch: row.branchId ?? '—', // branch names resolve via /staff/branches — next pass
    lastLoginAt: row.lastLoginAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export interface CreateUserPayload {
  name: string;
  phone: string;
  email: string;
  role: string;
  branchId?: string;
}

export const usersApi = {
  list: async (params: { role?: string; status?: string; search?: string; page?: number; limit?: number } = {}): Promise<PortalUser[]> => {
    const res = await apiClient.get('/users', { params: { limit: 100, ...params } });
    return (res.data.data as BackendUserRow[]).map(mapUser);
  },

  create: async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    return res.data;
  },

  update: async (id: string, patch: Record<string, unknown>) => {
    const res = await apiClient.patch(`/users/${id}`, patch);
    return res.data;
  },

  activate: async (id: string) => {
    const res = await apiClient.post(`/users/${id}/activate`);
    return res.data;
  },

  deactivate: async (id: string) => {
    const res = await apiClient.post(`/users/${id}/deactivate`);
    return res.data;
  },
};
