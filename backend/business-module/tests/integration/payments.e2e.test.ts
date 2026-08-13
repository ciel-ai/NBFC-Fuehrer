// tests/integration/payments.e2e.test.ts
//
// Integration test for the full eNACH money path:
//   processNachDebit → subscription.charged webhook → EMI PAID
//
// Unlike unit tests (which mock each service in isolation), this test
// exercises two service calls in sequence and uses a stateful payment
// store so the PENDING row written by processNachDebit is visible to
// processRazorpayWebhook via findLatestPendingByMandateId — the exact
// handoff that the webhook handler depends on in production.

// ── Stateful payment store ─────────────────────────────────────────────────────
// Simulates the DB row written by createPayment and read back by
// findLatestPendingByMandateId. Shared state between the two service calls
// is the defining characteristic of an integration test.

let paymentStore: Record<string, unknown> | null = null;

// ── Mock: payments repository ──────────────────────────────────────────────────

const mockCreatePayment           = jest.fn();
const mockFindPaymentByIdOrThrow  = jest.fn();
const mockFindByGatewayTxnId      = jest.fn();
const mockFindLatestPendingByMandateId = jest.fn();
const mockFindExistingEnachDebit  = jest.fn();
const mockMarkPaymentSuccess      = jest.fn();
const mockMarkPaymentFailed       = jest.fn();

jest.mock('@/modules/payments/payments.repository', () => ({
    paymentsRepository: {
        createPayment:                (...a: unknown[]) => mockCreatePayment(...a),
        findPaymentByIdOrThrow:       (...a: unknown[]) => mockFindPaymentByIdOrThrow(...a),
        findByGatewayTxnId:           (...a: unknown[]) => mockFindByGatewayTxnId(...a),
        findLatestPendingByMandateId: (...a: unknown[]) => mockFindLatestPendingByMandateId(...a),
        findExistingEnachDebit:       (...a: unknown[]) => mockFindExistingEnachDebit(...a),
        markPaymentSuccess:           (...a: unknown[]) => mockMarkPaymentSuccess(...a),
        markPaymentFailed:            (...a: unknown[]) => mockMarkPaymentFailed(...a),
        findMandateByRazorpayId:      jest.fn(),
        updateMandateStatus:          jest.fn(),
    },
}));

// ── Mock: EMI module ───────────────────────────────────────────────────────────

const mockEmiMarkPaid         = jest.fn();
const mockFindEmiByIdOrThrow  = jest.fn();

jest.mock('@/modules/emi', () => ({
    emiRepository: {
        findByIdOrThrow:  (...a: unknown[]) => mockFindEmiByIdOrThrow(...a),
        findNextDueEmi:   jest.fn(),
    },
    emiService: {
        markPaid:    (...a: unknown[]) => mockEmiMarkPaid(...a),
        applyBounce: jest.fn(),
    },
}));

// ── Mock: loans module ─────────────────────────────────────────────────────────

const mockFindAccountByIdOrThrow = jest.fn();

jest.mock('@/modules/loans', () => ({
    loansRepository: {
        findAccountByIdOrThrow: (...a: unknown[]) => mockFindAccountByIdOrThrow(...a),
        updateMandateId:        jest.fn(),
        clearMandateId:         jest.fn(),
    },
    loansService: {
        activateLoan: jest.fn(),
    },
}));

// ── Mock: payment provider ─────────────────────────────────────────────────────

const mockDebitMandate = jest.fn();

jest.mock('@/providers', () => ({
    getPaymentProvider: () => ({
        debitMandate:   (...a: unknown[]) => mockDebitMandate(...a),
        createMandate:  jest.fn(),
    }),
}));

// ── Mock: side-effect modules ──────────────────────────────────────────────────

jest.mock('@/modules/payments/payments.events', () => ({
    paymentEvents: { received: jest.fn(), failed: jest.fn(), mandateCreated: jest.fn() },
}));

jest.mock('@/middlewares', () => ({
    setAuditContext: jest.fn(),
}));

jest.mock('@/config/crashReporter', () => ({
    reportError: jest.fn(),
}));

// ── Import service after all mocks are in place ────────────────────────────────

import { paymentsService } from '@/modules/payments/payments.service';
import { PAYMENT_STATUS }  from '@/config/constants';

// ── Test fixtures ──────────────────────────────────────────────────────────────

const LOAN_ACCOUNT_ID      = 'loan-001';
const USER_ID              = 'user-001';
const EMI_ID               = 'emi-001';
const MANDATE_ID           = 'sub_mandateXYZ'; // Razorpay subscription / mandate ID
const RAZORPAY_PAYMENT_ID  = 'pay_ABCDE12345'; // Razorpay payment ID from webhook

const fakeReq = {
    requestId:     'req-integration-001',
    requestLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
    user:          null,
    auditContext:  {},
} as never;

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Integration: mandate → debit → webhook → EMI PAID', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        paymentStore = null;

        // EMI is PENDING, first attempt (bounceCount = 0)
        mockFindEmiByIdOrThrow.mockResolvedValue({
            id:                EMI_ID,
            emiNumber:         3,
            loanAccountId:     LOAN_ACCOUNT_ID,
            status:            'PENDING',
            bounceCount:       0,
            emiAmount:         5000,
            penaltyAmount:     0,
            interestComponent: 1000,
            principalComponent: 4000,
        });

        mockFindAccountByIdOrThrow.mockResolvedValue({
            id:         LOAN_ACCOUNT_ID,
            userId:     USER_ID,
            monthlyEmi: 5000,
        });
    });

    // ── Test 1: full flow ──────────────────────────────────────────────────────

    test('full flow: processNachDebit creates PENDING, webhook marks payment SUCCESS and EMI PAID', async () => {

        // Phase 1 — processNachDebit
        // No prior debit for this EMI + attempt number
        mockFindExistingEnachDebit.mockResolvedValue(null);

        // createPayment writes the row into paymentStore — the shared state
        // that makes this an integration test rather than two unit tests
        mockCreatePayment.mockImplementation(async (data: Record<string, unknown>) => {
            paymentStore = {
                id:              'payment-001',
                loanAccountId:   data.loanAccountId,
                userId:          data.userId,
                emiId:           data.emiId,
                mandateId:       data.mandateId,
                debitAttemptNo:  data.debitAttemptNo,
                amount:          data.amount,
                penaltyAmount:   data.penaltyAmount,
                totalCollected:  (data.amount as number) + (data.penaltyAmount as number),
                channel:         data.channel,
                gateway:         data.gateway,
                status:          PAYMENT_STATUS.PENDING,
                gatewayTxnId:    null,
                utrNumber:       null,
                failureReason:   null,
                failureCode:     null,
                paymentType:     data.paymentType,
                initiatedAt:     new Date(),
                settledAt:       null,
                createdAt:       new Date(),
                updatedAt:       new Date(),
            };
            return paymentStore;
        });

        // Razorpay queues the debit asynchronously — result arrives via webhook
        mockDebitMandate.mockResolvedValue({ status: 'PENDING', paymentId: null });

        // findPaymentByIdOrThrow called at the end of processNachDebit
        mockFindPaymentByIdOrThrow.mockImplementation(async () => paymentStore);

        const debitResult = await paymentsService.processNachDebit(
            {
                emiId:         EMI_ID,
                loanAccountId: LOAN_ACCOUNT_ID,
                mandateId:     MANDATE_ID,
                amount:        5000,
                penaltyAmount: 0,
                description:   'EMI #3 auto-debit',
            },
            fakeReq,
        );

        // PENDING payment created with correct fields
        expect(debitResult.status).toBe(PAYMENT_STATUS.PENDING);
        expect(mockCreatePayment).toHaveBeenCalledWith(
            expect.objectContaining({
                emiId:         EMI_ID,
                loanAccountId: LOAN_ACCOUNT_ID,
                mandateId:     MANDATE_ID,
                amount:        5000,
                penaltyAmount: 0,
                channel:       'ENACH',
                status:        PAYMENT_STATUS.PENDING,
            }),
        );

        // Phase 2 — subscription.charged webhook arrives from Razorpay
        // Idempotency check: this payment_id not yet recorded as SUCCESS
        mockFindByGatewayTxnId.mockResolvedValue(null);

        // findLatestPendingByMandateId reads from paymentStore —
        // this is the key handoff from Phase 1 to Phase 2
        mockFindLatestPendingByMandateId.mockImplementation(async (mandateId: string) => {
            if (mandateId === MANDATE_ID && paymentStore?.status === PAYMENT_STATUS.PENDING) {
                return paymentStore;
            }
            return null;
        });

        mockMarkPaymentSuccess.mockImplementation(async () => {
            if (paymentStore) paymentStore.status = PAYMENT_STATUS.SUCCESS;
        });

        mockEmiMarkPaid.mockResolvedValue(undefined);

        await paymentsService.processRazorpayWebhook(
            {
                event: 'subscription.charged',
                payload: {
                    subscription: {
                        entity: {
                            id:         MANDATE_ID,          // Razorpay mandate ID
                            payment_id: RAZORPAY_PAYMENT_ID, // Razorpay payment ID
                            amount:     500000,              // paise
                            notes:      {},
                        },
                    },
                },
                created_at: Date.now(),
            } as never,
            'req-integration-001',
        );

        // Payment marked SUCCESS with the correct Razorpay payment ID
        expect(mockMarkPaymentSuccess).toHaveBeenCalledWith(
            'payment-001',
            null, // utrNumber — not present in this webhook entity
            expect.any(Date),
            RAZORPAY_PAYMENT_ID,
        );

        // EMI marked PAID — the final outcome of the entire flow
        expect(mockEmiMarkPaid).toHaveBeenCalledWith(
            expect.objectContaining({
                emiId:     EMI_ID,
                channel:   'ENACH',
                paymentId: 'payment-001',
            }),
            expect.objectContaining({ requestId: 'req-integration-001' }),
        );
    });

    // ── Test 2: duplicate webhook ──────────────────────────────────────────────

    test('idempotency: duplicate webhook delivery does not re-process a SUCCESS payment', async () => {

        // Payment already recorded as SUCCESS from a prior webhook delivery
        mockFindByGatewayTxnId.mockResolvedValue({
            id:     'payment-001',
            status: PAYMENT_STATUS.SUCCESS,
        });

        await paymentsService.processRazorpayWebhook(
            {
                event: 'subscription.charged',
                payload: {
                    subscription: {
                        entity: {
                            id:         MANDATE_ID,
                            payment_id: RAZORPAY_PAYMENT_ID,
                            amount:     500000,
                            notes:      {},
                        },
                    },
                },
                created_at: Date.now(),
            } as never,
            'req-integration-002',
        );

        expect(mockMarkPaymentSuccess).not.toHaveBeenCalled();
        expect(mockEmiMarkPaid).not.toHaveBeenCalled();
    });

    // ── Test 3: duplicate debit call ───────────────────────────────────────────

    test('idempotency: calling processNachDebit twice for the same EMI returns the existing record', async () => {

        const existingPayment = {
            id:            'payment-existing',
            emiId:         EMI_ID,
            loanAccountId: LOAN_ACCOUNT_ID,
            status:        PAYMENT_STATUS.PENDING,
            amount:        5000,
            penaltyAmount: 0,
            totalCollected: 5000,
            channel:       'ENACH',
            utrNumber:     null,
            failureReason: null,
            initiatedAt:   new Date(),
            settledAt:     null,
            paymentType:   'EMI',
        };

        // Idempotency guard fires — debit for this EMI + attempt already exists
        mockFindExistingEnachDebit.mockResolvedValue(existingPayment);

        const result = await paymentsService.processNachDebit(
            {
                emiId:         EMI_ID,
                loanAccountId: LOAN_ACCOUNT_ID,
                mandateId:     MANDATE_ID,
                amount:        5000,
                penaltyAmount: 0,
                description:   'EMI #3 auto-debit',
            },
            fakeReq,
        );

        // Returns the existing record without creating a new payment row
        expect(result.id).toBe('payment-existing');
        expect(mockCreatePayment).not.toHaveBeenCalled();
    });
});