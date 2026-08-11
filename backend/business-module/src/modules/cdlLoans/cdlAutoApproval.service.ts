// src/modules/cdlLoans/cdlAutoApproval.service.ts
//
// CDL Auto Approval Engine — implements client's exact CIBIL decision matrix
// and eligibility rules from requirements document.
//
// Decision Matrix:
//   CIBIL >= 750              → AUTO_APPROVE
//   CIBIL 700-749             → MANUAL_REVIEW
//   CIBIL 650-699             → REJECT
//   CIBIL < 650               → REJECT
//   No Hit / New to Credit    → MANUAL_REVIEW
//
// Hard rejection conditions:
//   - Active write-off account
//   - Fraud alert in bureau report
//   - 90+ DPD in last 12 months
//   - Multiple overdue loans
//   - KYC mismatch

import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { computeMonthlyEmi } from '@/modules/emi/emi.calculator';

const log = createModuleLogger('cdlAutoApproval');

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutoApprovalDecision = 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'REJECT';

export interface CdlAutoApprovalInput {
    loanApplicationId: string;
    requestedAmount:   number;
    tenureMonths:      number;
    customerId:        string;
    employmentType:    'SALARIED' | 'SELF_EMPLOYED';
    monthlyIncome:     number;
    existingEmis:      number;
    age:               number;
    creditScore:       number | null;
    hasActiveWriteOff: boolean;
    hasFraudAlert:     boolean;
    hasHighDpd:        boolean;       // 90+ DPD in last 12 months
    hasMultipleOverdue: boolean;
    hasKycMismatch:    boolean;
    isNewToCredit:     boolean;       // No credit history
}

export interface AutoApprovalResult {
    decision:              AutoApprovalDecision;
    creditScore:           number | null;
    foir:                  number | null;
    reasons:               string[];
    rejectionCode?:        string;
    approvedAmountRupees?: number;
    interestRate?:         number;
    processingFeeRupees?:  number;
}

// ─── Processing fee slabs (from client requirements) ──────────────────────────

function getProcessingFee(loanAmount: number): number {
    if (loanAmount >= 7000 && loanAmount <= 25000)  return 1463;
    if (loanAmount >= 25001 && loanAmount <= 50000) return 1817;
    if (loanAmount >= 50001 && loanAmount <= 100000) return 2466;
    return 1463; // default to lowest slab
}

// ─── Interest rate by customer type (from client requirements) ────────────────
//
// KNOWN CONFLICT, NOT RESOLVED HERE: this derives the rate from CIBIL score
// at approval time. cdlLoans.service.ts's CDL_INTEREST_RATES instead treats
// the rate as a discrete value the customer/agent chooses at application
// time (0/13/14% salaried, 0/14/15% self-employed), validated against that
// fixed list rather than computed from score. The two disagree on how CDL's
// interest rate is actually decided. That's a product-spec question for
// whoever owns CDL underwriting — flagging it here so the next person to
// touch either file sees it instead of rediscovering it.

function getInterestRate(
    employmentType: 'SALARIED' | 'SELF_EMPLOYED',
    creditScore: number | null,
): number {
    if (creditScore === null || creditScore === 0) return 15; // default rate

    if (employmentType === 'SALARIED') {
        if (creditScore >= 750) return 13;  // Best rate for top CIBIL
        if (creditScore >= 700) return 14;  // Standard rate
        return 15;                           // Higher rate for lower CIBIL
    } else {
        // SELF_EMPLOYED
        if (creditScore >= 750) return 14;
        return 15;
    }
}

// ─── Auto Approval Engine ─────────────────────────────────────────────────────

export const cdlAutoApprovalService = {

    evaluate(input: CdlAutoApprovalInput): AutoApprovalResult {
        const reasons: string[] = [];

        // ── Step 1: Hard rejection conditions ─────────────────────────────────
        if (input.hasActiveWriteOff) {
            log.info('CDL rejected — active write-off', { loanApplicationId: input.loanApplicationId });
            return {
                decision:       'REJECT',
                creditScore:    input.creditScore,
                foir:           null,
                reasons:        ['Active write-off account found'],
                rejectionCode:  'ACTIVE_WRITE_OFF',
            };
        }

        if (input.hasFraudAlert) {
            log.info('CDL rejected — fraud alert', { loanApplicationId: input.loanApplicationId });
            return {
                decision:       'REJECT',
                creditScore:    input.creditScore,
                foir:           null,
                reasons:        ['Fraud alert found in bureau report'],
                rejectionCode:  'FRAUD_ALERT',
            };
        }

        if (input.hasHighDpd) {
            log.info('CDL rejected — high DPD', { loanApplicationId: input.loanApplicationId });
            return {
                decision:       'REJECT',
                creditScore:    input.creditScore,
                foir:           null,
                reasons:        ['90+ DPD found in last 12 months'],
                rejectionCode:  'HIGH_DPD',
            };
        }

        if (input.hasMultipleOverdue) {
            log.info('CDL rejected — multiple overdue', { loanApplicationId: input.loanApplicationId });
            return {
                decision:       'REJECT',
                creditScore:    input.creditScore,
                foir:           null,
                reasons:        ['Multiple overdue loans found'],
                rejectionCode:  'MULTIPLE_OVERDUE',
            };
        }

        if (input.hasKycMismatch) {
            log.info('CDL rejected — KYC mismatch', { loanApplicationId: input.loanApplicationId });
            return {
                decision:       'REJECT',
                creditScore:    input.creditScore,
                foir:           null,
                reasons:        ['KYC mismatch detected'],
                rejectionCode:  'KYC_MISMATCH',
            };
        }

        // ── Step 2: Basic eligibility checks ──────────────────────────────────

        // Age check (21-55 years)
        if (input.age < 21 || input.age > 55) {
            reasons.push(`Age ${input.age} is outside eligible range (21-55 years)`);
            return {
                decision:      'REJECT',
                creditScore:   input.creditScore,
                foir:          null,
                reasons,
                rejectionCode: 'AGE_INELIGIBLE',
            };
        }

        // Minimum income check (₹15,000)
        if (input.monthlyIncome < 15000) {
            reasons.push(`Monthly income ₹${input.monthlyIncome.toLocaleString('en-IN')} is below minimum ₹15,000`);
            return {
                decision:      'REJECT',
                creditScore:   input.creditScore,
                foir:          null,
                reasons,
                rejectionCode: 'INSUFFICIENT_INCOME',
            };
        }

        // Loan amount range check
        if (input.requestedAmount < 7000 || input.requestedAmount > 100000) {
            reasons.push(`Loan amount ₹${input.requestedAmount.toLocaleString('en-IN')} is outside eligible range (₹7,000 - ₹1,00,000)`);
            return {
                decision:      'REJECT',
                creditScore:   input.creditScore,
                foir:          null,
                reasons,
                rejectionCode: 'AMOUNT_OUT_OF_RANGE',
            };
        }

        // Auto-approval-specific amount ceiling (client's Consumer Loan
        // Product Configuration spec, section 4.1 "Auto Approval Criteria":
        // ₹7,000-₹40,000) — narrower than the general CDL range just
        // checked above (₹7,000-₹1,00,000, spec section 1e/2). A loan above
        // ₹40,000 is still a valid CDL loan, just outside auto-approval's
        // scope — the spec doesn't say to reject it, only to route it to
        // manual review.
        if (input.requestedAmount > 40000) {
            reasons.push(`Loan amount ₹${input.requestedAmount.toLocaleString('en-IN')} exceeds auto-approval limit of ₹40,000 — requires manual review`);
            log.info('CDL manual review — amount exceeds auto-approval limit', {
                loanApplicationId: input.loanApplicationId,
                requestedAmount:   input.requestedAmount,
            });
            return {
                decision:    'MANUAL_REVIEW',
                creditScore: input.creditScore,
                foir:        null,
                reasons,
            };
        }

        // ── Step 3: FOIR calculation ───────────────────────────────────────────
        // Audit finding #17 — this used to have its own duplicate,
        // whole-rupee-rounded EMI formula (calculateEmi(), now removed),
        // separate from computeMonthlyEmi (emi.calculator.ts) — the same
        // authoritative calculator cdlLoans.service.ts's real amortization
        // schedule uses, and the one an earlier commit already
        // consolidated CDL/housing's own EMI estimates onto. Two
        // implementations of "the EMI for this loan" can silently drift;
        // this FOIR gate now evaluates against the exact figure the
        // customer will actually be billed, not a separately-rounded
        // estimate.
        const interestRate   = getInterestRate(input.employmentType, input.creditScore);
        const proposedEmi    = computeMonthlyEmi(input.requestedAmount, interestRate, input.tenureMonths);
        const totalEmi       = input.existingEmis + proposedEmi;
        const foir           = Math.round((totalEmi / input.monthlyIncome) * 100);

        if (foir > 60) {
            reasons.push(`FOIR ${foir}% exceeds maximum limit of 60%`);
            return {
                decision:      'REJECT',
                creditScore:   input.creditScore,
                foir,
                reasons,
                rejectionCode: 'FOIR_EXCEEDED',
            };
        }

        // ── Step 4: CIBIL decision matrix ─────────────────────────────────────
        const score = input.creditScore;

        // New to credit / No hit
        if (score === null || input.isNewToCredit) {
            reasons.push('No credit history — New to Credit (NTC) applicant');
            log.info('CDL manual review — NTC', { loanApplicationId: input.loanApplicationId });
            return {
                decision:    'MANUAL_REVIEW',
                creditScore: score,
                foir,
                reasons,
            };
        }

        // CIBIL < 650 → Reject
        if (score < 650) {
            reasons.push(`CIBIL score ${score} is below minimum threshold of 650`);
            return {
                decision:      'REJECT',
                creditScore:   score,
                foir,
                reasons,
                rejectionCode: 'LOW_CIBIL',
            };
        }

        // CIBIL 650-699 → Reject
        if (score >= 650 && score <= 699) {
            reasons.push(`CIBIL score ${score} is in reject band (650-699)`);
            return {
                decision:      'REJECT',
                creditScore:   score,
                foir,
                reasons,
                rejectionCode: 'CIBIL_REJECT_BAND',
            };
        }

        // CIBIL 700-749 → Manual Review
        if (score >= 700 && score <= 749) {
            reasons.push(`CIBIL score ${score} requires manual review (700-749 band)`);
            log.info('CDL manual review — CIBIL band', { loanApplicationId: input.loanApplicationId, score });
            return {
                decision:    'MANUAL_REVIEW',
                creditScore: score,
                foir,
                reasons,
            };
        }

        // CIBIL >= 750 → Auto Approve
        const processingFee = getProcessingFee(input.requestedAmount);
        reasons.push(`CIBIL score ${score} qualifies for auto approval`);
        reasons.push(`FOIR ${foir}% is within limit`);

        log.info('CDL auto approved', {
            loanApplicationId: input.loanApplicationId,
            score,
            foir,
            interestRate,
            amount: input.requestedAmount,
        });

        return {
            decision:              'AUTO_APPROVE',
            creditScore:           score,
            foir,
            reasons,
            approvedAmountRupees:  input.requestedAmount,
            interestRate,
            processingFeeRupees:   processingFee,
        };
    },

    // ── Save auto approval result to underwriting report ─────────────────────
    // Previously wrote status only — approvedAmountRupees/processingFeeRupees
    // were computed above but silently discarded, so an AUTO_APPROVE
    // decision left approved_amount NULL in the DB. cdlLoans.service.ts's
    // disburseToMerchant hard-gates on approved_amount being non-null, so a
    // loan "approved" through this admin path could never actually be
    // disbursed. Now persists the figures the response already reported.
    // REJECT/MANUAL_REVIEW have no approved figures to persist, so they're
    // unchanged.

    async saveResult(
        loanApplicationId: string,
        result: AutoApprovalResult,
    ): Promise<void> {
        await prisma.loan_applications.update({
            where: { id: loanApplicationId },
            data:  {
                status:     result.decision === 'AUTO_APPROVE' ? 'APPROVED'
                          : result.decision === 'REJECT'       ? 'REJECTED'
                          : 'PENDING_APPROVAL',
                ...(result.decision === 'AUTO_APPROVE' ? {
                    approved_amount: result.approvedAmountRupees,
                    processing_fee:  result.processingFeeRupees,
                    // interest_rate deliberately NOT persisted here.
                    // result.interestRate comes from this file's
                    // getInterestRate(), which derives rate from CIBIL
                    // score — confirmed against the client's Consumer Loan
                    // Product Configuration spec (sections 1b/2b) to have
                    // no basis there; that spec's rate table is flat by
                    // customer type only, with no credit-score dimension.
                    // The correct rate model (this vs. cdlLoans.service.ts's
                    // CDL_INTEREST_RATES) is still pending client
                    // confirmation. Persisting a rate already known to
                    // possibly be wrong would be worse than leaving it null.
                } : {}),
                updated_at: new Date(),
            },
        });

        log.info('Auto approval result saved', {
            loanApplicationId,
            decision:    result.decision,
            creditScore: result.creditScore,
            foir:        result.foir,
        });
    },

    // ── Get processing fee slab ───────────────────────────────────────────────
    getProcessingFee,

    // ── Get interest rate ─────────────────────────────────────────────────────
    getInterestRate,
};