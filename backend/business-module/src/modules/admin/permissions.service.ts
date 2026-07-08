// src/modules/admin/permissions.service.ts
//
// DB-backed permission checks with in-memory cache.
// Cache is refreshed every 5 minutes — permission changes take effect
// within 5 minutes without requiring a server restart.

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import type { Role } from '@/config/constants';
import { ROLE } from '@/config/constants';

const log = createModuleLogger('permissions.service');

// ─── Cache ────────────────────────────────────────────────────────────────────

interface PermissionCache {
    data: Map<string, Set<string>>; // key: `${role}:${module}`, value: Set of actions
    loadedAt: number;
}

let cache: PermissionCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(roleName: string, module: string): string {
    return `${roleName}:${module}`;
}

async function loadCache(): Promise<PermissionCache> {
    const rows = await prisma.role_permissions.findMany({
        where: { is_active: true },
        select: { role_name: true, module: true, action: true },
    });

    const data = new Map<string, Set<string>>();
    for (const row of rows) {
        const key = cacheKey(row.role_name, row.module);
        if (!data.has(key)) data.set(key, new Set());
        data.get(key)!.add(row.action);
    }

    log.info('Permission cache loaded', { entries: rows.length });
    return { data, loadedAt: Date.now() };
}

async function getCache(): Promise<PermissionCache> {
    if (!cache || Date.now() - cache.loadedAt > CACHE_TTL_MS) {
        cache = await loadCache();
    }
    return cache;
}

export function invalidateCache(): void {
    cache = null;
    log.info('Permission cache invalidated');
}

// ─── Permission checks ────────────────────────────────────────────────────────

/**
 * Check if a role has a specific action on a module.
 * Falls back to allowing SUPER_ADMIN and ADMIN always.
 */
export async function hasPermission(
    role: Role,
    module: string,
    action: string = 'READ',
): Promise<boolean> {
    // Super admin and Admin bypass all checks
    if (role === ROLE.SUPER_ADMIN || role === ROLE.ADMIN) return true;

    try {
        const c = await getCache();
        const key = cacheKey(role, module);
        const actions = c.data.get(key);
        return actions?.has(action) ?? false;
    } catch (err) {
        // If DB is unavailable fall back to deny
        log.error('Permission cache error — denying access', { error: err });
        return false;
    }
}

/**
 * Get all modules a role can access with their permitted actions.
 */
export async function getRolePermissions(
    role: Role,
): Promise<Record<string, string[]>> {
    try {
        const c = await getCache();
        const result: Record<string, string[]> = {};

        for (const [key, actions] of c.data.entries()) {
            const [roleName, module] = key.split(':');
            if (roleName === role) {
                result[module!] = Array.from(actions);
            }
        }

        return result;
    } catch {
        return {};
    }
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export const permissionsService = {

    async listRoles() {
        return prisma.roles.findMany({
            orderBy: { name: 'asc' },
            include: {
                permissions: {
                    where: { is_active: true },
                    select: { module: true, action: true },
                },
            },
        });
    },

    async getRolePermissions(roleName: string) {
        return prisma.role_permissions.findMany({
            where: { role_name: roleName, is_active: true },
            orderBy: [{ module: 'asc' }, { action: 'asc' }],
        });
    },

    async grantPermission(roleName: string, module: string, action: string, grantedBy: string) {
        const result = await prisma.role_permissions.upsert({
            where: { role_name_module_action: { role_name: roleName, module, action } },
            update: { is_active: true },
            create: { role_name: roleName, module, action, is_active: true },
        });
        invalidateCache();
        log.info('Permission granted', { roleName, module, action, grantedBy });
        return result;
    },

    async revokePermission(roleName: string, module: string, action: string, revokedBy: string) {
        const result = await prisma.role_permissions.updateMany({
            where: { role_name: roleName, module, action },
            data: { is_active: false },
        });
        invalidateCache();
        log.info('Permission revoked', { roleName, module, action, revokedBy });
        return result;
    },

    async updateRole(roleName: string, data: { label?: string; description?: string; is_active?: boolean }) {
        const result = await prisma.roles.update({
            where: { name: roleName },
            data: { ...data, updated_at: new Date() },
        });
        invalidateCache();
        return result;
    },
};