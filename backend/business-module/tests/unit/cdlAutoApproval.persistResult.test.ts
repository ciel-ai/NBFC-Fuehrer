// tests/unit/cdlAutoApproval.persistResult.test.ts
//
// Regression test for a data-loss bug in cdlAutoApproval.service.ts's
// saveResult(): it computed approvedAmountRupees/interestRate/
// processingFeeRupees as part of the AUTO_APPROVE decision, but only ever
// wrote `status` to loan_applications — the actual figures were silently
// discarded. A loan approved through this admin path ended up with
// status: 'APPROVED' but approved_amount left NULL.
//
// That matters because cdlLoans.service.ts's disburseToMerchant hard-gates
// on approved_amount being non-null ("Application has not been approved
// yet" otherwise) — so a loan "approved" this way could never actually be
// disbursed. This test asserts approved_amount/processing_fee now land in
// the same update() call.
//
// interest_rate is deliberately NOT persisted by saveResult(), and is not
// expected to be here: getInterestRate() derives rate from CIBIL score,
// confirmed against the client's Consumer Loan Product Configuration spec
// to have no basis there — the correct rate model is still pending client
// confirmation (see the comment above the persistence call in
// cdlAutoApproval.service.ts). Tests below assert it explicitly stays
// absent, so this isn't accidentally "fixed" before the client answers.

const mockLoanApplicationsUpdate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
    },
}));

import { cdlAutoApprovalService, type CdlAutoApprovalInput } from '@/modules/cdlLoans/cdlAutoApproval.service';

const APPLICATION_ID = 'app-33333333-3333-3333-3333-333333333333';

// CIBIL 780, salaried, comfortably within FOIR, and within the
// auto-approval-specific ₹40,000 ceiling — guarantees AUTO_APPROVE
// through evaluate()'s decision matrix without touching that logic.
const AUTO_APPROVE_INPUT: CdlAutoApprovalInput = {
    loanApplicationId: APPLICATION_ID,
    requestedAmount: 35000,
    tenureMonths: 12,
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

beforeEach(() => {
    jest.clearAllMocks();
    mockLoanApplicationsUpdate.mockResolvedValue({});
});

describe('cdlAutoApprovalService.saveResult — persists computed figures, not just status', () => {
    test('AUTO_APPROVE: approved_amount/processing_fee are written to loan_applications, matching the response', async () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);
        expect(result.decision).toBe('AUTO_APPROVE');
        expect(result.approvedAmountRupees).toBeDefined();
        expect(result.processingFeeRupees).toBeDefined();

        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: APPLICATION_ID },
            data: expect.objectContaining({
                status: 'APPROVED',
                approved_amount: result.approvedAmountRupees,
                processing_fee: result.processingFeeRupees,
            }),
        });
    });

    test('AUTO_APPROVE: persisted approved_amount is non-null — one of the two fields disburseToMerchant gates disbursement on', async () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);
        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        const persisted = mockLoanApplicationsUpdate.mock.calls[0]![0].data;
        // disburseToMerchant also requires interest_rate non-null
        // (cdlLoans.service.ts: `!application.approvedAmount ||
        // !application.interestRate`) — that half is intentionally still
        // unmet here; see the interest_rate-is-not-persisted test below.
        expect(persisted.approved_amount).not.toBeNull();
    });

    test('AUTO_APPROVE: interest_rate is NOT persisted — rate model pending client confirmation', async () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);
        expect(result.interestRate).toBeDefined(); // computed by evaluate()...

        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        const data = mockLoanApplicationsUpdate.mock.calls[0]![0].data;
        // ...but must not be written by saveResult(). getInterestRate()'s
        // CIBIL-derived rate conflicts with cdlLoans.service.ts's
        // CDL_INTEREST_RATES (customer-chosen discrete value), and the spec
        // confirms the CIBIL-derived model has no basis in the client's
        // actual rate table. Persisting a rate known to possibly be wrong
        // would be worse than leaving it null a little longer. If this
        // assertion starts failing, it means someone persisted interest_rate
        // without the rate-model question having been resolved with the
        // client first — don't just update this test, check that.
        expect(data).not.toHaveProperty('interest_rate');
    });

    test('REJECT: no approved-figure fields are written (nothing to persist)', async () => {
        const result = cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            creditScore: 600, // below 650 → REJECT
        });
        expect(result.decision).toBe('REJECT');

        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        const data = mockLoanApplicationsUpdate.mock.calls[0]![0].data;
        expect(data.status).toBe('REJECTED');
        expect(data).not.toHaveProperty('approved_amount');
        expect(data).not.toHaveProperty('interest_rate');
        expect(data).not.toHaveProperty('processing_fee');
    });

    test('MANUAL_REVIEW: no approved-figure fields are written (nothing to persist)', async () => {
        const result = cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            creditScore: 720, // 700-749 band → MANUAL_REVIEW
        });
        expect(result.decision).toBe('MANUAL_REVIEW');

        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        const data = mockLoanApplicationsUpdate.mock.calls[0]![0].data;
        expect(data.status).toBe('PENDING_APPROVAL');
        expect(data).not.toHaveProperty('approved_amount');
        expect(data).not.toHaveProperty('interest_rate');
        expect(data).not.toHaveProperty('processing_fee');
    });
});

describe('cdlAutoApprovalService.evaluate — auto-approval-specific ₹40,000 amount ceiling', () => {
    // Client's Consumer Loan Product Configuration spec, section 4.1 "Auto
    // Approval Criteria": ₹7,000-₹40,000 for auto-approval eligibility —
    // narrower than the general CDL range (₹7,000-₹1,00,000, section 1e/2)
    // already enforced separately. Loans above ₹40,000 are still valid CDL
    // loans, just routed to MANUAL_REVIEW instead of REJECT.

    test('₹40,000 exactly (boundary) is within the auto-approval ceiling — still eligible for AUTO_APPROVE', () => {
        const result = cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            requestedAmount: 40000,
        });
        expect(result.decision).toBe('AUTO_APPROVE');
    });

    test('₹40,001 exceeds the auto-approval ceiling — MANUAL_REVIEW, not REJECT', () => {
        const result = cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            requestedAmount: 40001,
        });
        expect(result.decision).toBe('MANUAL_REVIEW');
        expect(result.rejectionCode).toBeUndefined();
    });

    test('₹80,000 — within the general CDL range, above the auto-approval ceiling — MANUAL_REVIEW', () => {
        const result = cdlAutoApprovalService.evaluate({
            ...AUTO_APPROVE_INPUT,
            requestedAmount: 80000,
        });
        expect(result.decision).toBe('MANUAL_REVIEW');
        expect(result.rejectionCode).toBeUndefined();
        expect(result.reasons.some(r => r.includes('40,000'))).toBe(true);
    });
});
