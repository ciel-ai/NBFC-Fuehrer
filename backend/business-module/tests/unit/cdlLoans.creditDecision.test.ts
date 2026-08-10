// tests/unit/cdlLoans.creditDecision.test.ts
//
// Regression test for CDL audit finding #1/#6 (self-approval via a
// client-controlled credit decision). Before this fix:
//   - runCreditAssessment took cibilScore directly from the request body
//     and trusted it outright, with no independent verification.
//   - getCreditDecision took creditStatus/maxLoanAmount directly from the
//     request body and wrote them straight to the DB as the approval
//     decision — a customer could call POST /credit-decision directly
//     with {creditStatus:'PASS', maxLoanAmount:100000}, skip
//     /credit-assessment entirely, and self-approve their own loan.
//
// Both now derive the decision from the real, bureau-verified score in
// kyc_documents.credit_score. These tests assert that a client-supplied
// creditStatus/maxLoanAmount can no longer influence the outcome, that a
// missing bureau score is rejected rather than silently approved, and
// that a genuine high-score applicant still approves correctly end to end.

const mockFindApplicationByIdOrThrow = jest.fn();
const mockUpdateApplicationStatus = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        updateApplicationStatus: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
    },
}));

const mockKycFindByUserId = jest.fn();
jest.mock('@/modules/kyc', () => ({
    kycRepository: { findByUserId: (...args: unknown[]) => mockKycFindByUserId(...args) },
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { ValidationError } from '@/errors';
import { ROLE } from '@/config/constants';

const APPLICATION_ID = 'app-1';
const OWNER_ID = 'user-1';

// Comfortably-approvable income figures — FOIR well under 60% regardless
// of which branch runs, isolating these tests to the cibilScore/decision
// behavior being tested, not FOIR edge cases.
const INCOME_INPUT = { monthlyIncome: 60000, existingEmis: 2000, proposedEmi: 2233 };

const application = {
    id: APPLICATION_ID,
    userId: OWNER_ID,
    interestRate: 13,
    tenureMonths: 12,
    amountRequested: 25000,
    processingFee: 1463,
};

beforeEach(() => {
    jest.clearAllMocks();
    mockFindApplicationByIdOrThrow.mockResolvedValue(application);
    mockUpdateApplicationStatus.mockResolvedValue({});
});

describe('getCreditDecision cannot be influenced by client-supplied creditStatus/maxLoanAmount', () => {
    test('a low real credit score is REJECTED even if the request body claims PASS/₹100000', async () => {
        // Real bureau score is 600 (well below the 650 reject threshold),
        // but the (now-ignored) body shape a pre-fix client might still
        // send claims full approval.
        mockKycFindByUserId.mockResolvedValue({ creditScore: 600 });

        const maliciousBody = {
            ...INCOME_INPUT,
            // These two fields are no longer part of the DTO/type at all,
            // but pass them through as extra properties to prove the
            // service ignores them even if something upstream forwarded
            // them — the real assertion is on what gets WRITTEN below.
            creditStatus: 'PASS',
            maxLoanAmount: 100000,
        } as any;

        const result = await cdlLoansService.getCreditDecision(APPLICATION_ID, maliciousBody, OWNER_ID, ROLE.CUSTOMER);

        expect(result.decision).toBe('REJECTED');
        expect(result.approvedAmount).toBeNull();

        // The actual DB write reflects the REAL decision, not the claimed one.
        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
            APPLICATION_ID,
            'REJECTED',
            expect.objectContaining({ approved_amount: null }),
        );
    });

    test('a claimed maxLoanAmount above the real computed eligible amount does not inflate approved_amount', async () => {
        // Real score of 780 → AUTO_APPROVE-eligible, but the real FOIR-
        // derived maxLoanAmount is capped well below what a malicious
        // client might claim.
        mockKycFindByUserId.mockResolvedValue({ creditScore: 780 });

        const maliciousBody = { ...INCOME_INPUT, creditStatus: 'PASS', maxLoanAmount: 999999999 } as any;

        const result = await cdlLoansService.getCreditDecision(APPLICATION_ID, maliciousBody, OWNER_ID, ROLE.CUSTOMER);

        // approvedAmount is capped by application.amountRequested (25000)
        // regardless of what the client claimed maxLoanAmount to be.
        expect(result.approvedAmount).toBeLessThanOrEqual(application.amountRequested);
        expect(result.approvedAmount).not.toBe(999999999);
    });
});

describe('runCreditAssessment / getCreditDecision reject a missing bureau score', () => {
    test('runCreditAssessment throws when kyc_documents.credit_score is null (bureau check not done)', async () => {
        mockKycFindByUserId.mockResolvedValue({ creditScore: null });

        await expect(
            cdlLoansService.runCreditAssessment(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ValidationError);
        await expect(
            cdlLoansService.runCreditAssessment(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow('Credit bureau check has not been completed for this application');
    });

    test('runCreditAssessment throws when no kyc_documents row exists at all', async () => {
        mockKycFindByUserId.mockResolvedValue(null);

        await expect(
            cdlLoansService.runCreditAssessment(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ValidationError);
    });

    test('getCreditDecision throws (does not silently approve) when the bureau score is missing', async () => {
        mockKycFindByUserId.mockResolvedValue({ creditScore: null });

        await expect(
            cdlLoansService.getCreditDecision(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ValidationError);
        expect(mockUpdateApplicationStatus).not.toHaveBeenCalled();
    });
});

describe('regression — a legitimate high-score applicant still approves correctly end to end', () => {
    test('real score 780, real income data → AUTO_APPROVE, correct approved_amount/interestRate persisted', async () => {
        mockKycFindByUserId.mockResolvedValue({ creditScore: 780 });

        const result = await cdlLoansService.getCreditDecision(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER);

        expect(result.decision).toBe('APPROVED');
        expect(result.approvedAmount).toBeGreaterThan(0);
        expect(result.interestRate).toBe(application.interestRate);
        expect(result.monthlyEmi).toBeGreaterThan(0);

        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
            APPLICATION_ID,
            'APPROVED',
            expect.objectContaining({ approved_amount: result.approvedAmount }),
        );
    });

    test('real score 720 (manual-review band) → PENDING, not auto-approved', async () => {
        mockKycFindByUserId.mockResolvedValue({ creditScore: 720 });

        const result = await cdlLoansService.getCreditDecision(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER);

        expect(result.decision).toBe('PENDING');
        expect(mockUpdateApplicationStatus).toHaveBeenCalledWith(
            APPLICATION_ID,
            'UNDERWRITING',
            expect.anything(),
        );
    });

    test('real score 600 (reject band) → REJECTED', async () => {
        mockKycFindByUserId.mockResolvedValue({ creditScore: 600 });

        const result = await cdlLoansService.getCreditDecision(APPLICATION_ID, INCOME_INPUT, OWNER_ID, ROLE.CUSTOMER);

        expect(result.decision).toBe('REJECTED');
        expect(result.approvedAmount).toBeNull();
    });
});
