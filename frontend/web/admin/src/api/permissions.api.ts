// src/api/permissions.api.ts
//
// RBAC permission model — roles × module permissions (web BFF /permissions,
// backed by the roles/role_permissions tables). Admin-only endpoints.

import { apiClient } from './client';

export interface RolePermission {
  module: string;
  action: string; // READ | WRITE
}

export interface RoleRow {
  name: string;
  label: string;
  description: string | null;
  is_active: boolean;
  permissions: RolePermission[];
}

export const permissionsApi = {
  /** All roles with their active permission grants. */
  listRoles: async (): Promise<RoleRow[]> => {
    const res = await apiClient.get('/permissions/roles');
    return res.data.data;
  },

  grant: async (roleName: string, module: string, action: string) => {
    const res = await apiClient.post(`/permissions/roles/${roleName}/grant`, { module, action });
    return res.data.data;
  },

  revoke: async (roleName: string, module: string, action: string) => {
    const res = await apiClient.post(`/permissions/roles/${roleName}/revoke`, { module, action });
    return res.data.data;
  },
};
