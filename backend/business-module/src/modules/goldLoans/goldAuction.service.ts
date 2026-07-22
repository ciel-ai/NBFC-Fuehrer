// src/modules/goldLoans/goldAuction.service.ts
//
// Manages the Gold Loan auction process when a customer defaults.
// Status flow: NOTICE_SENT → SCHEDULED → COMPLETED | CANCELLED
//
// Per client T&C:
// - Gold may be sold through public auction or private sale
// - Notice must be sent before auction
// - Surplus goes to borrower, deficit is recoverable from borrower
// - NBFC must report to CIBIL after auction

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { NotFoundError, ConflictError } from '@/errors';

const log = createModuleLogger('goldAuction.service');

export type AuctionStatus = 'NOTICE_SENT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type AuctionType   = 'PUBLIC' | 'PRIVATE';

export const goldAuctionService = {

    // ── Initiate auction — send notice ────────────────────────────────────────
    async initiateAuction(params: {
        loanAccountId:     string;
        loanApplicationId: string;
        auctionType:       AuctionType;
        noticePeriodDays:  number;
        outstandingDues:   number;
        initiatedBy:       string;
        notes?:            string;
    }) {
        log.info('Initiating gold auction', { loanAccountId: params.loanAccountId });

        const auction = await prisma.gold_auctions.create({
            data: {
                loan_account_id:     params.loanAccountId,
                loan_application_id: params.loanApplicationId,
                status:              'NOTICE_SENT',
                auction_type:        params.auctionType,
                notice_sent_at:      new Date(),
                notice_period_days:  params.noticePeriodDays ?? 14,
                outstanding_dues:    params.outstandingDues,
                auctioned_by:        params.initiatedBy,
                notes:               params.notes,
                created_at:          new Date(),
                updated_at:          new Date(),
            },
        });

        log.info('Auction notice sent', { auctionId: auction.id, loanAccountId: params.loanAccountId });
        return auction;
    },

    // ── Schedule auction date and reserve price ───────────────────────────────
    async scheduleAuction(params: {
        auctionId:     string;
        scheduledDate: Date;
        reservePrice:  number;
        scheduledBy:   string;
    }) {
        const auction = await prisma.gold_auctions.update({
            where: { id: params.auctionId },
            data: {
                status:         'SCHEDULED',
                scheduled_date: params.scheduledDate,
                reserve_price:  params.reservePrice,
                updated_at:     new Date(),
            },
        });

        log.info('Auction scheduled', { auctionId: params.auctionId, scheduledDate: params.scheduledDate });
        return auction;
    },

    // ── Complete auction — record sale price and calculate surplus/deficit ────
    async completeAuction(params: {
        auctionId:       string;
        actualSalePrice: number;
        completedBy:     string;
        notes?:          string;
    }) {
        const existing = await prisma.gold_auctions.findUnique({
            where: { id: params.auctionId },
        });

        if (!existing) throw new NotFoundError('Gold Auction', params.auctionId);

        const outstandingDues = Number(existing.outstanding_dues ?? 0);
        const salePrice       = params.actualSalePrice;
        const surplus         = salePrice > outstandingDues ? salePrice - outstandingDues : 0;
        const deficit         = salePrice < outstandingDues ? outstandingDues - salePrice : 0;

        // Previously a plain update() with no status guard and no row
        // locking — an already-COMPLETED or CANCELLED auction could be
        // "completed" again, recomputing surplus/deficit and re-firing the
        // custody-status update. This is now an atomic conditional update
        // (a single UPDATE ... WHERE id = ? AND status = 'SCHEDULED'
        // statement) instead of a separate read-then-write — the database
        // itself, not application logic, enforces that only a genuinely
        // SCHEDULED auction can transition to COMPLETED, closing the
        // double-completion race at the source rather than just checking
        // for it after the fact.
        const { count } = await prisma.gold_auctions.updateMany({
            where: { id: params.auctionId, status: 'SCHEDULED' },
            data: {
                status:            'COMPLETED',
                actual_sale_price: salePrice,
                surplus_amount:    surplus,
                deficit_amount:    deficit,
                completed_at:      new Date(),
                auctioned_by:      params.completedBy,
                notes:             params.notes,
                updated_at:        new Date(),
            },
        });

        if (count === 0) {
            throw new ConflictError(
                `Auction cannot be completed — current status is '${existing.status}', expected 'SCHEDULED'. It may have already been completed or cancelled.`,
            );
        }

        const auction = await prisma.gold_auctions.findUniqueOrThrow({
            where: { id: params.auctionId },
        });

        // Update gold custody status to AUCTIONED
        await prisma.collateral_gold.updateMany({
            where: { loan_id: existing.loan_application_id },
            data: {
                custody_status: 'AUCTIONED',
                released_at:    new Date(),
                released_by:    params.completedBy,
                release_reason: 'AUCTION',
            },
        });

        log.info('Auction completed', {
            auctionId:  params.auctionId,
            salePrice,
            surplus,
            deficit,
        });

        return {
            auction,
            summary: {
                outstandingDues,
                actualSalePrice: salePrice,
                surplus,
                deficit,
                message: surplus > 0
                    ? `Surplus of ₹${surplus.toLocaleString('en-IN')} will be returned to borrower`
                    : deficit > 0
                    ? `Deficit of ₹${deficit.toLocaleString('en-IN')} is recoverable from borrower`
                    : 'Sale price exactly covers outstanding dues',
            },
        };
    },

    // ── Cancel auction ────────────────────────────────────────────────────────
    async cancelAuction(params: {
        auctionId:   string;
        cancelledBy: string;
        reason:      string;
    }) {
        const auction = await prisma.gold_auctions.update({
            where: { id: params.auctionId },
            data: {
                status:     'CANCELLED',
                notes:      params.reason,
                updated_at: new Date(),
            },
        });

        log.info('Auction cancelled', { auctionId: params.auctionId, reason: params.reason });
        return auction;
    },

    // ── Get auction by loan account ───────────────────────────────────────────
    async getByLoanAccount(loanAccountId: string) {
        return prisma.gold_auctions.findMany({
            where:   { loan_account_id: loanAccountId },
            orderBy: { created_at: 'desc' },
        });
    },

    // ── List all auctions ─────────────────────────────────────────────────────
    async listAuctions(filters: {
        status?: AuctionStatus;
        page:    number;
        limit:   number;
    }) {
        const where: any = {};
        if (filters.status) where.status = filters.status;

        const skip = (filters.page - 1) * filters.limit;

        const [rows, total] = await prisma.$transaction([
            prisma.gold_auctions.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take:    filters.limit,
            }),
            prisma.gold_auctions.count({ where }),
        ]);

        return { data: rows, total };
    },
};