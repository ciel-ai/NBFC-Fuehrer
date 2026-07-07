// src/modules/admin/admin.service.ts
import type { Request } from 'express';
import { adminRepository } from './admin.repository';
import { setAuditContext } from '@/middlewares';
import { AUDIT_ACTION } from '@/config/constants';
import { createModuleLogger } from '@/config/logger';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    DomainError,
} from '@/errors';
import type {
    AdminUser,
    AdminUserResponse,
    AdminDashboard,
    SystemAlert,
    CreateAdminUserInput,
    UpdateAdminUserInput,
    UpdateSystemConfigInput,
    ListAdminUsersInput,
    ConfigKey,
} from './admin.types';

const log = createModuleLogger('admin.service');

// ─── Response shaper ──────────────────────────────────────────────────────────

function toResponse(user: AdminUser): AdminUserResponse {
    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        department: user.department,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
    };
}

// ─── Alert generators ─────────────────────────────────────────────────────────

async function buildAlerts(): Promise<SystemAlert[]> {
    const { prisma } = await import('@/config/database');
    const alerts: SystemAlert[] = [];

<<<<<<< HEAD
    const staleKyc = await prisma.kyc_documents.count({
        where: {
            overall_status: 'IN_PROGRESS',
            updated_at: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
=======
    // Pending KYC over 48 hours
    const staleKyc = await prisma.kyc_documents.count({
        where: {
            overall_status: 'IN_PROGRESS',
            updated_at: {
                lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            },
>>>>>>> origin/main
        },
    });
    if (staleKyc > 0) {
        alerts.push({
            severity: 'WARN',
            category: 'KYC',
            message: `${staleKyc} KYC applications stalled for over 48 hours`,
            count: staleKyc,
            link: '/admin/kyc?status=IN_PROGRESS',
        });
    }

<<<<<<< HEAD
=======
    // Failed disbursements
>>>>>>> origin/main
    const failedDisbursements = await prisma.disbursements.count({
        where: { status: 'FAILED' },
    });
    if (failedDisbursements > 0) {
        alerts.push({
            severity: 'CRITICAL',
            category: 'DISBURSEMENT',
            message: `${failedDisbursements} disbursements failed and need attention`,
            count: failedDisbursements,
            link: '/admin/disbursements?status=FAILED',
        });
    }

<<<<<<< HEAD
=======
    // High NPA rate
>>>>>>> origin/main
    const portfolio = await adminRepository.getPlatformStats();
    if (portfolio.npaRate > 5) {
        alerts.push({
            severity: 'CRITICAL',
            category: 'NPA',
            message: `NPA rate ${portfolio.npaRate}% exceeds 5% threshold`,
            count: 1,
            link: '/admin/reports/portfolio',
        });
    } else if (portfolio.npaRate > 3) {
        alerts.push({
            severity: 'WARN',
            category: 'NPA',
            message: `NPA rate ${portfolio.npaRate}% approaching 5% threshold`,
            count: 1,
        });
    }

<<<<<<< HEAD
=======
    // Unassigned collection cases
>>>>>>> origin/main
    const unassignedCases = await prisma.collection_cases.count({
        where: { status: 'OPEN', assigned_to: null },
    });
    if (unassignedCases > 0) {
        alerts.push({
            severity: 'WARN',
            category: 'COLLECTIONS',
            message: `${unassignedCases} collection cases have no assigned agent`,
            count: unassignedCases,
            link: '/admin/collections?assignedTo=none',
        });
    }

<<<<<<< HEAD
    const stalePendingApprovals = await prisma.loan_applications.count({
        where: {
            status: 'PENDING_APPROVAL',
            updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
=======
    // Pending approvals over 24 hours
    const stalePendingApprovals = await prisma.loan_applications.count({
        where: {
            status: 'PENDING_APPROVAL',
            updated_at: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
>>>>>>> origin/main
        },
    });
    if (stalePendingApprovals > 0) {
        alerts.push({
            severity: stalePendingApprovals > 10 ? 'CRITICAL' : 'WARN',
            category: 'APPROVALS',
            message: `${stalePendingApprovals} loan applications pending approval for over 24 hours`,
            count: stalePendingApprovals,
            link: '/admin/loans?status=PENDING_APPROVAL',
        });
    }

    return alerts;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const adminService = {

<<<<<<< HEAD
=======
    // ── 1. Admin user management ───────────────────────────────────────────────

>>>>>>> origin/main
    async createAdminUser(
        input: CreateAdminUserInput,
        req: Request,
    ): Promise<AdminUserResponse> {
<<<<<<< HEAD
=======
        // Prevent duplicate email
>>>>>>> origin/main
        const existing = await adminRepository.findAdminUserByEmail(input.email);
        if (existing) {
            throw new ConflictError(
                `An admin user with email ${input.email} already exists`,
                { email: input.email },
            );
        }

<<<<<<< HEAD
        let passwordHash: string | undefined;
        if (input.password) {
            const bcrypt = await import('bcryptjs');
            passwordHash = await bcrypt.hash(input.password, 12);
        }

        const user = await adminRepository.createAdminUser({
            ...input,
            passwordHash,
            createdBy: (req as any).user?.id,
        });
=======
        const user = await adminRepository.createAdminUser(input);
>>>>>>> origin/main

        setAuditContext(req, {
            action: 'ADMIN_USER_CREATED',
            entityType: 'admin_users',
            entityId: user.id,
            after: { role: user.role, email: user.email },
        });

        log.info('Admin user created', {
            userId: user.id,
            role: user.role,
            email: user.email,
        });

        return toResponse(user);
    },

    async updateAdminUser(
        userId: string,
        input: UpdateAdminUserInput,
        requesterId: string,
        req: Request,
    ): Promise<AdminUserResponse> {
        const user = await adminRepository.findAdminUserByIdOrThrow(userId);

<<<<<<< HEAD
        if (user.role === 'SUPER_ADMIN' && input.status === 'SUSPENDED') {
=======
        // Super admins cannot suspend other super admins
        if (
            user.role === 'SUPER_ADMIN' &&
            input.status === 'SUSPENDED'
        ) {
>>>>>>> origin/main
            throw new ForbiddenError('Super Admin accounts cannot be suspended');
        }

        const updated = await adminRepository.updateAdminUser(userId, input);

        setAuditContext(req, {
            action: 'ADMIN_USER_UPDATED',
            entityType: 'admin_users',
            entityId: userId,
            before: { status: user.status, fullName: user.fullName },
            after: input,
            metadata: { updatedBy: requesterId },
        });

        return toResponse(updated);
    },

    async listAdminUsers(input: ListAdminUsersInput) {
        const result = await adminRepository.listAdminUsers(input);
        return {
            ...result,
            data: result.data.map(toResponse),
        };
    },

    async getAdminUser(userId: string): Promise<AdminUserResponse> {
        const user = await adminRepository.findAdminUserByIdOrThrow(userId);
        return toResponse(user);
    },

<<<<<<< HEAD
=======
    // ── 2. System configuration ────────────────────────────────────────────────

>>>>>>> origin/main
    async getAllConfigs() {
        return adminRepository.getAllConfigs();
    },

    async getConfig(key: ConfigKey) {
        const config = await adminRepository.getConfig(key);
        if (!config) throw new NotFoundError('System config', key);
        return config;
    },

<<<<<<< HEAD
    async updateConfig(input: UpdateSystemConfigInput, req: Request) {
=======
    async updateConfig(
        input: UpdateSystemConfigInput,
        req: Request,
    ) {
>>>>>>> origin/main
        const descriptions: Record<ConfigKey, string> = {
            MAX_LOAN_AMOUNT: 'Maximum loan amount in INR',
            MIN_LOAN_AMOUNT: 'Minimum loan amount in INR',
            MAX_TENURE_MONTHS: 'Maximum loan tenure in months',
            MIN_TENURE_MONTHS: 'Minimum loan tenure in months',
            MIN_CREDIT_SCORE: 'Minimum CIBIL score for loan approval',
            NPA_OVERDUE_DAYS: 'Days past due before marking loan as NPA',
            MAX_FOIR: 'Maximum Fixed Obligation to Income Ratio (0-1)',
            DEFAULT_INTEREST_RATE: 'Default annual interest rate percentage',
            PROCESSING_FEE_RATE: 'Processing fee as fraction of loan amount',
            AGENT_COMMISSION_RATE: 'Agent commission as fraction of disbursed amount',
            ENACH_RETRY_LIMIT: 'Maximum eNACH debit retry attempts per EMI',
            KYC_PROVIDER: 'Active KYC provider (signzy|stub)',
            SMS_PROVIDER: 'Active SMS provider (twilio|msg91|stub)',
            MAINTENANCE_MODE: 'Platform maintenance mode (true|false)',
            MAINTENANCE_MESSAGE: 'Message shown during maintenance',
        };

        const config = await adminRepository.upsertConfig(
            input.key,
            input.value,
            descriptions[input.key] ?? input.key,
            input.updatedBy,
        );

        setAuditContext(req, {
            action: AUDIT_ACTION.ADMIN_OVERRIDE,
            entityType: 'system_config',
            entityId: input.key,
            after: { key: input.key, value: input.value },
            metadata: { updatedBy: input.updatedBy },
        });

        await adminRepository.logOverride({
            targetType: 'system_config',
            targetId: input.key,
            action: 'CONFIG_UPDATE',
            reason: 'Configuration update via admin panel',
            performedBy: input.updatedBy,
            metadata: { key: input.key, newValue: input.value },
        });

        log.warn('System config updated', {
            key: input.key,
            value: input.value,
            updatedBy: input.updatedBy,
        });

        return config;
    },

<<<<<<< HEAD
=======
    // ── 3. Dashboard ───────────────────────────────────────────────────────────

>>>>>>> origin/main
    async getDashboard(): Promise<AdminDashboard> {
        const [platform, today, alerts] = await Promise.all([
            adminRepository.getPlatformStats(),
            adminRepository.getTodayStats(),
            buildAlerts(),
        ]);
<<<<<<< HEAD
        return { platform, today, alerts };
    },

=======

        return { platform, today, alerts };
    },

    // ── 4. Maintenance mode ────────────────────────────────────────────────────

>>>>>>> origin/main
    async setMaintenanceMode(
        enabled: boolean,
        message: string,
        setBy: string,
        req: Request,
    ): Promise<void> {
        await this.updateConfig(
<<<<<<< HEAD
            { key: 'MAINTENANCE_MODE', value: String(enabled), updatedBy: setBy },
=======
            {
                key: 'MAINTENANCE_MODE',
                value: String(enabled),
                updatedBy: setBy,
            },
>>>>>>> origin/main
            req,
        );

        if (message) {
            await this.updateConfig(
<<<<<<< HEAD
                { key: 'MAINTENANCE_MESSAGE', value: message, updatedBy: setBy },
=======
                {
                    key: 'MAINTENANCE_MESSAGE',
                    value: message,
                    updatedBy: setBy,
                },
>>>>>>> origin/main
                req,
            );
        }

        log.warn('Maintenance mode changed', { enabled, setBy });
    },

<<<<<<< HEAD
    async isMaintenanceMode(): Promise<{ active: boolean; message: string }> {
=======
    // ── 5. Check maintenance mode (used by middleware) ─────────────────────────

    async isMaintenanceMode(): Promise<{
        active: boolean;
        message: string;
    }> {
>>>>>>> origin/main
        const config = await adminRepository.getConfig('MAINTENANCE_MODE');
        if (!config || config.value !== 'true') {
            return { active: false, message: '' };
        }
<<<<<<< HEAD
=======

>>>>>>> origin/main
        const msgConfig = await adminRepository.getConfig('MAINTENANCE_MESSAGE');
        return {
            active: true,
            message: msgConfig?.value ?? 'Platform under maintenance',
        };
    },
<<<<<<< HEAD

    // ── Branch management ─────────────────────────────────────────────────────

    async listBranches() {
        const { prisma } = await import('@/config/database');
        const rows = await prisma.branches.findMany({ orderBy: { created_at: 'desc' } });
        return rows;
    },

    async createBranch(data: any, req: Request) {
        const { prisma } = await import('@/config/database');
        const branch = await prisma.branches.create({
            data: {
                name: data.name,
                address: data.address,
                city: data.city,
                state: data.state,
                pincode: data.pincode,
                phone: data.phone,
                updated_at: new Date(),
            },
        });
        return branch;
    },

    async updateBranch(branchId: string, data: any, req: Request) {
        const { prisma } = await import('@/config/database');
        const branch = await prisma.branches.update({
            where: { id: branchId },
            data: { ...data, updated_at: new Date() },
        });
        return branch;
    },

    // ── Loans management ──────────────────────────────────────────────────────

    async listAllLoans(filters: any) {
        const { prisma } = await import('@/config/database');
        const where: Record<string, unknown> = {};
        if (filters.productType) where.product_type = filters.productType;
        if (filters.status) where.status = filters.status;
        if (filters.search) {
            where.OR = [
                { user: { full_name: { contains: filters.search, mode: 'insensitive' } } },
                { user: { phone: { contains: filters.search } } },
            ];
        }
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const skip = (page - 1) * limit;

        const [rows, total] = await Promise.all([
            prisma.loan_applications.findMany({
                where,
                include: { user: { select: { full_name: true, phone: true, email: true } } },
                orderBy: { applied_at: 'desc' },
                skip,
                take: limit,
            }),
            prisma.loan_applications.count({ where }),
        ]);

        const { serializeMoney } = await import('@/utils/money');
const serialized = rows.map(row => ({
    ...row,
    amount_requested: serializeMoney(row.amount_requested),
    approved_amount: serializeMoney(row.approved_amount),
    monthly_emi: serializeMoney(row.monthly_emi),
    processing_fee: serializeMoney(row.processing_fee),
    processing_fee_gst: serializeMoney(row.processing_fee_gst),
}));

return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
};
    },

    async getLoanDetail(loanId: string) {
        const { prisma } = await import('@/config/database');
        const loan = await prisma.loan_applications.findUnique({
            where: { id: loanId },
            include: {
                user: true
            },
        });
        if (!loan) throw new NotFoundError('Loan', loanId);
        return loan;
    },
};
=======
};
>>>>>>> origin/main
