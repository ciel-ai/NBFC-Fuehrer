// tests/unit/cdlAutoApproval.evaluateForApplication.test.ts
//
// Regression coverage for the auto-approval employment-type trust audit:
// the route backing this (web/credit/cdlAutoApproval.routes.ts's
// POST /auto-approve) previously read employmentType straight from the
// caller's request body, defaulting to 'SALARIED' when omitted entirely —
// with no cross-check against what the application actually is. A missing
// or wrong value there could silently run the SELF_EMPLOYED-eligible rate
// table under the SALARIED one, or vice versa.
//
// evaluateForApplication() is the fix: it fetches loan_applications.
// employment_type (persisted at cdlLoansService.submitApplication) and
// uses that as the one authoritative source — its own input type doesn't
// even accept an employmentType field, so there's no second copy to
// disagree with the persisted one in the first place.

const mockFindUnique = jest.fn();
const mockLoanApplicationsUpdate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
    },
}));

import { cdlAutoApprovalService } from '@/modules/cdlLoans/cdlAutoApproval.service';
import { ValidationError, NotFoundError } from '@/errors';

const APPLICATION_ID = 'app-44444444-4444-4444-4444-444444444444';

// CIBIL 780, comfortably within FOIR and the ₹40,000 auto-approval
// ceiling — guarantees AUTO_APPROVE regardless of employment type, so the
// only thing that can differ between the two tests below is the rate
// getInterestRate() derives from employmentType.
const REST_INPUT = {
    requestedAmount: 35000,
    tenureMonths: 12,
    customerId: 'cust-1',
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

describe('evaluateForApplication — sources employmentType from the application, not the caller', () => {
    test('SALARIED application → SALARIED rate table (13% at CIBIL 780)', async () => {
        mockFindUnique.mockResolvedValue({ employment_type: 'SALARIED' });

        const result = await cdlAutoApprovalService.evaluateForApplication(APPLICATION_ID, REST_INPUT);

        expect(mockFindUnique).toHaveBeenCalledWith({
            where: { id: APPLICATION_ID },
            select: { employment_type: true },
        });
        expect(result.decision).toBe('AUTO_APPROVE');
        expect(result.interestRate).toBe(13);
    });

    test('SELF_EMPLOYED application → SELF_EMPLOYED rate table (14% at CIBIL 780) — does NOT fall back to the SALARIED rate', async () => {
        mockFindUnique.mockResolvedValue({ employment_type: 'SELF_EMPLOYED' });

        const result = await cdlAutoApprovalService.evaluateForApplication(APPLICATION_ID, REST_INPUT);

        expect(result.decision).toBe('AUTO_APPROVE');
        expect(result.interestRate).toBe(14);
        expect(result.interestRate).not.toBe(13); // the SALARIED rate — the exact silent-fallback bug this closes
    });

    test('application not found → NotFoundError, no evaluation attempted', async () => {
        mockFindUnique.mockResolvedValue(null);

        await expect(
            cdlAutoApprovalService.evaluateForApplication(APPLICATION_ID, REST_INPUT),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(mockLoanApplicationsUpdate).not.toHaveBeenCalled();
    });

    test('application with no persisted employment_type (legacy pre-migration row) → ValidationError, does NOT default to SALARIED', async () => {
        mockFindUnique.mockResolvedValue({ employment_type: null });

        await expect(
            cdlAutoApprovalService.evaluateForApplication(APPLICATION_ID, REST_INPUT),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(mockLoanApplicationsUpdate).not.toHaveBeenCalled();
    });

    test('missing loanApplicationId → ValidationError before any DB call', async () => {
        await expect(
            cdlAutoApprovalService.evaluateForApplication('', REST_INPUT),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    test('the result is still saved to loan_applications (same persistence as before)', async () => {
        mockFindUnique.mockResolvedValue({ employment_type: 'SALARIED' });

        await cdlAutoApprovalService.evaluateForApplication(APPLICATION_ID, REST_INPUT);

        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: APPLICATION_ID },
                data: expect.objectContaining({ status: 'APPROVED' }),
            }),
        );
    });
});
