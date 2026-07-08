// src/modules/accounting/accounting.service.ts
//
// Auto-posts double-entry journal entries on every financial event.
// Called by disbursement, payments, and NPA services — never by routes directly.

import { createModuleLogger } from '@/config/logger';
import { accountingRepository } from './accounting.repository';
import type { ReferenceType } from './accounting.types';

const log = createModuleLogger('accounting.service');

// ─── GL Account codes ─────────────────────────────────────────────────────────

const GL = {
    CASH:                  '1001',
    LOAN_CDL:              '1002',
    LOAN_GOLD:             '1003',
    LOAN_HOUSING:          '1004',
    LOAN_PERSONAL:         '1005',
    LOAN_KUSH_GHAR:        '1006',
    LOAN_LAKSHAYA:         '1007',
    INTEREST_RECEIVABLE:   '1008',
    NPA_LOAN:              '1010',
    GST_PAYABLE:           '2003',
    INTEREST_INCOME_CDL:   '3001',
    INTEREST_INCOME_GOLD:  '3002',
    INTEREST_INCOME_HOUSE: '3003',
    INTEREST_INCOME_PER:   '3004',
    INTEREST_INCOME_KG:    '3005',
    INTEREST_INCOME_LAK:   '3006',
    PROCESSING_FEE:        '3007',
    PENAL_INTEREST:        '3008',
    FORECLOSURE_CHARGES:   '3009',
    NPA_PROVISION:         '4001',
    WRITE_OFF:             '4002',
    AGENT_COMMISSION:      '4004',
} as const;

function loanAccountByProduct(productType: string): string {
    switch (productType) {
        case 'GOLD_LOAN':     return GL.LOAN_GOLD;
        case 'HOUSING_LOAN':  return GL.LOAN_HOUSING;
        case 'PERSONAL_LOAN': return GL.LOAN_PERSONAL;
        case 'KUSH_GHAR':     return GL.LOAN_KUSH_GHAR;
        case 'LAKSHAYA':      return GL.LOAN_LAKSHAYA;
        default:              return GL.LOAN_CDL;
    }
}

function interestIncomeByProduct(productType: string): string {
    switch (productType) {
        case 'GOLD_LOAN':     return GL.INTEREST_INCOME_GOLD;
        case 'HOUSING_LOAN':  return GL.INTEREST_INCOME_HOUSE;
        case 'PERSONAL_LOAN': return GL.INTEREST_INCOME_PER;
        case 'KUSH_GHAR':     return GL.INTEREST_INCOME_KG;
        case 'LAKSHAYA':      return GL.INTEREST_INCOME_LAK;
        default:              return GL.INTEREST_INCOME_CDL;
    }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const accountingService = {

    // ── 1. Loan disbursement ──────────────────────────────────────────────────
    // Dr Loan Receivable / Cr Cash and Bank

    async postDisbursement(params: {
        disbursementId: string;
        loanAccountId:  string;
        productType:    string;
        amount:         number;
        postedBy:       string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'DISBURSEMENT',
                referenceId:   params.disbursementId,
                debitAccount:  loanAccountByProduct(params.productType),
                creditAccount: GL.CASH,
                amount:        params.amount,
                narration:     `Loan disbursement — Loan A/c ${params.loanAccountId}`,
                postedBy:      params.postedBy,
            });
        } catch (err) {
            log.error('Failed to post disbursement GL entry', { error: err, ...params });
        }
    },

    // ── 2. Processing fee collection ──────────────────────────────────────────
    // Dr Cash and Bank / Cr Processing Fee Income
    // Dr Cash and Bank / Cr GST Payable (for GST portion)

    async postProcessingFee(params: {
        referenceId: string;
        fee:         number;
        gst:         number;
        postedBy:    string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'PROCESSING_FEE',
                referenceId:   params.referenceId,
                debitAccount:  GL.CASH,
                creditAccount: GL.PROCESSING_FEE,
                amount:        params.fee,
                narration:     `Processing fee collected`,
                postedBy:      params.postedBy,
            });

            if (params.gst > 0) {
                await accountingRepository.createEntry({
                    entryDate:     new Date(),
                    referenceType: 'PROCESSING_FEE',
                    referenceId:   params.referenceId,
                    debitAccount:  GL.CASH,
                    creditAccount: GL.GST_PAYABLE,
                    amount:        params.gst,
                    narration:     `GST on processing fee`,
                    postedBy:      params.postedBy,
                });
            }
        } catch (err) {
            log.error('Failed to post processing fee GL entry', { error: err, ...params });
        }
    },

    // ── 3. EMI collection ─────────────────────────────────────────────────────
    // Dr Cash and Bank / Cr Loan Receivable (principal portion)
    // Dr Cash and Bank / Cr Interest Income (interest portion)

    async postEmiCollection(params: {
        paymentId:   string;
        productType: string;
        principal:   number;
        interest:    number;
        postedBy:    string;
    }): Promise<void> {
        try {
            if (params.principal > 0) {
                await accountingRepository.createEntry({
                    entryDate:     new Date(),
                    referenceType: 'EMI_COLLECTION',
                    referenceId:   params.paymentId,
                    debitAccount:  GL.CASH,
                    creditAccount: loanAccountByProduct(params.productType),
                    amount:        params.principal,
                    narration:     `EMI collection — principal`,
                    postedBy:      params.postedBy,
                });
            }

            if (params.interest > 0) {
                await accountingRepository.createEntry({
                    entryDate:     new Date(),
                    referenceType: 'EMI_COLLECTION',
                    referenceId:   params.paymentId,
                    debitAccount:  GL.CASH,
                    creditAccount: interestIncomeByProduct(params.productType),
                    amount:        params.interest,
                    narration:     `EMI collection — interest`,
                    postedBy:      params.postedBy,
                });
            }
        } catch (err) {
            log.error('Failed to post EMI collection GL entry', { error: err, ...params });
        }
    },

    // ── 4. Penal interest ─────────────────────────────────────────────────────
    // Dr Cash and Bank / Cr Penal Interest Income

    async postPenalInterest(params: {
        paymentId: string;
        amount:    number;
        postedBy:  string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'PENAL_INTEREST',
                referenceId:   params.paymentId,
                debitAccount:  GL.CASH,
                creditAccount: GL.PENAL_INTEREST,
                amount:        params.amount,
                narration:     `Penal interest collected`,
                postedBy:      params.postedBy,
            });
        } catch (err) {
            log.error('Failed to post penal interest GL entry', { error: err, ...params });
        }
    },

    // ── 5. NPA provisioning ───────────────────────────────────────────────────
    // Dr NPA Provision Expense / Cr NPA Loan Receivable

    async postNpaProvision(params: {
        loanAccountId:    string;
        outstandingAmount: number;
        postedBy:         string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'NPA_PROVISION',
                referenceId:   params.loanAccountId,
                debitAccount:  GL.NPA_PROVISION,
                creditAccount: GL.NPA_LOAN,
                amount:        params.outstandingAmount,
                narration:     `NPA provision — Loan A/c ${params.loanAccountId}`,
                postedBy:      'system:npa-watch',
            });
        } catch (err) {
            log.error('Failed to post NPA provision GL entry', { error: err, ...params });
        }
    },

    // ── 6. Loan write-off ─────────────────────────────────────────────────────
    // Dr Bad Debt Written Off / Cr Loan Receivable

    async postWriteOff(params: {
        loanAccountId: string;
        productType:   string;
        amount:        number;
        postedBy:      string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'WRITE_OFF',
                referenceId:   params.loanAccountId,
                debitAccount:  GL.WRITE_OFF,
                creditAccount: loanAccountByProduct(params.productType),
                amount:        params.amount,
                narration:     `Loan written off — Loan A/c ${params.loanAccountId}`,
                postedBy:      params.postedBy,
            });
        } catch (err) {
            log.error('Failed to post write-off GL entry', { error: err, ...params });
        }
    },

    // ── 7. Foreclosure ────────────────────────────────────────────────────────
    // Dr Cash and Bank / Cr Foreclosure Charges Income

    async postForeclosure(params: {
        loanAccountId: string;
        charges:       number;
        postedBy:      string;
    }): Promise<void> {
        try {
            if (params.charges > 0) {
                await accountingRepository.createEntry({
                    entryDate:     new Date(),
                    referenceType: 'FORECLOSURE',
                    referenceId:   params.loanAccountId,
                    debitAccount:  GL.CASH,
                    creditAccount: GL.FORECLOSURE_CHARGES,
                    amount:        params.charges,
                    narration:     `Foreclosure charges — Loan A/c ${params.loanAccountId}`,
                    postedBy:      params.postedBy,
                });
            }
        } catch (err) {
            log.error('Failed to post foreclosure GL entry', { error: err, ...params });
        }
    },

    // ── 8. Agent commission ───────────────────────────────────────────────────
    // Dr Agent Commission Expense / Cr Cash and Bank

    async postAgentCommission(params: {
        commissionId: string;
        amount:       number;
        postedBy:     string;
    }): Promise<void> {
        try {
            await accountingRepository.createEntry({
                entryDate:     new Date(),
                referenceType: 'AGENT_COMMISSION',
                referenceId:   params.commissionId,
                debitAccount:  GL.AGENT_COMMISSION,
                creditAccount: GL.CASH,
                amount:        params.amount,
                narration:     `Agent commission payout`,
                postedBy:      params.postedBy,
            });
        } catch (err) {
            log.error('Failed to post agent commission GL entry', { error: err, ...params });
        }
    },

    // ── Queries ───────────────────────────────────────────────────────────────

    async getLedger(filters: {
        accountCode?:    string;
        fromDate?:       Date;
        toDate?:         Date;
        referenceType?:  any;
        page:            number;
        limit:           number;
    }) {
        return accountingRepository.listEntries(filters);
    },

    async getTrialBalance(fromDate?: Date, toDate?: Date) {
        return accountingRepository.getAccountBalances(fromDate, toDate);
    },

    async getChartOfAccounts() {
        return accountingRepository.listAccounts();
    },

    async getEntriesByReference(referenceType: string, referenceId: string) {
        return accountingRepository.findEntriesByReference(referenceType, referenceId);
    },
};