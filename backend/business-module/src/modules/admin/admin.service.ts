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

    const staleKyc = await prisma.kyc_documents.count({
        where: {
            overall_status: 'IN_PROGRESS',
            updated_at: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
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

    const stalePendingApprovals = await prisma.loan_applications.count({
        where: {
            status: 'PENDING_APPROVAL',
            updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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

    async createAdminUser(
        input: CreateAdminUserInput,
        req: Request,
    ): Promise<AdminUserResponse> {
        const existing = await adminRepository.findAdminUserByEmail(input.email);
        if (existing) {
            throw new ConflictError(
                `An admin user with email ${input.email} already exists`,
                { email: input.email },
            );
        }

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

        if (user.role === 'SUPER_ADMIN' && input.status === 'SUSPENDED') {
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

    async getAllConfigs() {
        return adminRepository.getAllConfigs();
    },

    async getConfig(key: ConfigKey) {
        const config = await adminRepository.getConfig(key);
        if (!config) throw new NotFoundError('System config', key);
        return config;
    },

    async updateConfig(input: UpdateSystemConfigInput, req: Request) {
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

    async getDashboard(): Promise<AdminDashboard> {
        const [platform, today, alerts] = await Promise.all([
            adminRepository.getPlatformStats(),
            adminRepository.getTodayStats(),
            buildAlerts(),
        ]);
        return { platform, today, alerts };
    },

    async setMaintenanceMode(
        enabled: boolean,
        message: string,
        setBy: string,
        req: Request,
    ): Promise<void> {
        await this.updateConfig(
            { key: 'MAINTENANCE_MODE', value: String(enabled), updatedBy: setBy },
            req,
        );

        if (message) {
            await this.updateConfig(
                { key: 'MAINTENANCE_MESSAGE', value: message, updatedBy: setBy },
                req,
            );
        }

        log.warn('Maintenance mode changed', { enabled, setBy });
    },

    async isMaintenanceMode(): Promise<{ active: boolean; message: string }> {
        const config = await adminRepository.getConfig('MAINTENANCE_MODE');
        if (!config || config.value !== 'true') {
            return { active: false, message: '' };
        }
        const msgConfig = await adminRepository.getConfig('MAINTENANCE_MESSAGE');
        return {
            active: true,
            message: msgConfig?.value ?? 'Platform under maintenance',
        };
    },

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

    async updateBranch(branchId: string, data: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        pincode?: string;
        phone?: string;
        manager_id?: string | null;
        lat?: number;
        lng?: number;
        working_hours?: string;
        is_active?: boolean;
    }, req: Request) {
        const { prisma } = await import('@/config/database');
        // Explicit field whitelist instead of spreading the raw request body —
        // previously any client-supplied field passed straight through to
        // Prisma's update(), a mass-assignment risk since validateBody() wasn't
        // even applied to this route at all.
        const branch = await prisma.branches.update({
            where: { id: branchId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.city !== undefined && { city: data.city }),
                ...(data.state !== undefined && { state: data.state }),
                ...(data.pincode !== undefined && { pincode: data.pincode }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.manager_id !== undefined && { manager_id: data.manager_id }),
                ...(data.lat !== undefined && { lat: data.lat }),
                ...(data.lng !== undefined && { lng: data.lng }),
                ...(data.working_hours !== undefined && { working_hours: data.working_hours }),
                ...(data.is_active !== undefined && { is_active: data.is_active }),
                updated_at: new Date(),
            },
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

        // Previously computed a `serialized` variable here (via
        // serializeMoney, converting rupees to paise) but returned the
        // unserialized `rows` instead — a dead computation, not a bug.
        // serializeMoney performs the exact same rupees-to-paise conversion
        // as the global moneyConverter response middleware already applied
        // to every response; had this "fix" been made to return `serialized`
        // instead of `rows`, every money field here would have been
        // converted TWICE (paise, then paise-of-paise), a 10,000x error far
        // worse than the original dead-code issue. Removed the redundant
        // computation entirely — the raw Decimal `rows` are exactly what
        // the global middleware correctly expects to convert once.
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