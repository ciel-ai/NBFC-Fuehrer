// src/modules/sales/sales.service.ts
//
// Every method in this file used to return a fixture. submitApplication built
// an id out of Date.now(), reported status SUBMITTED, and wrote nothing — the
// wizard showed a success screen for an application that did not exist.
// listApplications and getDashboardCounts returned two invented customers and
// hardcoded totals; searchCustomer and the FDO/shop lookups returned invented
// people and shops.
//
// Everything below now reads and writes the real tables.
//
// CDL business logic is NOT reimplemented here. submitApplication delegates to
// cdlLoansService.submitApplication — the same method the customer app's
// endpoint calls — so amount bounds, the interest-rate table, EMI, the
// processing fee, the duplicate-application check and the initial status are
// by construction identical across both channels. This module's own job is
// only what is specific to the sales channel: proving the agent may act, and
// proving the customer exists.

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { NotFoundError, ValidationError } from '@/errors';
import { PRODUCT_TYPE, LOAN_STATUS } from '@/config/constants';
import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import type { CdlApplicationInput, CdlQuoteInput, CdlQuoteResult } from '@/modules/cdlLoans/cdlLoans.types';
import type {
    SalesProduct, SalesApplicationStatus,
    FdoDetails, RetailShop,
    CustomerSearchResult, DashboardCounts,
    SalesApplicationSummary, SalesSubmitResult,
} from './sales.types';

const log = createModuleLogger('sales.service');

// ─── Product mapping ──────────────────────────────────────────────────────────

const PRODUCT_TYPE_BY_SALES_PRODUCT: Record<SalesProduct, string> = {
    cdl: PRODUCT_TYPE.CONSUMER_DURABLE,
    gold: PRODUCT_TYPE.GOLD_LOAN,
    housing: PRODUCT_TYPE.HOUSING_LOAN,
};

// ─── Status mapping ───────────────────────────────────────────────────────────
// The wizard's six buckets over the seventeen-value loan_status enum. The
// state machine is untouched: this is a read-side projection, never a write.

const STATUS_BUCKET: Record<string, SalesApplicationStatus> = {
    [LOAN_STATUS.DRAFT]: 'DRAFT',
    [LOAN_STATUS.KYC_PENDING]: 'SUBMITTED',
    [LOAN_STATUS.KYC_REJECTED]: 'REJECTED',
    [LOAN_STATUS.UNDERWRITING]: 'UNDER_REVIEW',
    [LOAN_STATUS.APPOINTMENT_BOOKED]: 'UNDER_REVIEW',
    [LOAN_STATUS.APPRAISAL_PENDING]: 'UNDER_REVIEW',
    [LOAN_STATUS.PROPERTY_ASSESSMENT]: 'UNDER_REVIEW',
    [LOAN_STATUS.PENDING_APPROVAL]: 'UNDER_REVIEW',
    [LOAN_STATUS.APPROVED]: 'APPROVED',
    [LOAN_STATUS.REJECTED]: 'REJECTED',
    [LOAN_STATUS.ESIGN_PENDING]: 'APPROVED',
    [LOAN_STATUS.DISBURSED]: 'DISBURSED',
    [LOAN_STATUS.ACTIVE]: 'DISBURSED',
    [LOAN_STATUS.CLOSED]: 'DISBURSED',
    [LOAN_STATUS.NPA]: 'DISBURSED',
    [LOAN_STATUS.WRITTEN_OFF]: 'DISBURSED',
};

function toBucket(status: string): SalesApplicationStatus {
    return STATUS_BUCKET[status] ?? 'SUBMITTED';
}

/** The loan_status values that roll up into a given wizard bucket. */
function statusesForBucket(bucket: SalesApplicationStatus): string[] {
    return Object.keys(STATUS_BUCKET).filter((s) => STATUS_BUCKET[s] === bucket);
}

// ─── Agent resolution ─────────────────────────────────────────────────────────

/**
 * The agents row for the signed-in sales user. Authorisation to reach this
 * module is already enforced by allowRoles(AGENT) on the routes; this is the
 * separate question of which agent is acting, and it fails closed — a user
 * with the role but no agent record cannot file anything.
 */
async function requireAgent(userId: string): Promise<{ id: string; agentCode: string }> {
    const agent = await prisma.agents.findUnique({
        where: { user_id: userId },
        select: { id: true, agent_code: true, status: true },
    });
    if (!agent) throw new NotFoundError('Agent profile', userId);
    if (agent.status !== 'ACTIVE') {
        throw new ValidationError('agent', `Your agent account is ${agent.status.toLowerCase()} and cannot file applications`);
    }
    return { id: agent.id, agentCode: agent.agent_code };
}

export const salesService = {

    // ── FDO lookup ───────────────────────────────────────────────────────────
    // Real staff record. `fdoCode` is matched against admin_users.username,
    // the only human-enterable identifier that table carries — there is no
    // dedicated FDO-code column. Returns 404 rather than a placeholder when
    // the code is unknown.
    async lookupFdo(fdoCode: string): Promise<FdoDetails> {
        const staff = await prisma.admin_users.findUnique({
            where: { username: fdoCode },
            include: { branch: { select: { name: true, city: true } } },
        });
        if (!staff) throw new NotFoundError('FDO', fdoCode);

        return {
            fdoCode,
            fdoName: staff.full_name,
            branch: staff.branch?.name ?? '',
            city: staff.branch?.city ?? '',
            phone: staff.phone,
            active: staff.is_active !== false && staff.status === 'ACTIVE',
        };
    },

    // ── Retail shop lookup ───────────────────────────────────────────────────
    // The shop is the agent record. productCategories has no column behind it,
    // so it comes back empty rather than invented.
    async lookupRetailShop(shopCode: string): Promise<RetailShop> {
        const agent = await prisma.agents.findUnique({
            where: { agent_code: shopCode },
        });
        if (!agent) throw new NotFoundError('Retail shop', shopCode);

        return {
            shopCode: agent.agent_code,
            shopName: agent.shop_name,
            ownerName: agent.full_name,
            city: agent.shop_city,
            address: agent.shop_address,
            phone: agent.phone,
            active: agent.status === 'ACTIVE',
            productCategories: [],
        };
    },

    // ── Customer search ──────────────────────────────────────────────────────
    async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
        const rows = await prisma.users.findMany({
            where: {
                is_active: true,
                OR: [
                    { full_name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                ],
                // Agents and staff are not customers.
                agent: null,
            },
            select: {
                id: true,
                full_name: true,
                phone: true,
                // kyc_documents.pan_masked, not pan_number — that column
                // doesn't exist (kyc_documents stores the masked display
                // value; the real PAN lives encrypted in pan_encrypted,
                // which search results must never expose).
                kyc_documents: { select: { pan_masked: true, overall_status: true } },
                _count: { select: { loan_applications: true } },
            },
            take: 20,
            orderBy: { full_name: 'asc' },
        });

        return rows.map((u) => ({
            id: u.id,
            name: u.full_name,
            phone: u.phone,
            pan: u.kyc_documents?.pan_masked ?? null,
            kycStatus: u.kyc_documents?.overall_status ?? 'NOT_STARTED',
            existingLoans: u._count.loan_applications,
        }));
    },

    // ── Dashboard counts ─────────────────────────────────────────────────────
    // The agent's own book, counted in the database.
    async getDashboardCounts(product: SalesProduct, userId: string): Promise<DashboardCounts> {
        const agent = await requireAgent(userId);

        const grouped = await prisma.loan_applications.groupBy({
            by: ['status'],
            where: {
                agent_id: agent.id,
                product_type: PRODUCT_TYPE_BY_SALES_PRODUCT[product],
            },
            _count: { _all: true },
        });

        const counts: DashboardCounts = {
            product,
            total: 0,
            draft: 0,
            submitted: 0,
            underReview: 0,
            approved: 0,
            rejected: 0,
            disbursed: 0,
        };

        for (const row of grouped) {
            const n = row._count._all;
            counts.total += n;
            switch (toBucket(row.status as string)) {
                case 'DRAFT': counts.draft += n; break;
                case 'SUBMITTED': counts.submitted += n; break;
                case 'UNDER_REVIEW': counts.underReview += n; break;
                case 'APPROVED': counts.approved += n; break;
                case 'REJECTED': counts.rejected += n; break;
                case 'DISBURSED': counts.disbursed += n; break;
            }
        }

        return counts;
    },

    // ── Application list ─────────────────────────────────────────────────────
    async listApplications(
        product: SalesProduct,
        status: SalesApplicationStatus | undefined,
        userId: string,
        page: number,
        limit: number,
    ): Promise<SalesApplicationSummary[]> {
        const agent = await requireAgent(userId);

        const rows = await prisma.loan_applications.findMany({
            where: {
                agent_id: agent.id,
                product_type: PRODUCT_TYPE_BY_SALES_PRODUCT[product],
                ...(status ? { status: { in: statusesForBucket(status) as never } } : {}),
            },
            select: {
                id: true,
                status: true,
                amount_requested: true,
                approved_amount: true,
                applied_at: true,
                updated_at: true,
                user: { select: { full_name: true, phone: true } },
            },
            orderBy: { applied_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return rows.map((r) => ({
            applicationId: r.id,
            customerName: r.user?.full_name ?? '',
            customerPhone: r.user?.phone ?? '',
            loanAmount: Number(r.approved_amount ?? r.amount_requested),
            status: toBucket(r.status as string),
            product,
            createdAt: r.applied_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
        }));
    },

    // ── Submit ───────────────────────────────────────────────────────────────
    /**
     * Creates a real loan_applications row through the CDL service.
     *
     * Only CDL is implemented. Gold and housing sales submission is rejected
     * outright rather than acknowledged: reporting success for an application
     * that was never written is the exact behaviour this replaces.
     */
    async submitApplication(
        product: SalesProduct,
        input: CdlApplicationInput & { customerId: string },
        userId: string,
    ): Promise<SalesSubmitResult> {
        if (product !== 'cdl') {
            throw new ValidationError(
                'product',
                `Sales submission for ${product} loans is not implemented yet. The application has NOT been saved.`,
            );
        }

        const agent = await requireAgent(userId);

        const { customerId, ...application } = input;

        // The application is filed against this customer, so they must exist,
        // be active, and actually be a customer.
        const customer = await prisma.users.findUnique({
            where: { id: customerId },
            select: { id: true, is_active: true, agent: { select: { id: true } } },
        });
        if (!customer) throw new NotFoundError('Customer', customerId);
        if (!customer.is_active) {
            throw new ValidationError('customerId', 'This customer account is inactive');
        }
        if (customer.agent) {
            throw new ValidationError('customerId', 'That user is an agent, not a customer');
        }

        // Same method the customer app's own endpoint calls — every CDL rule,
        // the EMI, the fee and the initial status come from there.
        const result = await cdlLoansService.submitApplication(
            customer.id,
            application,
            { agentId: agent.id },
        );

        log.info('Sales CDL application created', {
            applicationId: result.applicationId,
            agentId: agent.id,
            customerId: customer.id,
        });

        return {
            applicationId: result.applicationId,
            status: result.status,
            referenceId: result.referenceId,
            message: 'Application submitted successfully.',
            createdAt: result.createdAt,
        };
    },

    // ── Quote ────────────────────────────────────────────────────────────────
    /**
     * Same authoritative calculation the customer app's own /quote endpoint
     * uses (cdlLoansService.quote) — the sales wizard's live EMI/fee preview
     * must not run a second, local formula that can disagree with the figure
     * the application is actually booked at. requireAgent() is the only
     * sales-specific check here; no customer is identified yet at quote time.
     *
     * Only CDL is implemented, same restriction as submitApplication above.
     */
    async getQuote(
        product: SalesProduct,
        input: CdlQuoteInput,
        userId: string,
    ): Promise<CdlQuoteResult> {
        if (product !== 'cdl') {
            throw new ValidationError(
                'product',
                `Sales quote for ${product} loans is not implemented yet.`,
            );
        }
        await requireAgent(userId);
        return cdlLoansService.quote(input);
    },
};
