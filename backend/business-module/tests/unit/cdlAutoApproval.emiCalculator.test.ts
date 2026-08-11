// tests/unit/cdlAutoApproval.emiCalculator.test.ts
//
// Regression coverage for audit finding #17: cdlAutoApproval.service.ts
// had its own duplicate EMI formula (calculateEmi(), now removed) instead
// of the authoritative computeMonthlyEmi (emi.calculator.ts) — the same
// calculator cdlLoans.service.ts's real amortization schedule uses, and
// the one an earlier commit already consolidated CDL/housing's own EMI
// estimates onto. Two independent "EMI for this loan" implementations
// could silently drift; this file's FOIR gate now evaluates against the
// exact figure the customer will actually be billed.
//
// A second, more concrete bug surfaced while verifying the fix: the old
// duplicate's formula, given a non-positive tenureMonths (this admin
// route — cdlAutoApproval.routes.ts's POST /auto-approve — has no Joi
// validation on its body, so a malformed request could send one),
// silently computed NaN. `NaN > 60` is `false` in JS, so the FOIR-gate
// rejection (`if (foir > 60) reject`) never fired — a request with a
// bogus tenureMonths could fall straight through to the CIBIL decision
// matrix and AUTO_APPROVE with a nonsensical FOIR, having never actually
// been checked. computeMonthlyEmi throws on a non-positive tenure instead
// of returning NaN, closing that fail-open path — evaluate() now fails
// closed (throws) on that input rather than silently approving through a
// broken check. Not a full fix for the route's missing input validation
// generally (out of scope for #17 — a separate, wider gap), just a
// side-effect of removing the duplicate calculator that happens to close
// this specific silent-bypass window.

import { cdlAutoApprovalService, type CdlAutoApprovalInput } from '@/modules/cdlLoans/cdlAutoApproval.service';
import { computeMonthlyEmi } from '@/modules/emi/emi.calculator';

const AUTO_APPROVE_INPUT: CdlAutoApprovalInput = {
    loanApplicationId: 'app-1',
    requestedAmount: 33333,
    tenureMonths: 11,
    customerId: 'cust-1',
    employmentType: 'SALARIED',
    monthlyIncome: 60000,
    existingEmis: 2000,
    age: 30,
    creditScore: 780,
    hasActiveWriteOff: false,
    hasFraudAlert: false,
    hasHighDpd: false,
    hasMultipleOverdue: false,
    hasKycMismatch: false,
    isNewToCredit: false,
};

describe('cdlAutoApproval FOIR — consolidated onto the authoritative EMI calculator', () => {
    test('foir is computed from computeMonthlyEmi exactly, not a separately-rounded duplicate', () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);

        const interestRate = cdlAutoApprovalService.getInterestRate(
            AUTO_APPROVE_INPUT.employmentType, AUTO_APPROVE_INPUT.creditScore,
        );
        const expectedEmi = computeMonthlyEmi(
            AUTO_APPROVE_INPUT.requestedAmount, interestRate, AUTO_APPROVE_INPUT.tenureMonths,
        );
        const expectedFoir = Math.round(
            ((AUTO_APPROVE_INPUT.existingEmis + expectedEmi) / AUTO_APPROVE_INPUT.monthlyIncome) * 100,
        );

        expect(result.foir).toBe(expectedFoir);
    });

    test('a non-positive tenureMonths fails closed (throws) instead of silently bypassing the FOIR>60% rejection with NaN', () => {
        expect(() => cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            tenureMonths: 0,
        })).toThrow();
    });
});
