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

/** The caller's own effective grants: { [module]: ['READ','WRITE'] }. */
export interface MyPermissions {
  role: string;
  permissions: Record<string, string[]>;
}

export const permissionsApi = {
  /**
   * The signed-in user's OWN effective permissions.
   *
   * Unlike every other route here this is not admin-gated — it is the endpoint
   * that lets the portal build navigation and route guards from the real RBAC
   * model instead of a hardcoded table. Admins are served the full module list
   * directly (the API bypasses the DB for them), so this can never disagree with
   * what the server will actually authorise.
   */
  me: async (): Promise<MyPermissions> => {
    const res = await apiClient.get('/permissions/me');
    return res.data.data;
  },

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
