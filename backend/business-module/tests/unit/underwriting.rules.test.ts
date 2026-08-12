// tests/unit/underwriting.rules.test.ts
//
// Phase 1 of the #22 resolution plan — hardening the underwriting rule
// engine (src/modules/underwriting/underwriting.rules.ts). This engine
// currently has no callers outside its own staff-triggered route
// (POST /underwriting/run/:loanId) — confirmed via a repo-wide search for
// underwritingService.* before starting this task. CDL, gold, and housing
// loans are unaffected by anything in this file.
//
// The golden-fixture test below was written and run BEFORE any of the
// three behavioral fixes (KYC_COMPLETE, AML_CLEAR, weighted-score
// denominator) landed, against the then-current types, to record a
// baseline: a genuinely healthy applicant scored 100/100, zero hard
// fails, zero failed rules, decision APPROVED.

import { runRuleEngine, RULE_DEFINITIONS } from '@/modules/underwriting/underwriting.rules';
import type { RuleContext } from '@/modules/underwriting/underwriting.rules';
import { HOUSING_LOAN_RULES } from '@/modules/underwriting/rules/housingLoan.rules';
import type { UnderwritingConfig } from '@/modules/underwriting/underwriting.types';
import type { KycUnderwritingData } from '@/modules/kyc';
import { PRODUCT_TYPE } from '@/config/constants';

// Config built by hand rather than importing underwriting.service.ts's
// buildConfig() (unexported, and this task doesn't touch service.ts at
// all) — values chosen to be unambiguous against the fixtures below.
const CONFIG: UnderwritingConfig = {
    minCreditScore: 700,
    maxFoir: 0.6,
    maxDti: 0.6,
    minMonthlyIncome: 15_000,
    maxEnquiries90Days: 3,
    maxOverdueAccounts: 0,
    maxBounces: 2,
    maxFraudScore: 60,
    minBankMonthsAnalysed: 3,
    rateGrid: [{ minScore: 300, maxScore: 900, rate: 15 }],
};

// A genuinely healthy applicant — every RULE_DEFINITIONS check should
// pass on its own merits, not by accident of a missing/undefined field.
const HEALTHY_KYC: KycUnderwritingData = {
    creditScore: 800,
    averageMonthlyIncome: 80_000,
    existingEmiPerMonth: 5_000,
    bankBounces: 0,
    fraudScore: 10,
    amlClear: true,
    monthsAnalysed: 6,
    kycComplete: true,
};

function healthyCtx(overrides: Partial<RuleContext> = {}): RuleContext {
    return {
        loanId: 'loan-1',
        requestedAmount: 20_000,
        tenureMonths: 12,
        productType: PRODUCT_TYPE.CONSUMER_DURABLE,
        requestedEmi: 3_000,
        kyc: HEALTHY_KYC,
        config: CONFIG,
        ...overrides,
    };
}

// Mirrors underwriting.service.ts's (unexported, untouched by this task)
// deriveDecision() purely for this test's own readability — not a
// change to or a stand-in for the real function.
function mirrorDecision(hasHardFail: boolean, internalScore: number, failedRules: number): string {
    if (hasHardFail) return 'REJECTED';
    if (internalScore >= 70 && failedRules === 0) return 'APPROVED';
    return 'REFERRED';
}

describe('underwriting rule engine — golden fixture (baseline, must not move)', () => {
    test('a genuinely healthy applicant scores 100/100, zero hard fails, decision APPROVED', () => {
        const result = runRuleEngine(healthyCtx());

        expect(result.internalScore).toBe(100);
        expect(result.hasHardFail).toBe(false);
        expect(result.failedRules).toBe(0);
        expect(result.passedRules).toBe(RULE_DEFINITIONS.length);
        expect(mirrorDecision(result.hasHardFail, result.internalScore, result.failedRules)).toBe('APPROVED');
    });
});

describe('BUG 1 — KYC_COMPLETE (weight 40, hardFail) is no longer a dead check', () => {
    test('passes when KYC is genuinely complete', () => {
        const result = runRuleEngine(healthyCtx());
        const rule = result.ruleResults.find((r) => r.ruleId === 'KYC_COMPLETE');
        expect(rule?.passed).toBe(true);
    });

    test('hard-fails when KYC is genuinely incomplete — this is the regression proof: this rule could never fail before', () => {
        const result = runRuleEngine(healthyCtx({ kyc: { ...HEALTHY_KYC, kycComplete: false } }));
        const rule = result.ruleResults.find((r) => r.ruleId === 'KYC_COMPLETE');
        expect(rule?.passed).toBe(false);
        expect(rule?.hardFail).toBe(true);
        expect(result.hasHardFail).toBe(true);
        expect(result.hardFailRules).toContain('KYC_COMPLETE');
    });
});

describe('BUG 2 — AML_CLEAR fails closed on missing data', () => {
    test('passes on confirmed clear (unchanged)', () => {
        const result = runRuleEngine(healthyCtx({ kyc: { ...HEALTHY_KYC, amlClear: true } }));
        const rule = result.ruleResults.find((r) => r.ruleId === 'AML_CLEAR');
        expect(rule?.passed).toBe(true);
    });

    test('hard-fails on a confirmed hit (unchanged)', () => {
        const result = runRuleEngine(healthyCtx({ kyc: { ...HEALTHY_KYC, amlClear: false } }));
        const rule = result.ruleResults.find((r) => r.ruleId === 'AML_CLEAR');
        expect(rule?.passed).toBe(false);
        expect(rule?.hardFail).toBe(true);
        expect(result.hasHardFail).toBe(true);
    });

    test('hard-fails on null (never run) with a message distinct from a confirmed hit — deliberate fail-closed choice', () => {
        const nullResult = runRuleEngine(healthyCtx({ kyc: { ...HEALTHY_KYC, amlClear: null } }));
        const rule = nullResult.ruleResults.find((r) => r.ruleId === 'AML_CLEAR');
        expect(rule?.passed).toBe(false);
        expect(rule?.hardFail).toBe(true);
        expect(nullResult.hasHardFail).toBe(true);

        const hitResult = runRuleEngine(healthyCtx({ kyc: { ...HEALTHY_KYC, amlClear: false } }));
        const hitRule = hitResult.ruleResults.find((r) => r.ruleId === 'AML_CLEAR');
        expect(rule?.message).not.toBe(hitRule?.message);
        expect(rule?.message.toLowerCase()).toContain('not been completed');
    });
});

describe('BUG 3 — weighted score denominator includes whatever rule set actually ran', () => {
    test('internalScore matches the true proportion of rules passed for a housing-loan context (product-specific rules included)', () => {
        const housingCtx: RuleContext = {
            loanId: 'loan-2',
            requestedAmount: 20_00_000,
            tenureMonths: 180,
            productType: PRODUCT_TYPE.HOUSING_LOAN,
            requestedEmi: 18_000,
            // Deliberately no propertyValue — HL_LTV_RATIO (hardFail) will
            // fail, so at least one housing-specific rule fails while
            // several others (HL_MAX/MIN_LOAN_AMOUNT, HL_MAX_TENURE,
            // HL_CREDIT_SCORE, HL_MIN_INCOME, HL_FOIR) pass — a realistic
            // mixed result, not an all-pass case that would mask the bug.
            kyc: HEALTHY_KYC,
            config: CONFIG,
        };

        const result = runRuleEngine(housingCtx);

        const totalWeight = [...RULE_DEFINITIONS, ...HOUSING_LOAN_RULES]
            .reduce((s, r) => s + r.weight, 0);
        const earnedWeight = result.ruleResults
            .filter((r) => r.passed)
            .reduce((s, r) => s + r.weight, 0);
        const expectedScore = Math.round((earnedWeight / totalWeight) * 100);

        expect(result.internalScore).toBe(expectedScore);
        expect(result.internalScore).toBeGreaterThanOrEqual(0);
        expect(result.internalScore).toBeLessThanOrEqual(100);

        // At least one housing-specific rule must have actually passed for
        // this to be a meaningful proof — otherwise the old (buggy)
        // denominator and the fixed one would coincidentally agree.
        const housingRuleIds = new Set(HOUSING_LOAN_RULES.map((r) => r.id));
        const passedHousingRule = result.ruleResults.some((r) => housingRuleIds.has(r.ruleId) && r.passed);
        expect(passedHousingRule).toBe(true);

        // Regression proof: the old, buggy denominator (generic rules
        // only) would have inflated the score above the correct one
        // whenever a housing-specific rule earned weight the old
        // denominator never accounted for.
        const buggyTotalWeight = RULE_DEFINITIONS.reduce((s, r) => s + r.weight, 0);
        const buggyScore = Math.round((earnedWeight / buggyTotalWeight) * 100);
        expect(result.internalScore).toBeLessThan(buggyScore);
    });

    test('a non-housing context is unaffected — no product rules run, denominator is unchanged from before', () => {
        const result = runRuleEngine(healthyCtx());
        const totalWeight = RULE_DEFINITIONS.reduce((s, r) => s + r.weight, 0);
        const earnedWeight = result.ruleResults.reduce((s, r) => s + (r.passed ? r.weight : 0), 0);
        expect(result.internalScore).toBe(Math.round((earnedWeight / totalWeight) * 100));
    });
});
