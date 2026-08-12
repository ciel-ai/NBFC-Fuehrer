// tests/unit/payments.processNachDebit.test.ts
//
// Regression test for the payments.user_id corruption fix (Day 1).
//
// Before this fix, processNachDebit wrote emi.loanAccountId into the
// payment's userId field instead of the real customer id from the loan
// account. This test deliberately uses distinct, non-matching values for
// loanAccountId and userId so the bug — writing the wrong one — would fail
// this test if it ever comes back.

const mockFindByIdOrThrow = jest.fn();

jest.mock('@/modules/emi', () => ({
    emiRepository: {
        findByIdOrThrow: (...args: unknown[]) => mockFindByIdOrThrow(...args),
    },
    emiService: {
        applyBounce: jest.fn(),
    },
}));

const mockFindAccountByIdOrThrow = jest.fn();

jest.mock('@/modules/loans', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
}));

const mockCreatePayment = jest.fn();
const mockMarkPaymentSuccess = jest.fn();
const mockFindPaymentByIdOrThrow = jest.fn();
const mockFindExistingEnachDebit = jest.fn();

jest.mock('@/modules/payments/payments.repository', () => ({
    paymentsRepository: {
        createPayment: (...args: unknown[]) => mockCreatePayment(...args),
        markPaymentSuccess: (...args: unknown[]) => mockMarkPaymentSuccess(...args),
        findPaymentByIdOrThrow: (...args: unknown[]) => mockFindPaymentByIdOrThrow(...args),
        findExistingEnachDebit: (...args: unknown[]) => mockFindExistingEnachDebit(...args),
    },
}));

const mockDebitMandate = jest.fn();

jest.mock('@/providers', () => ({
    getPaymentProvider: () => ({
        debitMandate: (...args: unknown[]) => mockDebitMandate(...args),
    }),
}));

import { paymentsService } from '@/modules/payments/payments.service';
import { EMI_STATUS, PAYMENT_STATUS } from '@/config/constants';

describe('processNachDebit — user_id must come from the loan account, not the EMI', () => {
    const fakeReq = {} as import('express').Request;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFindByIdOrThrow.mockResolvedValue({
            id: 'emi-1',
            emiNumber: 1,
            status: EMI_STATUS.PENDING,
            loanAccountId: 'loan-account-999',
            bounceCount: 0,
        });

        mockFindAccountByIdOrThrow.mockResolvedValue({
            userId: 'real-customer-user-123',
        });

        mockCreatePayment.mockResolvedValue({
            id: 'payment-1',
            loanAccountId: 'loan-account-999',
            userId: 'real-customer-user-123',
            emiId: 'emi-1',
            paymentType: 'EMI',
            amount: 5000,
            penaltyAmount: 0,
            totalCollected: 5000,
            channel: 'ENACH',
            status: PAYMENT_STATUS.PENDING,
            utrNumber: null,
            failureReason: null,
            initiatedAt: new Date(),
            settledAt: null,
        });

        mockFindPaymentByIdOrThrow.mockResolvedValue({
            id: 'payment-1',
            loanAccountId: 'loan-account-999',
            emiId: 'emi-1',
            paymentType: 'EMI',
            amount: 5000,
            penaltyAmount: 0,
            totalCollected: 5000,
            channel: 'ENACH',
            status: PAYMENT_STATUS.PENDING,
            utrNumber: null,
            failureReason: null,
            initiatedAt: new Date(),
            settledAt: null,
        });

        mockDebitMandate.mockResolvedValue({
            status: 'SUCCESS',
            paymentId: 'razorpay-pay-1',
        });
    });

    test('createPayment is called with the loan account\'s real userId, not emi.loanAccountId', async () => {
        await paymentsService.processNachDebit(
            {
                emiId: 'emi-1',
                loanAccountId: 'loan-account-999',
                mandateId: 'mandate-1',
                amount: 5000,
                penaltyAmount: 0,
                description: 'Auto-debit EMI #1',
            },
            fakeReq,
        );

        expect(mockCreatePayment).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'real-customer-user-123',
            }),
        );

        const callArg = mockCreatePayment.mock.calls[0][0];
        expect(callArg.userId).not.toBe('loan-account-999');
    });
});