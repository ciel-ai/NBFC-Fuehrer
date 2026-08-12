// src/modules/underwriting/underwriting.rules.ts
//
// Rule engine design principles:
//   1. Each rule is a pure function: (data) → RuleResult
//   2. Hard-fail rules trigger immediate REJECTED — no override path
//   3. Soft-fail rules contribute to REFERRED — credit manager can override
//   4. Rules are weighted 0–100 — internal score = weighted average of passes
//   5. All rules run even after a hard fail — for complete audit record
//   6. Thresholds come from UnderwritingConfig — never hardcoded here

import { computeMonthlyEmi } from '@/modules/emi/emi.calculator';
import type { KycUnderwritingData } from '@/modules/kyc';
import type { RuleResult, UnderwritingConfig } from './underwriting.types';
import type { Rupees } from '@/types/common.types';
import { HOUSING_LOAN_RULES } from './rules/housingLoan.rules';
import { PRODUCT_TYPE } from '@/config/constants';

// ─── Rule evaluation context ───────────────────────────────────────────────────
// Everything a rule can inspect

export interface RuleContext {
    loanId: string;
    requestedAmount: Rupees;
    tenureMonths: number;
    productType: string;
    requestedEmi: Rupees;
    kyc: KycUnderwritingData;
    config: UnderwritingConfig;
}

// ─── Rule definitions ─────────────────────────────────────────────────────────

type RuleEvaluator = (ctx: RuleContext) => RuleResult;

export interface RuleDefinition {
    id: string;
    name: string;
    category: RuleResult['category'];
    weight: number;
    hardFail: boolean;
    evaluate: RuleEvaluator;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export function pass(
    def: Omit<RuleDefinition, 'evaluate'>,
    value: RuleResult['value'],
    threshold: RuleResult['threshold'],
    message: string,
): RuleResult {
    return {
        ruleId: def.id,
        ruleName: def.name,
        category: def.category,
        weight: def.weight,
        hardFail: def.hardFail,
        passed: true,
        value,
        threshold,
        message,
    };
}

export function fail(
    def: Omit<RuleDefinition, 'evaluate'>,
    value: RuleResult['value'],
    threshold: RuleResult['threshold'],
    message: string,
): RuleResult {
    return {
        ruleId: def.id,
        ruleName: def.name,
        category: def.category,
        weight: def.weight,
        hardFail: def.hardFail,
        passed: false,
        value,
        threshold,
        message,
    };
}

// ─── Rule catalogue ────────────────────────────────────────────────────────────

export const RULE_DEFINITIONS: RuleDefinition[] = [

    // ── BUREAU: Minimum credit score ──────────────────────────────────────────
    {
        id: 'CREDIT_SCORE_MINIMUM',
        name: 'Minimum credit score',
        category: 'BUREAU',
        weight: 30,
        hardFail: false,   // Below minimum is a soft fail — credit manager can override
        evaluate(ctx) {
            const score = ctx.kyc.creditScore;
            const min = ctx.config.minCreditScore;

            if (score === null) {
                return fail(this, null, min,
                    'No credit score available — NH/NTC applicant',
                );
            }
            if (score >= min) {
                return pass(this, score, min,
                    `Credit score ${score} meets minimum requirement of ${min}`,
                );
            }
            return fail(this, score, min,
                `Credit score ${score} is below minimum required score of ${min}`,
            );
        },
    },

    // ── BUREAU: Overdue accounts ───────────────────────────────────────────────
    {
        id: 'OVERDUE_ACCOUNTS',
        name: 'Overdue accounts check',
        category: 'CREDIT_HISTORY',
        weight: 20,
        hardFail: false,
        evaluate(ctx) {
            // PROXY: standing in for a real overdue-accounts lookup
            // against bureau data (or, on this platform, a cross-product
            // loan_accounts query) — not implemented yet. Derives a
            // guess from credit score (low score = assumed overdue)
            // rather than checking actual overdue status. See audit
            // finding #22's plan, Phase 4.
            const score = ctx.kyc.creditScore ?? 750;
            const hasOverdues = score < 600; // Proxy threshold

            if (!hasOverdues) {
                return pass(this, false, false,
                    'No significant overdue accounts detected',
                );
            }
            return fail(this, true, false,
                'Credit history indicates overdue accounts — requires manual review',
            );
        },
    },

    // ── BUREAU: Recent enquiries ───────────────────────────────────────────────
    {
        id: 'RECENT_ENQUIRIES',
        name: 'Recent bureau enquiries',
        category: 'BUREAU',
        weight: 10,
        hardFail: false,
        evaluate(ctx) {
            // PROXY: standing in for real bureau enquiry-count data
            // (ctx.bureauReport.enquiriesLast90Days in a full
            // implementation) — not implemented yet. Derives a guess
            // from credit score rather than an actual enquiry count.
            // Worth checking whether the credit bureau provider already
            // returns this field unread. See audit finding #22's plan,
            // Phase 4.
            const max = ctx.config.maxEnquiries90Days;
            // Assume 1 enquiry (ours) — flag if score drop suggests more
            const estimated = ctx.kyc.creditScore && ctx.kyc.creditScore < 650 ? 4 : 1;

            if (estimated <= max) {
                return pass(this, estimated, max,
                    `Estimated ${estimated} bureau enquiries in last 90 days (max: ${max})`,
                );
            }
            return fail(this, estimated, max,
                `High number of recent enquiries (${estimated}) suggests credit-seeking behaviour`,
            );
        },
    },

    // ── INCOME: Monthly income check ───────────────────────────────────────────
    {
        id: 'MINIMUM_INCOME',
        name: 'Minimum monthly income',
        category: 'INCOME',
        weight: 20,
        hardFail: false,
        evaluate(ctx) {
            const income = ctx.kyc.averageMonthlyIncome;
            const min = ctx.config.minMonthlyIncome;

            if (income === null) {
                return fail(this, null, min,
                    'Monthly income could not be determined from bank statement',
                );
            }
            if (income >= min) {
                return pass(this, income, min,
                    `Monthly income ₹${income.toLocaleString('en-IN')} meets minimum of ₹${min.toLocaleString('en-IN')}`,
                );
            }
            return fail(this, income, min,
                `Monthly income ₹${income.toLocaleString('en-IN')} is below minimum of ₹${min.toLocaleString('en-IN')}`,
            );
        },
    },

    // ── INCOME: Income stability ───────────────────────────────────────────────
    {
        id: 'INCOME_STABILITY',
        name: 'Income stability (bank statement months)',
        category: 'INCOME',
        weight: 10,
        hardFail: false,
        evaluate(ctx) {
            const months = ctx.kyc.monthsAnalysed;
            const min = ctx.config.minBankMonthsAnalysed;

            if (months >= min) {
                return pass(this, months, min,
                    `${months} months of bank statement history available (minimum: ${min})`,
                );
            }
            return fail(this, months, min,
                `Only ${months} months of bank history available — insufficient for reliable income assessment`,
            );
        },
    },

    // ── OBLIGATIONS: FOIR check ────────────────────────────────────────────────
    {
        id: 'FOIR_CHECK',
        name: 'Fixed Obligation to Income Ratio (FOIR)',
        category: 'OBLIGATIONS',
        weight: 25,
        hardFail: false,
        evaluate(ctx) {
            const income = ctx.kyc.averageMonthlyIncome;
            const existingEmis = ctx.kyc.existingEmiPerMonth ?? 0;
            const maxFoir = ctx.config.maxFoir;

            if (!income || income === 0) {
                return fail(this, null, maxFoir,
                    'FOIR cannot be calculated — income not available',
                );
            }

            const totalObligations = existingEmis + ctx.requestedEmi;
            const foir = totalObligations / income;

            if (foir <= maxFoir) {
                return pass(
                    this,
                    Number(foir.toFixed(4)),
                    maxFoir,
                    `FOIR ${(foir * 100).toFixed(1)}% is within limit of ${(maxFoir * 100).toFixed(0)}%` +
                    ` (existing EMIs ₹${existingEmis.toLocaleString('en-IN')} + requested EMI ₹${ctx.requestedEmi.toLocaleString('en-IN')})`,
                );
            }

            return fail(
                this,
                Number(foir.toFixed(4)),
                maxFoir,
                `FOIR ${(foir * 100).toFixed(1)}% exceeds maximum allowed ${(maxFoir * 100).toFixed(0)}%` +
                ` — total obligations ₹${totalObligations.toLocaleString('en-IN')} on income ₹${income.toLocaleString('en-IN')}`,
            );
        },
    },

    // ── FRAUD_RISK: Fraud score check ─────────────────────────────────────────
    {
        id: 'FRAUD_SCORE',
        name: 'Fraud risk score',
        category: 'FRAUD_RISK',
        weight: 25,
        hardFail: true,   // High fraud score is a hard rejection
        evaluate(ctx) {
            const score = ctx.kyc.fraudScore;
            const max = ctx.config.maxFraudScore;

            if (score === null) {
                // No fraud score available — pass with warning
                return pass(this, null, max,
                    'Fraud score not available — manual review recommended',
                );
            }

            if (score <= max) {
                return pass(this, score, max,
                    `Fraud score ${score} is within acceptable range (max: ${max})`,
                );
            }

            return fail(this, score, max,
                `Fraud risk score ${score} exceeds maximum ${max} — application cannot proceed`,
            );
        },
    },

    // ── FRAUD_RISK: AML check ──────────────────────────────────────────────────
    {
        id: 'AML_CLEAR',
        name: 'AML / sanctions check',
        category: 'FRAUD_RISK',
        weight: 30,
        hardFail: true,   // AML hit is always a hard rejection
        evaluate(ctx) {
            const clear = ctx.kyc.amlClear;

            if (clear === true) {
                return pass(this, true, true,
                    'AML and sanctions screening returned clear',
                );
            }

            // Audit finding #22, Phase 1 — amlClear used to default to
            // `true` when no AML check had ever run, making "never
            // checked" indistinguishable from "confirmed clear" to this
            // hard-fail rule. null is now a distinct state.
            //
            // DELIBERATE COMPLIANCE-LEANING CHOICE, not a technical
            // default: treating "not yet run" as a hard fail (rather
            // than, say, a soft REFERRED signal) is the conservative
            // option for an AML/sanctions gate — missing data is not the
            // same claim as confirmed fraud, but a control like this
            // should fail closed on missing data, not pass silently.
            // This wasn't explicitly specified by AML policy and is
            // worth a sign-off from whoever owns AML compliance at this
            // company before this rule is relied on for a real decision.
            if (clear === null) {
                return fail(this, null, true,
                    'AML/sanctions check has not been completed for this applicant',
                );
            }

            return fail(this, false, true,
                'AML / sanctions check flagged this applicant — application cannot proceed',
            );
        },
    },

    // ── OBLIGATIONS: Bank bounces ──────────────────────────────────────────────
    {
        id: 'BANK_BOUNCES',
        name: 'Bank statement bounce count',
        category: 'OBLIGATIONS',
        weight: 10,
        hardFail: false,
        evaluate(ctx) {
            const bounces = ctx.kyc.bankBounces;
            const max = ctx.config.maxBounces;

            if (bounces <= max) {
                return pass(this, bounces, max,
                    `${bounces} cheque/NACH bounces in bank statement (max: ${max})`,
                );
            }

            return fail(this, bounces, max,
                `${bounces} bounces detected in bank statement — indicates payment stress`,
            );
        },
    },

    // ── LOAN_SPECIFIC: Loan-to-income ratio ───────────────────────────────────
    {
        id: 'LOAN_TO_INCOME',
        name: 'Loan amount to annual income ratio',
        category: 'LOAN_SPECIFIC',
        weight: 15,
        hardFail: false,
        evaluate(ctx) {
            const income = ctx.kyc.averageMonthlyIncome;
            const annualIncome = income ? income * 12 : null;
            const maxRatio = 5; // Loan should not exceed 5× annual income

            if (!annualIncome) {
                return pass(this, null, maxRatio,
                    'Loan-to-income ratio cannot be checked — income not available',
                );
            }

            const ratio = ctx.requestedAmount / annualIncome;

            if (ratio <= maxRatio) {
                return pass(this, Number(ratio.toFixed(2)), maxRatio,
                    `Loan amount is ${ratio.toFixed(1)}× annual income (max: ${maxRatio}×)`,
                );
            }

            return fail(this, Number(ratio.toFixed(2)), maxRatio,
                `Loan amount ₹${ctx.requestedAmount.toLocaleString('en-IN')} is ` +
                `${ratio.toFixed(1)}× annual income — exceeds maximum ${maxRatio}×`,
            );
        },
    },

    // ── IDENTITY: KYC completeness ────────────────────────────────────────────
    {
        id: 'KYC_COMPLETE',
        name: 'KYC fully verified',
        category: 'IDENTITY',
        weight: 40,
        hardFail: true,   // Incomplete KYC blocks all processing
        evaluate(ctx) {
            // Audit finding #22, Phase 1 — this used to check
            // `ctx.kyc.creditScore !== undefined`, which is true for any
            // real caller (creditScore is typed `number | null`, never
            // `undefined`), so this hard-fail safety check could never
            // actually fail. ctx.kyc.kycComplete is the real signal,
            // sourced from kyc_documents.overall_status.
            return ctx.kyc.kycComplete
                ? pass(this, true, true, 'KYC is fully verified')
                : fail(this, false, true, 'KYC not complete — underwriting cannot proceed');
        },
    },
];

// ─── Rule engine executor ─────────────────────────────────────────────────────

export interface RuleEngineResult {
    ruleResults: RuleResult[];
    passedRules: number;
    failedRules: number;
    hardFailRules: string[];
    internalScore: number;    // 0–100 weighted score
    hasHardFail: boolean;
}

export function runRuleEngine(ctx: RuleContext): RuleEngineResult {
    const results: RuleResult[] = [];
    const hardFailRules: string[] = [];

    // Housing-loan-specific rules (LTV, PMAY thresholds, housing FOIR, etc.)
    // were written in a separate file but never actually imported or run
    // anywhere — every housing loan application was evaluated only against
    // the generic RULE_DEFINITIONS set, meaning product-specific housing
    // underwriting rules never actually took effect for any application.
    const productRules: RuleDefinition[] =
        ctx.productType === PRODUCT_TYPE.HOUSING_LOAN ? HOUSING_LOAN_RULES : [];

    // Run every rule — never short-circuit, for complete audit record
    for (const def of [...RULE_DEFINITIONS, ...productRules]) {
        let result: RuleResult;

        try {
            result = def.evaluate(ctx);
        } catch (err) {
            // Rule threw — treat as soft failure, log the error
            result = {
                ruleId: def.id,
                ruleName: def.name,
                category: def.category,
                weight: def.weight,
                hardFail: def.hardFail,
                passed: false,
                value: null,
                threshold: null,
                message: `Rule evaluation error: ${(err as Error).message}`,
            };
        }

        results.push(result);

        if (!result.passed && result.hardFail) {
            hardFailRules.push(def.id);
        }
    }

    // Weighted score: sum(weight × passed) / sum(weight) × 100
    // Audit finding #22, Phase 1 — this used to sum only RULE_DEFINITIONS,
    // but earnedWeight (below) is computed from `results`, which includes
    // productRules whenever they ran. Whenever a product-specific rule
    // (e.g. HOUSING_LOAN_RULES) actually applied, the denominator
    // undercounted the real rule set being scored, inflating
    // internalScore. Now sums whatever rule set was actually evaluated.
    const totalWeight = [...RULE_DEFINITIONS, ...productRules].reduce((s, r) => s + r.weight, 0);
    const earnedWeight = results
        .filter((r) => r.passed)
        .reduce((s, r) => s + r.weight, 0);

    const internalScore = Math.round((earnedWeight / totalWeight) * 100);

    return {
        ruleResults: results,
        passedRules: results.filter((r) => r.passed).length,
        failedRules: results.filter((r) => !r.passed).length,
        hardFailRules,
        internalScore,
        hasHardFail: hardFailRules.length > 0,
    };
}

// ─── Rate grid lookup ─────────────────────────────────────────────────────────

export function lookupInterestRate(
    creditScore: number | null,
    config: UnderwritingConfig,
): number {
    if (creditScore === null) {
        // No bureau score — use highest rate in grid
        return config.rateGrid[config.rateGrid.length - 1]!.rate;
    }

    const band = config.rateGrid.find(
        (b) => creditScore >= b.minScore && creditScore <= b.maxScore,
    );

    // Default to highest rate if score falls outside grid
    return band?.rate ?? config.rateGrid[config.rateGrid.length - 1]!.rate;
}

// ─── Maximum eligible amount ───────────────────────────────────────────────────
// Calculates the highest loan amount the applicant's income can support
// at the approved interest rate, given FOIR constraints.

export function computeMaxEligibleAmount(params: {
    monthlyIncome: Rupees | null;
    existingEmis: Rupees;
    interestRate: number;
    tenureMonths: number;
    maxFoir: number;
    maxLoanAmount: Rupees;
}): Rupees {
    const { monthlyIncome, existingEmis, interestRate, tenureMonths, maxFoir, maxLoanAmount } = params;

    if (!monthlyIncome || monthlyIncome === 0) return 0;

    // Maximum EMI = (income × maxFoir) − existing obligations
    const maxEmi = (monthlyIncome * maxFoir) - existingEmis;
    if (maxEmi <= 0) return 0;

    // Back-solve: what principal P gives monthly EMI = maxEmi?
    // maxEmi = P × r(1+r)^n / ((1+r)^n − 1)
    // P = maxEmi × ((1+r)^n − 1) / (r(1+r)^n)
    const r = interestRate / 12 / 100;

    let maxPrincipal: Rupees;
    if (r === 0) {
        maxPrincipal = maxEmi * tenureMonths;
    } else {
        const power = Math.pow(1 + r, tenureMonths);
        maxPrincipal = (maxEmi * (power - 1)) / (r * power);
    }

    // Round down to nearest ₹1,000 — never overcommit
    maxPrincipal = Math.floor(maxPrincipal / 1_000) * 1_000;

    return Math.min(maxPrincipal, maxLoanAmount);
}
