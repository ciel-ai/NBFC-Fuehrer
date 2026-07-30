// src/modules/loans/loans.repository.ts
import { prisma } from '@/config/database';
import { withTransaction } from '@/config/database';
import { Prisma } from '@/generated/prisma-client';
import { createModuleLogger } from '@/config/logger';
import { generateLoanAccountNumber, generateLoanApplicationNumber } from '@/utils/referenceNumber.util';
import {
    LOAN_STATUS,
    EMI_STATUS,
    PAGINATION,
} from '@/config/constants';
import type { LoanStatus, ProductType } from '@/config/constants';
import {
    toPrismaPage,
    buildPaginationMeta,
    toNumber,
} from '@/types/common.types';
import type {
    PaginatedResult,
    PaginationParams,
} from '@/types/common.types';
import type {
    LoanApplication,
    LoanAccount,
    ListLoansInput,
    CustomerProfile,
    UpsertCustomerInput,
} from './loans.types';
import { NotFoundError } from '@/errors';

const log = createModuleLogger('loans.repository');

// ─── Staff loan-book list item ─────────────────────────────────────────────────
// Shape returned by listAccounts() for the LMS portal — account terms joined
// with customer identity and servicing metrics derived from the EMI schedule.

export interface StaffLoanAccountListItem {
    id: string;
    accountNumber: string;
    applicationId: string;
    customerName: string;
    customerPhone: string;
    principalAmount: number;
    interestRate: number;
    tenureMonths: number;
    monthlyEmi: number;
    outstandingBalance: number;
    status: string;
    disbursedAt: Date | null;
    firstEmiDate: Date | null;
    nextDueDate: Date | null;
    paidCount: number;
    totalEmis: number;
    overdueAmount: number;
    dpd: number;
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapCustomer(row: Record<string, unknown>): CustomerProfile {
    return {
        id: row.id as string,
        userId: row.user_id as string,
        flatHouseNo: row.flat_house_no as string | null,
        streetArea: row.street_area as string | null,
        city: row.city as string | null,
        state: row.state as string | null,
        pincode: row.pincode as string | null,
        employmentType: row.employment_type as string | null,
        employerName: row.employer_name as string | null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
    };
}

function mapApplication(row: Record<string, unknown>): LoanApplication {
    return {
        id: row.id as string,
        referenceNumber: row.reference_number as string | null,
        userId: row.user_id as string,
        agentId: row.agent_id as string | null,
        customerId: row.customer_id as string | null,
        customer: row.customer ? {
            id: (row.customer as any).id,
            userId: (row.customer as any).user_id,
            flatHouseNo: (row.customer as any).flat_house_no,
            streetArea: (row.customer as any).street_area,
            city: (row.customer as any).city,
            state: (row.customer as any).state,
            pincode: (row.customer as any).pincode,
            employmentType: (row.customer as any).employment_type,
            employerName: (row.customer as any).employer_name,
            createdAt: (row.customer as any).created_at,
            updatedAt: (row.customer as any).updated_at,
        } : null,
        status: row.status as LoanStatus,
        amountRequested: toNumber(row.amount_requested as number),
        tenureMonths: row.tenure_months as number,
        productType: row.product_type as ProductType,
        purpose: row.purpose as string,
        storeName: row.store_name as string,
        storeCity: row.store_city as string,
        approvedAmount: row.approved_amount
            ? toNumber(row.approved_amount as number) : null,
        interestRate: row.interest_rate
            ? toNumber(row.interest_rate as number) : null,
        processingFee: row.processing_fee
            ? toNumber(row.processing_fee as number) : null,
        processingFeeGst: row.processing_fee_gst
            ? toNumber(row.processing_fee_gst as number) : null,
        rejectionReason: row.rejection_reason as string | null,
        reviewedBy: row.reviewed_by as string | null,
        reviewedAt: row.reviewed_at as Date | null,
        appliedAt: row.applied_at as Date,
        updatedAt: row.updated_at as Date,
        monthlyIncome: row.monthly_income
            ? toNumber(row.monthly_income as number) : null,
        repaymentType: (row.repayment_type as string) ?? 'MONTHLY_EMI',
    };
}

function mapAccount(row: Record<string, unknown>): LoanAccount {
    return {
        id: row.id as string,
        applicationId: row.application_id as string,
        userId: row.user_id as string,
        accountNumber: row.account_number as string,
        principalAmount: toNumber(row.principal_amount as number),
        interestRate: toNumber(row.interest_rate as number),
        tenureMonths: row.tenure_months as number,
        monthlyEmi: toNumber(row.monthly_emi as number),
        outstandingBalance: toNumber(row.outstanding_balance as number),
        totalInterest: toNumber(row.total_interest as number),
        status: row.status as LoanStatus,
        repaymentMode: row.repayment_mode as string,
        razorpayMandateId: row.razorpay_mandate_id as string | null,
        disbursedAt: row.disbursed_at as Date | null,
        closedAt: row.closed_at as Date | null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
    } as LoanAccount;
}

// ─── Repository ────────────────────────────────────────────────────────────────

export const loansRepository = {

    // ── Customer upsert ───────────────────────────────────────────────────────

    async upsertCustomer(data: UpsertCustomerInput): Promise<CustomerProfile> {
        const row = await prisma.customers.upsert({
            where: { user_id: data.userId },
            update: {
                flat_house_no:   data.flatHouseNo   ?? null,
                street_area:     data.streetArea    ?? null,
                city:            data.city          ?? null,
                state:           data.state         ?? null,
                pincode:         data.pincode       ?? null,
                employment_type: data.employmentType ?? null,
                employer_name:   data.employerName  ?? null,
                updated_at:      new Date(),
            },
            create: {
                user_id:         data.userId,
                flat_house_no:   data.flatHouseNo   ?? null,
                street_area:     data.streetArea    ?? null,
                city:            data.city          ?? null,
                state:           data.state         ?? null,
                pincode:         data.pincode       ?? null,
                employment_type: data.employmentType ?? null,
                employer_name:   data.employerName  ?? null,
                created_at:      new Date(),
                updated_at:      new Date(),
            },
        });
        return mapCustomer(row as unknown as Record<string, unknown>);
    },

    async findCustomerByUserId(userId: string): Promise<CustomerProfile | null> {
        const row = await prisma.customers.findUnique({
            where: { user_id: userId },
        });
        return row ? mapCustomer(row as unknown as Record<string, unknown>) : null;
    },

    // ── Application CRUD ──────────────────────────────────────────────────────

    async findApplicationById(id: string): Promise<LoanApplication | null> {
        const row = await prisma.loan_applications.findUnique({
            where: { id },
        });
        return row ? mapApplication(row as unknown as Record<string, unknown>) : null;
    },

    async findApplicationByIdOrThrow(id: string): Promise<LoanApplication> {
        const app = await this.findApplicationById(id);
        if (!app) throw new NotFoundError('Loan application', id);
        return app;
    },

    async createApplication(
        data: Omit<LoanApplication, 'id' | 'referenceNumber' | 'status' | 'approvedAmount' |
            'interestRate' | 'processingFee' | 'processingFeeGst' |
            'rejectionReason' | 'reviewedBy' | 'reviewedAt' | 'updatedAt'>,
    ): Promise<LoanApplication> {
        const referenceNumber = await generateLoanApplicationNumber();
        const row = await prisma.loan_applications.create({
            data: {
                user_id:          data.userId,
                agent_id:         data.agentId,
                customer_id:      data.customerId,
                reference_number: referenceNumber,
                status:           LOAN_STATUS.DRAFT,
                amount_requested: data.amountRequested,
                tenure_months:   data.tenureMonths,
                product_type:    data.productType,
                purpose:         data.purpose,
                store_name:      data.storeName,
                store_city:      data.storeCity,
                monthly_income:  data.monthlyIncome  ?? null,
                repayment_type:  data.repaymentType  ?? 'MONTHLY_EMI',
                applied_at:      data.appliedAt,
                updated_at:      new Date(),
            },
        });
        return mapApplication(row as unknown as Record<string, unknown>);
    },

    async updateApplicationStatus(
        id: string,
        status: LoanStatus,
        extra?: Record<string, unknown>,
    ): Promise<LoanApplication> {
        const row = await prisma.loan_applications.update({
            where: { id },
            data: {
                status,
                ...extra,
                updated_at: new Date(),
            },
        });
        return mapApplication(row as unknown as Record<string, unknown>);
    },

    // ── Active loan check — only one active application per user ──────────────

    async hasActiveApplication(userId: string): Promise<boolean> {
        const count = await prisma.loan_applications.count({
            where: {
                user_id: userId,
                status: {
                    notIn: [
                        LOAN_STATUS.REJECTED,
                        LOAN_STATUS.CLOSED,
                        LOAN_STATUS.WRITTEN_OFF,
                    ],
                },
            },
        });
        return count > 0;
    },

    // ── Paginated list with full filter / sort support ────────────────────────

    async listApplications(
        filters: ListLoansInput,
    ): Promise<PaginatedResult<LoanApplication>> {
        const where: Record<string, unknown> = {};

        if (filters.userId) where.user_id = filters.userId;
        if (filters.agentId) where.agent_id = filters.agentId;
        if (filters.status) where.status = filters.status;
        if (filters.productType) where.product_type = filters.productType;

        if (filters.fromDate || filters.toDate) {
            where.applied_at = {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
            };
        }

        const sortColumn: Record<string, string> = {
            appliedAt: 'applied_at',
            amount: 'amount_requested',
            updatedAt: 'updated_at',
        };

        const orderBy = {
            [sortColumn[filters.sortBy ?? 'appliedAt'] ?? 'applied_at']:
                filters.sortOrder ?? 'desc',
        };

        const [rows, total] = await prisma.$transaction([
            prisma.loan_applications.findMany({
                where,
                orderBy,
                ...toPrismaPage({ page: filters.page, limit: filters.limit }),
                include: {
                    customer: {
                        select: {
                            id: true,
                            user_id: true,
                            flat_house_no: true,
                            street_area: true,
                            city: true,
                            state: true,
                            pincode: true,
                            employment_type: true,
                            employer_name: true,
                            created_at: true,
                            updated_at: true,
                        },
                    },
                },
            }),
            prisma.loan_applications.count({ where }),
        ]);

        return {
            data: rows.map(
                (r) => mapApplication(r as unknown as Record<string, unknown>),
            ),
            pagination: buildPaginationMeta(filters.page, filters.limit, total),
        };
    },

    // ── Loan account CRUD ──────────────────────────────────────────────────────

    async findAccountByApplicationId(
        applicationId: string,
    ): Promise<LoanAccount | null> {
        const row = await prisma.loan_accounts.findFirst({
            where: { application_id: applicationId },
        });
        return row ? mapAccount(row as unknown as Record<string, unknown>) : null;
    },

    async findAccountById(id: string): Promise<LoanAccount | null> {
        const row = await prisma.loan_accounts.findUnique({ where: { id } });
        return row ? mapAccount(row as unknown as Record<string, unknown>) : null;
    },

    async findAccountByIdOrThrow(id: string): Promise<LoanAccount> {
        const acc = await this.findAccountById(id);
        if (!acc) throw new NotFoundError('Loan account', id);
        return acc;
    },

    // ── Staff loan book — all accounts with servicing metrics (LMS portal) ────
    // Joins customer identity + EMI schedule and derives per-account servicing
    // figures (paid count, next due, overdue amount, DPD) in one query.

        async listAccounts(filters: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResult<StaffLoanAccountListItem>> {
        const page  = filters.page  ?? PAGINATION.DEFAULT_PAGE;
        const limit = filters.limit ?? PAGINATION.DEFAULT_LIMIT;
        const offset = (page - 1) * limit;

        const conditions: Prisma.Sql[] = [];
        if (filters.status) {
            conditions.push(Prisma.sql`la.status = ${filters.status}`);
        }
        if (filters.search) {
            const q = `%${filters.search.trim()}%`;
            conditions.push(Prisma.sql`(
                la.account_number ILIKE ${q}
                OR u.full_name    ILIKE ${q}
                OR u.phone        LIKE  ${q}
            )`);
        }
        const where = conditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
            : Prisma.empty;

        type Row = {
            id: string; account_number: string; application_id: string;
            principal_amount: number; interest_rate: number;
            tenure_months: number; monthly_emi: number;
            outstanding_balance: number; status: string;
            disbursed_at: Date | null;
            full_name: string; phone: string;
            paid_count: number; total_emis: number;
            overdue_amount: number;
            next_due_date: Date | null; first_emi_date: Date | null;
            dpd: number;
        };

        const [rows, countResult] = await Promise.all([
            prisma.$queryRaw<Row[]>`
                SELECT
                    la.id,
                    la.account_number,
                    la.application_id,
                    la.principal_amount,
                    la.interest_rate,
                    la.tenure_months,
                    la.monthly_emi,
                    la.outstanding_balance,
                    la.status,
                    la.disbursed_at,
                    u.full_name,
                    u.phone,
                    COUNT(CASE WHEN es.status IN ('PAID','WAIVED') THEN 1 END)::int          AS paid_count,
                    COUNT(es.id)::int                                                         AS total_emis,
                    COALESCE(SUM(CASE WHEN es.status IN ('OVERDUE','BOUNCED')
                        THEN es.emi_amount + COALESCE(es.penalty_amount, 0) ELSE 0 END), 0)  AS overdue_amount,
                    MIN(CASE WHEN es.status NOT IN ('PAID','WAIVED') THEN es.due_date END)    AS next_due_date,
                    MIN(es.due_date)                                                          AS first_emi_date,
                    GREATEST(0, COALESCE(
                        EXTRACT(DAY FROM NOW() - MIN(
                            CASE WHEN es.status IN ('OVERDUE','BOUNCED') THEN es.due_date END
                        ))::int, 0
                    ))                                                                        AS dpd
                FROM loan_accounts la
                JOIN users u ON u.id = la.user_id
                LEFT JOIN emi_schedule es ON es.loan_account_id = la.id
                ${where}
                GROUP BY la.id, u.full_name, u.phone
                ORDER BY la.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `,
            prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(DISTINCT la.id)::bigint AS count
                FROM loan_accounts la
                JOIN users u ON u.id = la.user_id
                ${where}
            `,
        ]);

        const data: StaffLoanAccountListItem[] = rows.map((row) => ({
            id:                 row.id,
            accountNumber:      row.account_number,
            applicationId:      row.application_id,
            customerName:       row.full_name,
            customerPhone:      row.phone,
            principalAmount:    toNumber(row.principal_amount),
            interestRate:       toNumber(row.interest_rate),
            tenureMonths:       row.tenure_months,
            monthlyEmi:         toNumber(row.monthly_emi),
            outstandingBalance: toNumber(row.outstanding_balance),
            status:             row.status,
            disbursedAt:        row.disbursed_at,
            firstEmiDate:       row.first_emi_date ?? null,
            nextDueDate:        row.next_due_date  ?? null,
            paidCount:          row.paid_count,
            totalEmis:          row.total_emis,
            overdueAmount:      Math.round(toNumber(row.overdue_amount) * 100) / 100,
            dpd:                row.dpd,
        }));

        return {
            data,
            pagination: buildPaginationMeta(page, limit, Number(countResult[0]?.count ?? 0)),
        };
    },
    async findAccountsByUserId(
        userId: string,
        pagination: PaginationParams,
    ): Promise<PaginatedResult<LoanAccount>> {
        const [rows, total] = await prisma.$transaction([
            prisma.loan_accounts.findMany({
                where: { user_id: userId },
                orderBy: { created_at: 'desc' },
                ...toPrismaPage(pagination),
            }),
            prisma.loan_accounts.count({ where: { user_id: userId } }),
        ]);
        return {
            data: rows.map(
                (r) => mapAccount(r as unknown as Record<string, unknown>),
            ),
            pagination: buildPaginationMeta(
                pagination.page, pagination.limit, total,
            ),
        };
    },

    // ── Create loan account — called atomically with EMI schedule creation ────

    async createAccount(data: {
        applicationId: string;
        userId: string;
        principalAmount: number;
        interestRate: number;
        tenureMonths: number;
        monthlyEmi: number;
        totalInterest: number;
    }): Promise<LoanAccount> {
        return withTransaction(async (tx) => {
            const accountNumber = await generateLoanAccountNumber();

            const row = await tx.loan_accounts.create({
                data: {
                    application_id:     data.applicationId,
                    user_id:            data.userId,
                    account_number:     accountNumber,
                    principal_amount:   data.principalAmount,
                    interest_rate:      data.interestRate,
                    tenure_months:      data.tenureMonths,
                    monthly_emi:        data.monthlyEmi,
                    outstanding_balance: data.principalAmount + data.totalInterest,
                    total_interest:     data.totalInterest,
                    status:             LOAN_STATUS.DISBURSED,
                    created_at:         new Date(),
                    updated_at:         new Date(),
                },
            });

            await tx.loan_applications.update({
                where: { id: data.applicationId },
                data: {
                    status:     LOAN_STATUS.DISBURSED,
                    updated_at: new Date(),
                },
            });

            log.info('Loan account created', {
                accountId: row.id,
                accountNumber,
                applicationId: data.applicationId,
            });

            return mapAccount(row as unknown as Record<string, unknown>);
        });
    },

    async updateAccountStatus(
        id: string,
        status: LoanStatus,
        extra?: Record<string, unknown>,
    ): Promise<LoanAccount> {
        const row = await prisma.loan_accounts.update({
            where: { id },
            data: { status, ...extra, updated_at: new Date() },
        });
        return mapAccount(row as unknown as Record<string, unknown>);
    },

    async updateMandateId(
        accountId: string,
        mandateId: string,
    ): Promise<void> {
        await prisma.loan_accounts.update({
            where: { id: accountId },
            data: {
                razorpay_mandate_id: mandateId,
                updated_at: new Date(),
            },
        });
    },

    // Clears the denormalized mandate reference once a mandate is
    // cancelled. Without this, loan_accounts.razorpay_mandate_id keeps
    // pointing at a dead mandate after enach_mandates.status flips to
    // CANCELLED — the NACH debit cron reads only this denormalized field,
    // so it would keep attempting debits against a mandate the bank has
    // already killed.
    async clearMandateId(accountId: string): Promise<void> {
        await prisma.loan_accounts.update({
            where: { id: accountId },
            data: {
                razorpay_mandate_id: null,
                updated_at: new Date(),
            },
        });
    },

    // ── Overdue / NPA queries — used by cron jobs ─────────────────────────────

    async findActiveLoansWithOverdueEmis(
        overdueDaysThreshold: number,
    ): Promise<Array<{ loanAccountId: string; userId: string; overdueDays: number }>> {
        const cutoffDate = new Date(
            Date.now() - overdueDaysThreshold * 24 * 60 * 60 * 1000,
        );

        const rows = await prisma.$queryRaw`
      SELECT
        la.id           AS loan_account_id,
        la.user_id,
        EXTRACT(DAY FROM NOW() - MIN(es.due_date))::int AS overdue_days
      FROM loan_accounts la
      JOIN emi_schedule es ON es.loan_account_id = la.id
      WHERE
        la.status   = 'ACTIVE'
        AND es.status IN ('PENDING', 'BOUNCED')
        AND es.due_date <= ${cutoffDate}
      GROUP BY la.id, la.user_id
      HAVING EXTRACT(DAY FROM NOW() - MIN(es.due_date)) >= ${overdueDaysThreshold}
      ORDER BY overdue_days DESC
    ` as Array<{ loan_account_id: string; user_id: string; overdue_days: number }>;

        return rows.map((r) => ({
            loanAccountId: r.loan_account_id,
            userId: r.user_id,
            overdueDays: r.overdue_days,
        }));
    },
};