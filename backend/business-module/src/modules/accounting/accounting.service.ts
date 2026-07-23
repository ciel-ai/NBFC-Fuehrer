// src/modules/accounting/accounting.service.ts
//
// Auto-posts double-entry journal entries on every financial event.
// Called by disbursement, payments, and NPA services — never by routes directly.

import { createModuleLogger } from '@/config/logger';
import { accountingRepository } from './accounting.repository';
import type { ReferenceType, CreateJournalEntryInput } from './accounting.types';
import { prisma } from '@/config/database';

const log = createModuleLogger('accounting.service');

// Every posting method previously caught its own createEntry() failure and
// only logged it — the triggering business operation (a disbursement, an
// EMI collection) would report success while its corresponding GL entry
// silently never existed, with no durable, queryable record that this ever
// happened. Deliberately NOT re-thrown here: re-throwing would change
// failure-propagation behavior for every caller of these 8 methods across
// disbursement/payments/NPA services, several of which may not currently
// await or catch these calls — that is a larger, riskier change requiring
// a full audit of every call site, tracked separately. This fix keeps the
// current "GL failure doesn't block the business operation" behavior
// unchanged, but makes the failure durably visible via a dedicated
// audit_logs record ops/finance can actually query for, instead of a
// console log line nobody monitors.
async function postEntry(
    data: CreateJournalEntryInput,
    errorContext: Record<string, unknown>,
): Promise<void> {
    try {
        await accountingRepository.createEntry(data);
    } catch (err) {
        log.error('Failed to post GL entry', { error: err, ...errorContext });
        try {
            await prisma.audit_logs.create({
                data: {
                    action: 'GL_POSTING_FAILED',
                    entity_type: 'journal_entries',
                    entity_id: data.referenceId,
                    // No HTTP request is associated with this internal
                    // async failure — request_id is a required column, so
                    // supply a recognizable synthetic value rather than
                    // fabricating a fake one that looks like a real request.
                    request_id: 'system:gl-posting-failure',
                    after_state: JSON.stringify({
                        referenceType: data.referenceType,
                        debitAccount: data.debitAccount,
                        creditAccount: data.creditAccount,
                        amount: data.amount,
                        error: err instanceof Error ? err.message : String(err),
                        ...errorContext,
                    }),
                },
            });
        } catch (auditErr) {
            // If even the audit-trail write fails, we've genuinely done
            // everything we safely can here — log it and move on rather
            // than risk a secondary failure cascading into the caller.
            log.error('Failed to record GL_POSTING_FAILED audit entry', { error: auditErr });
        }
    }
}

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

// Every code in GL above is hardcoded as a string literal, with no
// enforced link to the actual gl_accounts table journal_entries has real
// foreign keys against. If gl_accounts data is ever changed (renumbered,
// re-seeded with a different chart of accounts) without this constant
// being updated to match, every GL posting referencing the drifted code
// would start failing — previously silently (now durably logged, per the
// GL_POSTING_FAILED audit fix), but only discovered on the next real
// transaction rather than at boot. This validates all codes exist at
// startup instead, so drift is caught immediately and loudly rather than
// waiting for a real financial transaction to surface it.
export async function assertGlAccountCodesExist(): Promise<void> {
    const existing = await prisma.gl_accounts.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((row) => row.code));

    const missing = Object.entries(GL)
        .filter(([, code]) => !existingCodes.has(code))
        .map(([name, code]) => `${name} (${code})`);

    if (missing.length > 0) {
        throw new Error(
            `GL account code(s) referenced in accounting.service.ts do not exist in gl_accounts: ${missing.join(', ')}. ` +
            'Every GL posting using these codes will fail. Update either the GL constant or the gl_accounts table so they match.',
        );
    }
}

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
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'DISBURSEMENT',
            referenceId:   params.disbursementId,
            debitAccount:  loanAccountByProduct(params.productType),
            creditAccount: GL.CASH,
            amount:        params.amount,
            narration:     `Loan disbursement — Loan A/c ${params.loanAccountId}`,
            postedBy:      params.postedBy,
        }, params);
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
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'PROCESSING_FEE',
            referenceId:   params.referenceId,
            debitAccount:  GL.CASH,
            creditAccount: GL.PROCESSING_FEE,
            amount:        params.fee,
            narration:     `Processing fee collected`,
            postedBy:      params.postedBy,
        }, params);

        if (params.gst > 0) {
            await postEntry({
                entryDate:     new Date(),
                referenceType: 'PROCESSING_FEE',
                referenceId:   params.referenceId,
                debitAccount:  GL.CASH,
                creditAccount: GL.GST_PAYABLE,
                amount:        params.gst,
                narration:     `GST on processing fee`,
                postedBy:      params.postedBy,
            }, params);
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
        if (params.principal > 0) {
            await postEntry({
                entryDate:     new Date(),
                referenceType: 'EMI_COLLECTION',
                referenceId:   params.paymentId,
                debitAccount:  GL.CASH,
                creditAccount: loanAccountByProduct(params.productType),
                amount:        params.principal,
                narration:     `EMI collection — principal`,
                postedBy:      params.postedBy,
            }, params);
        }

        if (params.interest > 0) {
            await postEntry({
                entryDate:     new Date(),
                referenceType: 'EMI_COLLECTION',
                referenceId:   params.paymentId,
                debitAccount:  GL.CASH,
                creditAccount: interestIncomeByProduct(params.productType),
                amount:        params.interest,
                narration:     `EMI collection — interest`,
                postedBy:      params.postedBy,
            }, params);
        }
    },

    // ── 4. Penal interest ─────────────────────────────────────────────────────
    // Dr Cash and Bank / Cr Penal Interest Income

    async postPenalInterest(params: {
        paymentId: string;
        amount:    number;
        postedBy:  string;
    }): Promise<void> {
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'PENAL_INTEREST',
            referenceId:   params.paymentId,
            debitAccount:  GL.CASH,
            creditAccount: GL.PENAL_INTEREST,
            amount:        params.amount,
            narration:     `Penal interest collected`,
            postedBy:      params.postedBy,
        }, params);
    },

    // ── 5. NPA provisioning ───────────────────────────────────────────────────
    // Dr NPA Provision Expense / Cr NPA Loan Receivable

    async postNpaProvision(params: {
        loanAccountId:    string;
        outstandingAmount: number;
        postedBy:         string;
    }): Promise<void> {
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'NPA_PROVISION',
            referenceId:   params.loanAccountId,
            debitAccount:  GL.NPA_PROVISION,
            creditAccount: GL.NPA_LOAN,
            amount:        params.outstandingAmount,
            narration:     `NPA provision — Loan A/c ${params.loanAccountId}`,
            postedBy:      'system:npa-watch',
        }, params);
    },

    // ── 6. Loan write-off ─────────────────────────────────────────────────────
    // Dr Bad Debt Written Off / Cr Loan Receivable

    async postWriteOff(params: {
        loanAccountId: string;
        productType:   string;
        amount:        number;
        postedBy:      string;
    }): Promise<void> {
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'WRITE_OFF',
            referenceId:   params.loanAccountId,
            debitAccount:  GL.WRITE_OFF,
            creditAccount: loanAccountByProduct(params.productType),
            amount:        params.amount,
            narration:     `Loan written off — Loan A/c ${params.loanAccountId}`,
            postedBy:      params.postedBy,
        }, params);
    },

    // ── 7. Foreclosure ────────────────────────────────────────────────────────
    // Dr Cash and Bank / Cr Foreclosure Charges Income

    async postForeclosure(params: {
        loanAccountId: string;
        charges:       number;
        postedBy:      string;
    }): Promise<void> {
        if (params.charges > 0) {
            await postEntry({
                entryDate:     new Date(),
                referenceType: 'FORECLOSURE',
                referenceId:   params.loanAccountId,
                debitAccount:  GL.CASH,
                creditAccount: GL.FORECLOSURE_CHARGES,
                amount:        params.charges,
                narration:     `Foreclosure charges — Loan A/c ${params.loanAccountId}`,
                postedBy:      params.postedBy,
            }, params);
        }
    },

    // ── 8. Agent commission ───────────────────────────────────────────────────
    // Dr Agent Commission Expense / Cr Cash and Bank

    async postAgentCommission(params: {
        commissionId: string;
        amount:       number;
        postedBy:     string;
    }): Promise<void> {
        await postEntry({
            entryDate:     new Date(),
            referenceType: 'AGENT_COMMISSION',
            referenceId:   params.commissionId,
            debitAccount:  GL.AGENT_COMMISSION,
            creditAccount: GL.CASH,
            amount:        params.amount,
            narration:     `Agent commission payout`,
            postedBy:      params.postedBy,
        }, params);
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