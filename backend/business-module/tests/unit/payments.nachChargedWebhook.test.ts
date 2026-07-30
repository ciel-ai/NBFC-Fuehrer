// tests/unit/payments.nachChargedWebhook.test.ts
//
// Regression test for the _handleNachCharged silent-no-op fix (roadmap 1.1).
//
// Before this fix, the handler matched an incoming subscription.charged
// webhook against a local payment row by gateway_txn_id — but gateway_txn_id
// is never set at PENDING-row creation time for eNACH debits (it isn't known
// until the webhook arrives), and migrated mandates never had a PENDING row
// created by this system's own processNachDebit in the first place. Either
// way, the handler used to hit `if (!existing) return;` and silently drop a
// real, successful debit. This test locks in both fixed paths:
//   1. System-originated debit — PENDING row exists, found by mandate id.
//   2. Migrated mandate — no PENDING row exists, one is created on the spot.

const mockFindByGatewayTxnId = jest.fn();
const mockFindLatestPendingByMandateId = jest.fn();
const mockFindMandateByRazorpayId = jest.fn();
const mockCreatePayment = jest.fn();
const mockMarkPaymentSuccess = jest.fn();

jest.mock('@/modules/payments/payments.repository', () => ({
    paymentsRepository: {
        findByGatewayTxnId: (...args: unknown[]) => mockFindByGatewayTxnId(...args),
        findLatestPendingByMandateId: (...args: unknown[]) => mockFindLatestPendingByMandateId(...args),
        findMandateByRazorpayId: (...args: unknown[]) => mockFindMandateByRazorpayId(...args),
        createPayment: (...args: unknown[]) => mockCreatePayment(...args),
        markPaymentSuccess: (...args: unknown[]) => mockMarkPaymentSuccess(...args),
    },
}));

const mockFindByIdOrThrow = jest.fn();
const mockFindNextDueEmi = jest.fn();

jest.mock('@/modules/emi', () => ({
    emiRepository: {
        findByIdOrThrow: (...args: unknown[]) => mockFindByIdOrThrow(...args),
        findNextDueEmi: (...args: unknown[]) => mockFindNextDueEmi(...args),
    },
    emiService: {
        markPaid: jest.fn(),
    },
}));

const mockFindAccountByIdOrThrow = jest.fn();

jest.mock('@/modules/loans', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
    },
    loansService: {
        activateLoan: jest.fn(),
    },
}));

jest.mock('@/modules/payments/payments.events', () => ({
    paymentEvents: {
        received: jest.fn(),
        failed: jest.fn(),
    },
}));

jest.mock('@/middlewares', () => ({
    setAuditContext: jest.fn(),
}));

jest.mock('@/providers', () => ({
    getPaymentProvider: jest.fn(),
}));

import { paymentsService } from '@/modules/payments/payments.service';
import { PAYMENT_STATUS } from '@/config/constants';

describe('_handleNachCharged — webhook-to-payment reconciliation', () => {
    const requestId = 'req-test-001';

    beforeEach(() => {
        jest.clearAllMocks();
        mockFindAccountByIdOrThrow.mockResolvedValue({ userId: 'user-1' });
    });

    test('system-originated debit: finds the PENDING row by mandate id and marks it success', async () => {
        mockFindByGatewayTxnId.mockResolvedValue(null); // not previously recorded
        mockFindLatestPendingByMandateId.mockResolvedValue({
            id: 'payment-1',
            loanAccountId: 'loan-1',
            emiId: 'emi-1',
            amount: 5000,
            totalCollected: 5000,
            status: PAYMENT_STATUS.PENDING,
        });
        mockFindByIdOrThrow.mockResolvedValue({ id: 'emi-1', emiNumber: 3 });
        mockMarkPaymentSuccess.mockResolvedValue({});

        const entity = {
            id: 'sub_mandateABC',      // subscription/mandate id
            payment_id: 'pay_XYZ123',  // razorpay payment id for this charge
            amount: 500000,            // paise
            notes: {},
        };

        await paymentsService.processRazorpayWebhook(
            {
                event: 'subscription.charged',
                payload: { subscription: { entity } },
                created_at: Date.now(),
            } as never,
            requestId,
        );

        expect(mockFindLatestPendingByMandateId).toHaveBeenCalledWith('sub_mandateABC');
        expect(mockCreatePayment).not.toHaveBeenCalled();
        expect(mockMarkPaymentSuccess).toHaveBeenCalledWith(
            'payment-1', null, expect.any(Date), 'pay_XYZ123',
        );
    });

    test('migrated mandate: no PENDING row exists — creates one instead of dropping the webhook', async () => {
        mockFindByGatewayTxnId.mockResolvedValue(null);
        mockFindLatestPendingByMandateId.mockResolvedValue(null); // no local row — this used to short-circuit
        mockFindMandateByRazorpayId.mockResolvedValue({
            id: 'mandate-legacy-1',
            loanAccountId: 'loan-legacy-1',
            userId: 'user-legacy-1',
        });
        mockFindNextDueEmi.mockResolvedValue({
            id: 'emi-legacy-1',
            emiAmount: 5000,
            emiNumber: 1,
        });
        mockCreatePayment.mockResolvedValue({
            id: 'payment-new-1',
            loanAccountId: 'loan-legacy-1',
            emiId: 'emi-legacy-1',
            amount: 5000,
            totalCollected: 5000,
            status: PAYMENT_STATUS.PENDING,
        });
        mockFindByIdOrThrow.mockResolvedValue({ id: 'emi-legacy-1', emiNumber: 1 });
        mockMarkPaymentSuccess.mockResolvedValue({});

        const entity = {
            id: 'sub_legacyMandate',
            payment_id: 'pay_LEGACY001',
            amount: 500000,
            notes: {},
        };

        await paymentsService.processRazorpayWebhook(
            {
                event: 'subscription.charged',
                payload: { subscription: { entity } },
                created_at: Date.now(),
            } as never,
            requestId,
        );

        expect(mockFindMandateByRazorpayId).toHaveBeenCalledWith('sub_legacyMandate');
        expect(mockCreatePayment).toHaveBeenCalledWith(
            expect.objectContaining({
                loanAccountId: 'loan-legacy-1',
                userId: 'user-legacy-1',
                emiId: 'emi-legacy-1',
                mandateId: 'mandate-legacy-1',
            }),
        );
        expect(mockMarkPaymentSuccess).toHaveBeenCalledWith(
            'payment-new-1', null, expect.any(Date), 'pay_LEGACY001',
        );
    });

    test('duplicate webhook delivery: already-SUCCESS payment short-circuits without re-processing', async () => {
        mockFindByGatewayTxnId.mockResolvedValue({
            id: 'payment-1',
            status: PAYMENT_STATUS.SUCCESS,
        });

        const entity = {
            id: 'sub_mandateABC',
            payment_id: 'pay_XYZ123',
            amount: 500000,
            notes: {},
        };

        await paymentsService.processRazorpayWebhook(
            {
                event: 'subscription.charged',
                payload: { subscription: { entity } },
                created_at: Date.now(),
            } as never,
            requestId,
        );

        expect(mockFindLatestPendingByMandateId).not.toHaveBeenCalled();
        expect(mockMarkPaymentSuccess).not.toHaveBeenCalled();
    });
});