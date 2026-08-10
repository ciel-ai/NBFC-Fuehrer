// tests/unit/cdlAutoApproval.persistResult.test.ts
//
// Regression test for a data-loss bug in cdlAutoApproval.service.ts's
// saveResult(): it computed approvedAmountRupees/interestRate/
// processingFeeRupees as part of the AUTO_APPROVE decision, but only ever
// wrote `status` to loan_applications — the actual figures were silently
// discarded. A loan approved through this admin path ended up with
// status: 'APPROVED' but approved_amount/interest_rate left NULL.
//
// That matters because cdlLoans.service.ts's disburseToMerchant hard-gates
// on both being non-null ("Application has not been approved yet"
// otherwise) — so a loan "approved" this way could never actually be
// disbursed. This test asserts the real figures now land in the same
// update() call, and that they're non-null the way disburseToMerchant's
// gate requires.

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

// CIBIL 780, salaried, comfortably within FOIR — guarantees AUTO_APPROVE
// through evaluate()'s decision matrix without touching that logic.
const AUTO_APPROVE_INPUT: CdlAutoApprovalInput = {
    loanApplicationId: APPLICATION_ID,
    requestedAmount: 50000,
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
    test('AUTO_APPROVE: approved_amount/interest_rate/processing_fee are written to loan_applications, matching the response', async () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);
        expect(result.decision).toBe('AUTO_APPROVE');
        expect(result.approvedAmountRupees).toBeDefined();
        expect(result.interestRate).toBeDefined();
        expect(result.processingFeeRupees).toBeDefined();

        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        expect(mockLoanApplicationsUpdate).toHaveBeenCalledWith({
            where: { id: APPLICATION_ID },
            data: expect.objectContaining({
                status: 'APPROVED',
                approved_amount: result.approvedAmountRupees,
                interest_rate: result.interestRate,
                processing_fee: result.processingFeeRupees,
            }),
        });
    });

    test('AUTO_APPROVE: persisted approved_amount/interest_rate are non-null — the exact fields disburseToMerchant gates disbursement on', async () => {
        const result = cdlAutoApprovalService.evaluate(AUTO_APPROVE_INPUT);
        await cdlAutoApprovalService.saveResult(APPLICATION_ID, result);

        const persisted = mockLoanApplicationsUpdate.mock.calls[0]![0].data;
        // Same null-check disburseToMerchant performs before allowing
        // disbursement (cdlLoans.service.ts: `!application.approvedAmount
        // || !application.interestRate`) — asserted directly against what
        // got written here, without exercising the full disbursement flow.
        expect(persisted.approved_amount).not.toBeNull();
        expect(persisted.interest_rate).not.toBeNull();
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
