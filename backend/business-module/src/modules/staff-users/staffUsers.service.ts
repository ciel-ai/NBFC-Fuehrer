// src/modules/staff-users/staffUsers.service.ts
//
// Admin-only management of staff (admin_users) — list, create, update,
// activate/deactivate, reset password — plus a read-only branches list for
// form dropdowns. Mirrors handover §5.2.
//
//   • ADMIN accounts get a generated temp password (returned once) + username.
//   • CREDIT_* / FINANCE_* / SALES_* sign in with OTP — no password.
// Every mutation writes an audit_logs row (RBI immutability requirement).

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError } from '@/errors';
import { STAFF_ROLE, type StaffRole } from '@/constants/staffRoles.constants';
import { buildPaginationMeta, type PaginatedResult } from '@/types/common.types';

export interface Actor {
    id: string;
    role: string;
    requestId: string;
}

interface PresentedStaffUser {
    id: string;
    name: string;
    phone: string;
    email: string;
    branch: string | null;
    branchId: string | null;
    role: StaffRole;
    status: string;
    username: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
}

type AdminUserWithBranch = Prisma.admin_usersGetPayload<{ include: { branch: true } }>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const notFound = () =>
    new AppError({ statusCode: 404, errorCode: 'STAFF_USER_NOT_FOUND', message: 'Staff user not found' });

const duplicate = (field: string) =>
    new AppError({ statusCode: 409, errorCode: 'DUPLICATE_USER', message: `A user with this ${field} already exists.` });

function present(u: AdminUserWithBranch): PresentedStaffUser {
    return {
        id: u.id,
        name: u.full_name,
        phone: u.phone,
        email: u.email,
        branch: u.branch?.name ?? null,
        branchId: u.branch_id,
        role: u.role as StaffRole,
        status: u.status,
        username: u.username,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
    };
}

function genTempPassword(): string {
    // 12-char URL-safe-ish temporary password
    return crypto.randomBytes(9).toString('base64');
}

async function writeAudit(
    actor: Actor,
    action: string,
    entityId: string,
    after?: unknown,
    before?: unknown,
): Promise<void> {
    await prisma.audit_logs.create({
        data: {
            action,
            entity_type: 'admin_user',
            entity_id: entityId,
            user_id: actor.id,
            role: actor.role,
            request_id: actor.requestId,
            after_state: after ? JSON.stringify(after) : null,
            before_state: before ? JSON.stringify(before) : null,
        },
    });
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function listUsers(query: {
    role?: StaffRole;
    status?: string;
    search?: string;
    page: number;
    limit: number;
}): Promise<PaginatedResult<PresentedStaffUser>> {
    const where: Prisma.admin_usersWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
        where.OR = [
            { full_name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
        ];
    }

    const [rows, total] = await prisma.$transaction([
        prisma.admin_users.findMany({
            where,
            include: { branch: true },
            orderBy: { created_at: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
        prisma.admin_users.count({ where }),
    ]);

    return {
        data: rows.map(present),
        pagination: buildPaginationMeta(query.page, query.limit, total),
    };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createUser(
    input: { name: string; phone: string; email: string; role: StaffRole; branchId?: string; status?: string },
    actor: Actor,
): Promise<{ user: PresentedStaffUser; tempPassword?: string }> {
    const dup = await prisma.admin_users.findFirst({
        where: { OR: [{ email: input.email }, { phone: input.phone }] },
    });
    if (dup) throw duplicate(dup.email === input.email ? 'email' : 'phone');

    let tempPassword: string | undefined;
    let passwordHash: string | null = null;
    let username: string | null = null;
    let mustReset = false;

    // Only ADMIN signs in with a password; others are OTP-only.
    if (input.role === STAFF_ROLE.ADMIN) {
        tempPassword = genTempPassword();
        passwordHash = await bcrypt.hash(tempPassword, 10);
        username = input.email; // admins may sign in by username or email
        mustReset = true;
    }

    const created = await prisma.admin_users.create({
        data: {
            full_name: input.name,
            phone: input.phone,
            email: input.email,
            role: input.role,
            status: input.status ?? 'ACTIVE',
            branch_id: input.branchId ?? null,
            username,
            password_hash: passwordHash,
            must_change_password: mustReset,
            created_by: actor.id,
        } as Prisma.admin_usersUncheckedCreateInput,
        include: { branch: true },
    });

    await writeAudit(actor, 'STAFF_USER_CREATED', created.id, { role: input.role, email: input.email });
    logger.info({ message: 'Staff user created', actorId: actor.id, newUserId: created.id, role: input.role });

    return { user: present(created), ...(tempPassword ? { tempPassword } : {}) };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateUser(
    id: string,
    patch: { name?: string; phone?: string; email?: string; role?: StaffRole; branchId?: string | null; status?: string },
    actor: Actor,
): Promise<PresentedStaffUser> {
    const before = await prisma.admin_users.findUnique({ where: { id } });
    if (!before) throw notFound();

    if (patch.email || patch.phone) {
        const conflicts: Prisma.admin_usersWhereInput[] = [];
        if (patch.email) conflicts.push({ email: patch.email });
        if (patch.phone) conflicts.push({ phone: patch.phone });
        const dup = await prisma.admin_users.findFirst({ where: { id: { not: id }, OR: conflicts } });
        if (dup) throw duplicate(dup.email === patch.email ? 'email' : 'phone');
    }

    const data: Prisma.admin_usersUncheckedUpdateInput = {};
    if (patch.name !== undefined) data.full_name = patch.name;
    if (patch.phone !== undefined) data.phone = patch.phone;
    if (patch.email !== undefined) {
        data.email = patch.email;
        if (before.role === STAFF_ROLE.ADMIN) data.username = patch.email;
    }
    if (patch.role !== undefined) data.role = patch.role;
    if (patch.branchId !== undefined) data.branch_id = patch.branchId;
    if (patch.status !== undefined) data.status = patch.status;

    const updated = await prisma.admin_users.update({
        where: { id },
        data,
        include: { branch: true },
    });

    await writeAudit(actor, 'STAFF_USER_UPDATED', id, data, { role: before.role, status: before.status });
    return present(updated);
}

// ─── Activate / Deactivate ──────────────────────────────────────────────────────

export async function setStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actor: Actor): Promise<PresentedStaffUser> {
    const before = await prisma.admin_users.findUnique({ where: { id } });
    if (!before) throw notFound();

    const updated = await prisma.admin_users.update({
        where: { id },
        data: { status },
        include: { branch: true },
    });

    await writeAudit(
        actor,
        status === 'ACTIVE' ? 'STAFF_USER_ACTIVATED' : 'STAFF_USER_DEACTIVATED',
        id,
        { status },
        { status: before.status },
    );
    return present(updated);
}

// ─── Reset password ──────────────────────────────────────────────────────────────

export async function resetPassword(
    id: string,
    actor: Actor,
): Promise<{ tempPassword?: string; message?: string }> {
    const u = await prisma.admin_users.findUnique({ where: { id } });
    if (!u) throw notFound();

    if (u.role !== STAFF_ROLE.ADMIN) {
        return { message: 'This role signs in with a one-time password (OTP) — there is no password to reset.' };
    }

    const tempPassword = genTempPassword();
    await prisma.admin_users.update({
        where: { id },
        data: {
            password_hash: await bcrypt.hash(tempPassword, 10),
            must_change_password: true,
            username: u.username ?? u.email,
        },
    });

    await writeAudit(actor, 'STAFF_USER_PASSWORD_RESET', id);
    return { tempPassword };
}

// ─── Branches (read-only list for form dropdowns) ─────────────────────────────────

export async function listBranches(): Promise<
    { id: string; name: string; city: string; state: string; isActive: boolean }[]
> {
    const branches = await prisma.branches.findMany({ orderBy: { name: 'asc' } });
    return branches.map((b) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        state: b.state,
        isActive: b.is_active ?? true,
    }));
}
