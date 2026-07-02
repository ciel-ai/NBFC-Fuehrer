// src/modules/housingLoans/housingLoans.repository.ts
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('housingLoans.repository');

// ─── Repository ────────────────────────────────────────────────────────────────

export const housingLoansRepository = {

    async createCollateralProperty(data: {
        loanId:            string;
        propertyType:      string;
        address:           string;
        marketValue:       number;
        ltvPct:            number;
        builderName?:      string;
        constructionStage?: string;
    }) {
        const row = await prisma.collateral_property.create({
            data: {
                loan_id:            data.loanId,
                property_type:      data.propertyType,
                address:            data.address,
                market_value:       data.marketValue,
                ltv_pct:            data.ltvPct,
                builder_name:       data.builderName   ?? null,
                construction_stage: data.constructionStage ?? null,
                valued_at:          new Date(),
                created_at:         new Date(),
            },
        });

        log.info('Collateral property record created', {
            loanId: data.loanId,
            propertyType: data.propertyType,
            marketValue: data.marketValue,
        });

        return row;
    },

    async findCollateralByLoanId(loanId: string) {
        return prisma.collateral_property.findUnique({
            where: { loan_id: loanId },
        });
    },

    async updateCollateralProperty(
        loanId: string,
        data: Partial<{
            marketValue:       number;
            ltvPct:            number;
            builderName:       string;
            constructionStage: string;
        }>,
    ) {
        return prisma.collateral_property.update({
            where: { loan_id: loanId },
            data: {
                ...(data.marketValue       !== undefined && { market_value:       data.marketValue }),
                ...(data.ltvPct            !== undefined && { ltv_pct:            data.ltvPct }),
                ...(data.builderName       !== undefined && { builder_name:       data.builderName }),
                ...(data.constructionStage !== undefined && { construction_stage: data.constructionStage }),
            },
        });
    },
};