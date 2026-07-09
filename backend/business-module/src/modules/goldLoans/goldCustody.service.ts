// src/modules/goldLoans/goldCustody.service.ts
//
// Manages physical gold custody lifecycle after appraisal.
// State transitions: IN_CUSTODY → RELEASED (loan closed/foreclosure)
//                   IN_CUSTODY → AUCTIONED (customer default)

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { NotFoundError } from '@/errors';

const log = createModuleLogger('goldCustody.service');

export type CustodyStatus = 'IN_CUSTODY' | 'RELEASED' | 'AUCTIONED';
export type ReleaseReason = 'LOAN_CLOSED' | 'FORECLOSURE' | 'AUCTION';

export const goldCustodyService = {

    // ── Get custody record for a loan ─────────────────────────────────────────

    async getCustodyByLoanId(loanId: string) {
        const record = await prisma.collateral_gold.findUnique({
            where: { loan_id: loanId },
        });
        if (!record) throw new NotFoundError('Gold collateral', loanId);
        return {
            id:              record.id,
            loanId:          record.loan_id,
            netWeightGrams:  Number(record.net_weight_grams),
            purityKarat:     record.purity_karat,
            valuation:       Number(record.valuation),
            custodyStatus:   record.custody_status as CustodyStatus,
            vaultLocation:   record.vault_location,
            receivedAt:      record.received_at,
            releasedAt:      record.released_at,
            releasedBy:      record.released_by,
            releaseReason:   record.release_reason,
            items:           record.items,
            valuedBy:        record.valued_by,
            valuedAt:        record.valued_at,
        };
    },

    // ── Set vault location after gold is received ─────────────────────────────

    async setVaultLocation(
        loanId:        string,
        vaultLocation: string,
        receivedBy:    string,
    ) {
        const record = await prisma.collateral_gold.update({
            where: { loan_id: loanId },
            data: {
                vault_location: vaultLocation,
                received_at:    new Date(),
                custody_status: 'IN_CUSTODY',
            },
        });

        log.info('Gold received into custody', { loanId, vaultLocation, receivedBy });

        return record;
    },

    // ── Release gold back to customer ─────────────────────────────────────────

    async releaseGold(params: {
        loanId:        string;
        releasedBy:    string;
        releaseReason: ReleaseReason;
        notes?:        string;
    }) {
        const existing = await prisma.collateral_gold.findUnique({
            where: { loan_id: params.loanId },
        });

        if (!existing) throw new NotFoundError('Gold collateral', params.loanId);

        if (existing.custody_status !== 'IN_CUSTODY') {
            throw new Error(`Gold is not in custody — current status: ${existing.custody_status}`);
        }

        const record = await prisma.collateral_gold.update({
            where: { loan_id: params.loanId },
            data: {
                custody_status: 'RELEASED',
                released_at:    new Date(),
                released_by:    params.releasedBy,
                release_reason: params.releaseReason,
            },
        });

        log.info('Gold released from custody', {
            loanId:        params.loanId,
            releasedBy:    params.releasedBy,
            releaseReason: params.releaseReason,
        });

        return {
            loanId:        params.loanId,
            custodyStatus: 'RELEASED',
            releasedAt:    record.released_at,
            releasedBy:    record.released_by,
            releaseReason: record.release_reason,
            message:       'Gold released from custody successfully.',
        };
    },

    // ── Mark gold as auctioned ────────────────────────────────────────────────

    async markAuctioned(params: {
        loanId:     string;
        auctionedBy: string;
        notes?:     string;
    }) {
        const existing = await prisma.collateral_gold.findUnique({
            where: { loan_id: params.loanId },
        });

        if (!existing) throw new NotFoundError('Gold collateral', params.loanId);

        if (existing.custody_status !== 'IN_CUSTODY') {
            throw new Error(`Gold is not in custody — current status: ${existing.custody_status}`);
        }

        const record = await prisma.collateral_gold.update({
            where: { loan_id: params.loanId },
            data: {
                custody_status: 'AUCTIONED',
                released_at:    new Date(),
                released_by:    params.auctionedBy,
                release_reason: 'AUCTION',
            },
        });

        log.info('Gold marked as auctioned', {
            loanId:      params.loanId,
            auctionedBy: params.auctionedBy,
        });

        return {
            loanId:        params.loanId,
            custodyStatus: 'AUCTIONED',
            auctionedAt:   record.released_at,
            auctionedBy:   record.released_by,
            message:       'Gold marked as auctioned.',
        };
    },

    // ── List all gold in custody ──────────────────────────────────────────────

    async listCustody(filters: {
        custodyStatus?: CustodyStatus;
        vaultLocation?: string;
        page:           number;
        limit:          number;
    }) {
        const where: any = {};

        if (filters.custodyStatus) where.custody_status = filters.custodyStatus;
        if (filters.vaultLocation) where.vault_location = filters.vaultLocation;

        const skip = (filters.page - 1) * filters.limit;

        const [rows, total] = await prisma.$transaction([
            prisma.collateral_gold.findMany({
                where,
                orderBy: { received_at: 'desc' },
                skip,
                take: filters.limit,
            }),
            prisma.collateral_gold.count({ where }),
        ]);

        return {
            data: rows.map(r => ({
                id:             r.id,
                loanId:         r.loan_id,
                netWeightGrams: Number(r.net_weight_grams),
                purityKarat:    r.purity_karat,
                valuation:      Number(r.valuation),
                custodyStatus:  r.custody_status,
                vaultLocation:  r.vault_location,
                receivedAt:     r.received_at,
                releasedAt:     r.released_at,
            })),
            total,
        };
    },
};