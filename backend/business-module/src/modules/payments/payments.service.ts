// src/modules/payments/payments.service.ts
import type { Request } from 'express';
import { Prisma } from '@/generated/prisma-client';
import { paymentsRepository } from './payments.repository';
import { paymentEvents } from './payments.events';
import { emiRepository } from '@/modules/emi';
import { emiService } from '@/modules/emi';
import { loansRepository } from '@/modules/loans';
import { loansService } from '@/modules/loans';
import { getPaymentProvider } from '@/providers';
import { getRedisClient, RedisKeys, RedisTTL } from '@/config/redis';
import {
    PAYMENT_STATUS,
    PAYMENT_CHANNEL,
    AUDIT_ACTION,
    EMI_STATUS,
    BUSINESS_RULES,
    LOAN_STATUS,
} from '@/config/constants';
import type { Rupees } from '@/types/common.types';
import {
    roundRupees,
    toNumber,
    parsePagination,
} from '@/types/common.types';
import { setAuditContext } from '@/middlewares';
import { allocatePartialPayment } from '@/modules/emi/emi.calculator';
import {
    NotFoundError,
    ConflictError,
    EmiAlreadyPaidError,
    PAYMENT_ERRORS,
    CONFLICT_ERRORS,
} from '@/errors';
import { createModuleLogger } from '@/config/logger';
import { reportError } from '@/config/crashReporter';
import type {
    PaymentRecord,
    MandateRecord,
    PaymentResponse,
    MandateResponse,
    PaymentLinkResponse,
    CreateMandateInput,
    ProcessNachDebitInput,
    ManualPaymentLinkInput,
    RecordCashPaymentInput,
    RazorpayWebhookPayload,
    ListPaymentsInput,
} from './payments.types';

const log = createModuleLogger('payments.service');

// ─── Response shapers ──────────────────────────────────────────────────────────

function toPaymentResponse(p: PaymentRecord): PaymentResponse {
    return {
        id: p.id,
        loanAccountId: p.loanAccountId,
        emiId: p.emiId,
        paymentType: p.paymentType,
        amount: p.amount,
        penaltyAmount: p.penaltyAmount,
        totalCollected: p.totalCollected,
        channel: p.channel,
        status: p.status,
        utrNumber: p.utrNumber,
        failureReason: p.failureReason,
        initiatedAt: p.initiatedAt,
        settledAt: p.settledAt,
    };
}

function toMandateResponse(m: MandateRecord): MandateResponse {
    return {
        id: m.id,
        loanAccountId: m.loanAccountId,
        razorpayMandateId: m.razorpayMandateId,
        bankAccount: m.bankAccount,
        status: m.status,
        maxAmount: m.maxAmount,
        registeredAt: m.registeredAt,
    };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const paymentsService = {

    // ── Pre-disbursement mandate creation (Gold Loan) ──────────────────────────
    // Creates a real NACH mandate against the application, before the loan
    // account exists — needed because Gold Loan's business flow requires
    // NACH setup before disbursement, unlike CDL (which sets it up after
    // activation, see createMandate below). At disbursement time,
    // disbursementService links this mandate to the newly created account.

    async createMandateForApplication(input: {
        applicationId: string;
        userId: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        bankAccount: string;
        ifsc: string;
        maxAmount: Rupees;
    }, req: Request): Promise<MandateResponse> {
        const existing = await paymentsRepository.findMandateByApplicationId(input.applicationId);
        if (existing) {
            throw CONFLICT_ERRORS.mandateAlreadyActive(input.applicationId);
        }

        const provider = getPaymentProvider();

        const result = await provider.createMandate({
            customerId: input.userId,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            bankAccount: input.bankAccount,
            ifsc: input.ifsc,
            maxAmount: input.maxAmount,
            loanAccountId: input.applicationId, // Reference label only — Razorpay doesn't validate this against our DB.
        });

        const maskedAccount = input.bankAccount.slice(-4).padStart(
            input.bankAccount.length, 'X',
        );

        const mandate = await paymentsRepository.createMandateForApplication({
            applicationId: input.applicationId,
            userId: input.userId,
            razorpayMandateId: result.mandateId,
            bankAccount: maskedAccount,
            ifsc: input.ifsc,
            maxAmount: input.maxAmount,
        });

        setAuditContext(req, {
            action: 'MANDATE_CREATED',
            entityType: 'enach_mandates',
            entityId: mandate.id,
        });

        return mandate as unknown as MandateResponse;
    },

    // ── 1. Create eNACH mandate ────────────────────────────────────────────────
    // Called after loan is activated (DISBURSED → ACTIVE).
    // Customer registers their bank account for monthly auto-debit.

    async createMandate(
        input: CreateMandateInput,
        req: Request,
    ): Promise<MandateResponse> {
        const { loanAccountId, userId } = input;

        // Prevent duplicate active mandates
        const existing = await paymentsRepository.findMandateByLoanAccountId(
            loanAccountId,
        );
        if (existing) {
            throw CONFLICT_ERRORS.mandateAlreadyActive(loanAccountId);
        }

        const account = await loansRepository.findAccountByIdOrThrow(loanAccountId);

        const provider = getPaymentProvider();

        // Max debit = EMI + max possible penalty (3 bounces at the configured
        // rate). Previously this was computed twice with two different
        // formulas — once here for the provider call, and again with an
        // unrelated `monthlyEmi * 2` when storing the mandate — meaning our
        // own DB record of the mandate's ceiling never matched what was
        // actually registered with Razorpay. Compute once, reuse both places.
        const mandateMaxAmount = roundRupees(
            account.monthlyEmi * (1 + BUSINESS_RULES.EMI_BOUNCE_PENALTY_RATE * 3),
        );

        const result = await provider.createMandate({
            customerId: userId,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            bankAccount: input.bankAccount,
            ifsc: input.ifsc,
            maxAmount: mandateMaxAmount,
            loanAccountId,
        });

        // Mask account number for storage — never store full account in mandate table
        const maskedAccount = input.bankAccount.slice(-4).padStart(
            input.bankAccount.length, 'X',
        );

        const mandate = await paymentsRepository.createMandate({
            loanAccountId,
            userId,
            razorpayMandateId: result.mandateId,
            bankAccount: maskedAccount,
            ifsc: input.ifsc,
            maxAmount: mandateMaxAmount,
        });

        // Update loan account with mandate ID
        await loansRepository.updateMandateId(loanAccountId, result.mandateId);

        setAuditContext(req, {
            action: 'MANDATE_CREATED',
            entityType: 'enach_mandates',
            entityId: mandate.id,
        });

        paymentEvents.mandateCreated({
            loanAccountId,
            userId,
            mandateId: result.mandateId,
            bankAccount: maskedAccount,
            requestId: req.requestId,
        });

        log.info('eNACH mandate created', {
            mandateId: mandate.id,
            loanAccountId,
            razorpayId: result.mandateId,
        });

        return toMandateResponse(mandate);
    },

    // ── 2. Process eNACH debit ─────────────────────────────────────────────────
    // Called by the nachDebit.job cron every morning.
    // Attempts to debit the customer's registered bank account.

    async processNachDebit(
        input: ProcessNachDebitInput,
        req: Request,
    ): Promise<PaymentResponse> {
        const { emiId, loanAccountId, mandateId, amount, penaltyAmount } = input;

        const emi = await emiRepository.findByIdOrThrow(emiId);
        const loanAccount = await loansRepository.findAccountByIdOrThrow(emi.loanAccountId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }

        const debitAttemptNo = emi.bounceCount + 1;

        // Idempotency guard: if this attempt was already initiated, return the existing record.
        // Protects against cron misfires, network retries, and duplicate job executions.
        const existingDebit = await paymentsRepository.findExistingEnachDebit(emiId, debitAttemptNo);
        if (existingDebit) {
            log.info('NACH debit already initiated for this EMI and attempt — returning existing record', {
                paymentId: existingDebit.id,
                emiId,
                debitAttemptNo,
            });
            return toPaymentResponse(existingDebit);
        }

        const totalDebit = roundRupees(amount + penaltyAmount);

        // Write PENDING payment record before calling gateway
        let payment: PaymentRecord;
        try {
            payment = await paymentsRepository.createPayment({
                loanAccountId,
                userId: loanAccount.userId,
                emiId,
                paymentType: 'EMI',
                amount,
                penaltyAmount,
                channel: PAYMENT_CHANNEL.ENACH,
                gateway: 'razorpay',
                mandateId,
                debitAttemptNo,
                status: PAYMENT_STATUS.PENDING,
            });
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                log.info('NACH debit race condition — concurrent call already created the record', { emiId, debitAttemptNo });
                const raceDebit = await paymentsRepository.findExistingEnachDebit(emiId, debitAttemptNo);
                if (raceDebit) return toPaymentResponse(raceDebit);
            }
            throw err;
        }

        const provider = getPaymentProvider();

        try {
            const result = await provider.debitMandate({
                mandateId,
                amount: totalDebit,
                emiId,
                description: input.description,
            });

            if (result.status === 'SUCCESS') {
                await paymentsRepository.markPaymentSuccess(
                    payment.id, null, new Date(),
                );
                // EMI marked paid via webhook — not here
                // Prevents marking paid before bank confirms
                log.info('NACH debit initiated successfully', {
                    paymentId: payment.id,
                    emiId,
                    amount: totalDebit,
                    razorpayId: result.paymentId,
                });
            }

            return toPaymentResponse(
                await paymentsRepository.findPaymentByIdOrThrow(payment.id),
            );

        } catch (err) {
            await paymentsRepository.markPaymentFailed(
                payment.id,
                (err as Error).message,
            );

            await emiService.applyBounce(emiId, (err as Error).message, req);

            throw err;
        }
    },

    // ── 3. Create manual payment link ─────────────────────────────────────────
    // For overdue EMIs where eNACH has exhausted retries.
    // Sends an SMS/WhatsApp link to the customer.

    async createPaymentLink(
        input: ManualPaymentLinkInput,
        req: Request,
    ): Promise<PaymentLinkResponse> {
        const emi = await emiRepository.findByIdOrThrow(input.emiId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }

        const totalAmount = roundRupees(
            toNumber(emi.emiAmount) + toNumber(emi.penaltyAmount),
        );

        const provider = getPaymentProvider();

        const result = await provider.createPaymentLink({
            customerId: input.userId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            amount: totalAmount,
            emiId: input.emiId,
            description: input.description,
            expiryMinutes: input.expiryMinutes,
        });

        log.info('Payment link created', {
            emiId: input.emiId,
            linkId: result.linkId,
            amount: totalAmount,
            expiresAt: result.expiresAt,
        });

        return {
            linkId: result.linkId,
            shortUrl: result.shortUrl,
            amount: totalAmount,
            expiresAt: result.expiresAt,
        };
    },

    // ── 4. Record cash / field collection payment ──────────────────────────────
    // Collection agents log offline payments (cash / UPI from customer).
    // No gateway involved — manual entry with collection case reference.

    async recordCashPayment(
        input: RecordCashPaymentInput,
        req: Request,
    ): Promise<PaymentResponse> {
        const { loanAccountId, userId, emiId, amount, collectedBy, collectionId } =
            input;

        const emi = await emiRepository.findByIdOrThrow(emiId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }

        // Allocate payment: penalty first, then interest, then principal
        const allocation = allocatePartialPayment({
            paymentAmount: amount,
            penaltyDue: toNumber(emi.penaltyAmount),
            interestDue: toNumber(emi.interestComponent),
            principalDue: toNumber(emi.principalComponent),
        });

        const payment = await paymentsRepository.createPayment({
            loanAccountId,
            userId,
            emiId,
            paymentType: 'EMI',
            amount,
            penaltyAmount: allocation.penaltySettled,
            channel: PAYMENT_CHANNEL.CASH,
            gateway: 'manual',
            debitAttemptNo: 1,
            status: PAYMENT_STATUS.SUCCESS,
        });

        await paymentsRepository.markPaymentSuccess(payment.id, null, new Date());

        // Mark EMI paid with collection reference
        await emiService.markPaid(
            {
                emiId,
                paidAmount: amount,
                paidAt: new Date(),
                channel: 'CASH',
                collectionId,
                paymentId: payment.id,
            },
            req,
        );

        setAuditContext(req, {
            action: AUDIT_ACTION.PAYMENT_SUCCESS,
            entityType: 'payments',
            entityId: payment.id,
            after: {
                emiId,
                amount,
                channel: PAYMENT_CHANNEL.CASH,
                collectedBy,
                collectionId,
            },
        });

        paymentEvents.received({
            paymentId: payment.id,
            loanAccountId,
            userId,
            emiId,
            emiNumber: emi.emiNumber,
            amount,
            channel: PAYMENT_CHANNEL.CASH,
            gatewayTxnId: collectionId,
            paidAt: new Date(),
            requestId: req.requestId,
        });

        log.info('Cash payment recorded', {
            paymentId: payment.id,
            emiId,
            amount,
            collectedBy,
        });

        return toPaymentResponse(
            await paymentsRepository.findPaymentByIdOrThrow(payment.id),
        );
    },

    // ── 5. Process Razorpay webhook ────────────────────────────────────────────
    // Central webhook handler — called by webhooks module after signature
    // verification and idempotency check.
    // All payment events from Razorpay funnel through here.

    async processRazorpayWebhook(
        payload: RazorpayWebhookPayload,
        requestId: string,
    ): Promise<void> {
        const { event } = payload;

        log.info('Processing Razorpay webhook', { event, requestId });

        switch (event) {

            // ── Payment captured (manual link / UPI) ─────────────────────────────
            case 'payment.captured': {
                const entity = payload.payload.payment?.entity;
                if (!entity) return;
                await this._handlePaymentCaptured(entity as unknown as Record<string, unknown>, requestId);
                break;
            }

            // ── Payment failed ────────────────────────────────────────────────────
            case 'payment.failed': {
                const entity = payload.payload.payment?.entity;
                if (!entity) return;
                await this._handlePaymentFailed(entity as unknown as Record<string, unknown>, requestId);
                break;
            }

            // ── eNACH debit confirmed ─────────────────────────────────────────────
            case 'subscription.charged': {
                const entity = payload.payload.subscription?.entity;
                if (!entity) return;
                await this._handleNachCharged(
                    entity as Record<string, unknown>, requestId,
                );
                break;
            }

            // ── Mandate registered ────────────────────────────────────────────────
            case 'subscription.activated':
            case 'mandate.confirmed': {
                await this._handleMandateActivated(payload, requestId);
                break;
            }

            // ── Mandate cancelled ─────────────────────────────────────────────────
            case 'mandate.cancelled': {
                await this._handleMandateCancelled(payload, requestId);
                break;
            }

            default:
                log.debug('Unhandled Razorpay webhook event', { event });
        }
    },

    // ── Internal webhook handlers ──────────────────────────────────────────────

    async _handlePaymentCaptured(
        entity: Record<string, unknown>,
        requestId: string,
    ): Promise<void> {
        const gatewayTxnId = entity.id as string;

        // Idempotency check — Redis first, then DB fallback
        const redis = getRedisClient();
        const lockKey = RedisKeys.webhookProcessed(gatewayTxnId);
        const alreadyDone = await redis.get(lockKey);
        if (alreadyDone) {
            log.info('Webhook already processed (Redis cache)', { gatewayTxnId });
            return;
        }

        // DB idempotency check
        const existing = await paymentsRepository.findByGatewayTxnId(gatewayTxnId);
        if (existing?.status === PAYMENT_STATUS.SUCCESS) {
            await redis.setex(lockKey, RedisTTL.WEBHOOK_PROCESSED, '1');
            log.info('Webhook already processed (DB)', { gatewayTxnId });
            return;
        }

        // Extract EMI ID from Razorpay notes (set when creating the payment link)
        const emiId = (entity.notes as Record<string, string>)?.emiId;
        if (!emiId) {
            log.warn('Payment captured but no emiId in notes', { gatewayTxnId });
            return;
        }

        const emi = await emiRepository.findByIdOrThrow(emiId);
        if (emi.status === EMI_STATUS.PAID) {
            await redis.setex(lockKey, RedisTTL.WEBHOOK_PROCESSED, '1');
            return;
        }

        const amountRupees = roundRupees(
            toNumber(entity.amount as number) / 100,
        );
        const utrNumber = (entity.acquirer_data as Record<string, string>)?.rrn
            ?? null;

        // Resolve the real userId from the loan account — previously
        // hardcoded to an empty string with a comment claiming it would be
        // "resolved from EMI → loan account", but no resolution code
        // actually existed. Every real webhook-driven payment creation
        // failed with a Postgres UUID-parsing error on this empty string,
        // discovered while testing the race-condition fix below (both
        // concurrent test calls failed for this unrelated reason).
        const loanAccount = await loansRepository.findAccountByIdOrThrow(emi.loanAccountId);

        // Find or create the payment record. gateway_txn_id now has a real
        // unique constraint at the DB level (previously indexed but not
        // unique) — this is the actual atomic backstop against duplicate
        // webhook delivery, not the Redis/DB checks above, which are a
        // classic check-then-act race: two concurrent deliveries for the
        // same transaction could both pass those checks before either
        // commits. If a concurrent caller wins that race and creates the
        // row first, this insert fails with a real Postgres unique
        // violation (P2002) — caught here and treated as "already
        // processed" rather than crashing or silently creating a
        // duplicate.
        let payment = existing;
        if (!payment) {
            try {
                payment = await paymentsRepository.createPayment({
                    loanAccountId: emi.loanAccountId,
                    userId: loanAccount.userId,
                    emiId,
                    paymentType: 'EMI',
                    amount: amountRupees,
                    penaltyAmount: 0,
                    channel: PAYMENT_CHANNEL.PAYMENT_LINK,
                    gateway: 'razorpay',
                    gatewayTxnId,
                    debitAttemptNo: 1,
                    status: PAYMENT_STATUS.PENDING,
                });
            } catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                    log.info('Payment already created by a concurrent webhook delivery — treating as already processed', { gatewayTxnId });
                    await redis.setex(lockKey, RedisTTL.WEBHOOK_PROCESSED, '1');
                    return;
                }
                throw err;
            }
        }

        // Mark payment successful
        await paymentsRepository.markPaymentSuccess(
            payment.id, utrNumber, new Date(),
        );

        // Mark EMI paid
        await emiService.markPaid(
            {
                emiId,
                paidAmount: amountRupees,
                paidAt: new Date(),
                channel: PAYMENT_CHANNEL.PAYMENT_LINK,
                paymentId: payment.id,
            },
            { requestId } as unknown as Request,
        );

        // Cache processed status
        await redis.setex(lockKey, RedisTTL.WEBHOOK_PROCESSED, '1');

        // Resolve userId for event
        const account = await loansRepository.findAccountByIdOrThrow(
            emi.loanAccountId,
        );

        paymentEvents.received({
            paymentId: payment.id,
            loanAccountId: emi.loanAccountId,
            userId: account.userId,
            emiId,
            emiNumber: emi.emiNumber,
            amount: amountRupees,
            channel: PAYMENT_CHANNEL.PAYMENT_LINK,
            gatewayTxnId,
            paidAt: new Date(),
            requestId,
        });

        log.info('Payment captured and EMI marked paid', {
            gatewayTxnId,
            emiId,
            amount: amountRupees,
        });
    },

    async _handlePaymentFailed(
        entity: Record<string, unknown>,
        requestId: string,
    ): Promise<void> {
        const gatewayTxnId = entity.id as string;

        const existing = await paymentsRepository.findByGatewayTxnId(gatewayTxnId);
        if (!existing || existing.status === PAYMENT_STATUS.FAILED) return;

        await paymentsRepository.markPaymentFailed(
            existing.id,
            entity.error_description as string ?? 'Payment failed',
            entity.error_code as string ?? undefined,
        );

        const emiId = (entity.notes as Record<string, string>)?.emiId;
        if (!emiId) return;

        const emi = await emiRepository.findByIdOrThrow(emiId);
        const account = await loansRepository.findAccountByIdOrThrow(
            emi.loanAccountId,
        );

        paymentEvents.failed({
            paymentId: existing.id,
            loanAccountId: emi.loanAccountId,
            userId: account.userId,
            emiId,
            emiNumber: emi.emiNumber,
            amount: toNumber(emi.emiAmount),
            reason: entity.error_description as string ?? 'Unknown failure',
            gatewayCode: entity.error_code as string ?? null,
            requestId,
        });
    },

    async _handleNachCharged(
        entity: Record<string, unknown>,
        requestId: string,
    ): Promise<void> {
        // Razorpay subscription.charged → eNACH debit succeeded
        const razorpayPaymentId = entity.payment_id as string;
        if (!razorpayPaymentId) return;

        // Idempotency guard — if this exact gateway payment id was already
        // recorded as SUCCESS, this is a duplicate webhook delivery.
        const alreadyRecorded = await paymentsRepository.findByGatewayTxnId(
            razorpayPaymentId,
        );
        if (alreadyRecorded && alreadyRecorded.status === PAYMENT_STATUS.SUCCESS) {
            return;
        }

        const utrNumber = (entity as Record<string, Record<string, string>>)
            .acquirer_data?.rrn ?? null;

        // The subscription entity's own id IS the Razorpay mandate id —
        // same field _handleMandateActivated/_handleMandateCancelled read.
        const mandateRazorpayId = entity.id as string | undefined;

        let payment: PaymentRecord | null = alreadyRecorded;

        if (!payment && mandateRazorpayId) {
            // Normal case: our own nachDebit cron already wrote a PENDING
            // row via processNachDebit before calling the gateway. Find it
            // by mandate, since gateway_txn_id wasn't known until now.
            payment = await paymentsRepository.findLatestPendingByMandateId(
                mandateRazorpayId,
            );
        }

        let emiIdForPayment: string | null = payment?.emiId ?? null;
        let mandate: MandateRecord | null = null;

        if (!payment) {
            // No local PENDING row exists at all — this happens for the
            // migrated eNACH mandates, whose debits were not initiated by
            // this system's own processNachDebit. Previously this handler
            // returned here and silently dropped a real, successful debit.
            if (!mandateRazorpayId) {
                log.warn('NACH charge webhook with no mandate reference — cannot reconcile', {
                    razorpayPaymentId,
                });
                return;
            }

            mandate = await paymentsRepository.findMandateByRazorpayId(mandateRazorpayId);
            if (!mandate) {
                log.warn('NACH charge webhook for unknown mandate', {
                    razorpayPaymentId,
                    mandateRazorpayId,
                });
                return;
            }

            const notesEmiId = (entity.notes as Record<string, string> | undefined)?.emiId;
            const targetEmi = notesEmiId
                ? await emiRepository.findByIdOrThrow(notesEmiId)
                : await emiRepository.findNextDueEmi(mandate.loanAccountId);

            if (!targetEmi) {
                log.warn('NACH charge webhook for migrated mandate but no due EMI found', {
                    razorpayPaymentId,
                    mandateId: mandate.id,
                });
                return;
            }

            const amountRupees = roundRupees(
                toNumber(entity.amount as number) / 100,
            );

            payment = await paymentsRepository.createPayment({
                loanAccountId: mandate.loanAccountId,
                userId: mandate.userId,
                emiId: targetEmi.id,
                paymentType: 'EMI',
                amount: amountRupees || toNumber(targetEmi.emiAmount),
                penaltyAmount: 0,
                channel: PAYMENT_CHANNEL.ENACH,
                gateway: 'razorpay',
                mandateId: mandate.id,
                debitAttemptNo: 1,
                status: PAYMENT_STATUS.PENDING,
            });
            emiIdForPayment = targetEmi.id;

            log.info('Created payment record for migrated mandate on first webhook', {
                paymentId: payment.id,
                mandateId: mandate.id,
                emiId: targetEmi.id,
            });
        }

        await paymentsRepository.markPaymentSuccess(
            payment.id, utrNumber, new Date(), razorpayPaymentId,
        );

        if (emiIdForPayment) {
            const emi = await emiRepository.findByIdOrThrow(emiIdForPayment);
            const account = await loansRepository.findAccountByIdOrThrow(
                payment.loanAccountId,
            );

            await emiService.markPaid(
                {
                    emiId: emiIdForPayment,
                    paidAmount: payment.totalCollected,
                    paidAt: new Date(),
                    channel: PAYMENT_CHANNEL.ENACH,
                    paymentId: payment.id,
                },
                { requestId } as unknown as Request,
            );

            paymentEvents.received({
                paymentId: payment.id,
                loanAccountId: payment.loanAccountId,
                userId: account.userId,
                emiId: emiIdForPayment,
                emiNumber: emi.emiNumber,
                amount: payment.amount,
                channel: PAYMENT_CHANNEL.ENACH,
                gatewayTxnId: razorpayPaymentId,
                paidAt: new Date(),
                requestId,
            });
        }

        log.info('NACH debit confirmed', {
            paymentId: payment.id,
            emiId: emiIdForPayment,
            utrNumber,
        });
    },

    async _handleMandateActivated(
        payload: RazorpayWebhookPayload,
        requestId: string,
    ): Promise<void> {
        const mandateId = (
            payload.payload.subscription?.entity as Record<string, string>
        )?.id;
        if (!mandateId) return;

        const mandate = await paymentsRepository.findMandateByRazorpayId(mandateId);
        if (!mandate) {
            // Cannot safely fabricate a mandate record here — bank_account,
            // ifsc, maxAmount and loanAccountId aren't present in this
            // webhook payload. Previously this was a log.warn nobody would
            // ever see; a mandate activating with no local row to update
            // (e.g. a migrated mandate whose row hasn't landed yet, or a
            // genuine race with mandate creation) needs a human to notice
            // and reconcile it, not a debug line.
            reportError(
                new Error('Mandate activation webhook for unknown mandate'),
                { mandateId, requestId, event: 'subscription.activated/mandate.confirmed' },
            );
            return;
        }

        await paymentsRepository.updateMandateStatus(
            mandate.id,
            'ACTIVE',
            { registered_at: new Date() },
        );

        // Activate the loan account
        await loansService.activateLoan(
            mandate.loanAccountId,
            mandateId,
            { requestId } as unknown as Request,
        );

        log.info('eNACH mandate activated', {
            mandateId: mandate.id,
            loanAccountId: mandate.loanAccountId,
        });
    },

    async _handleMandateCancelled(
        payload: RazorpayWebhookPayload,
        requestId: string,
    ): Promise<void> {
        const mandateId = (
            payload.payload.subscription?.entity as Record<string, string>
        )?.id;
        if (!mandateId) return;

        const mandate = await paymentsRepository.findMandateByRazorpayId(mandateId);
        if (!mandate) {
            // A cancellation for a mandate we have no local record of is
            // arguably worse than a missed activation: the bank has killed
            // the standing instruction, and if we never learn about it, the
            // next debit attempt against it will simply fail at the gateway
            // with no advance warning. Surface it the same way as above.
            reportError(
                new Error('Mandate cancellation webhook for unknown mandate'),
                { mandateId, requestId, event: 'mandate.cancelled' },
            );
            return;
        }

        await paymentsRepository.updateMandateStatus(
            mandate.id,
            'CANCELLED',
            { cancelled_at: new Date() },
        );

        // Keep loan_accounts.razorpay_mandate_id in sync — the debit crons
        // read that denormalized field directly, not this table, so it must
        // be cleared here or they'll keep targeting a dead mandate.
        if (mandate.loanAccountId) {
            await loansRepository.clearMandateId(mandate.loanAccountId);
        }

        log.warn('eNACH mandate cancelled', {
            mandateId: mandate.id,
            loanAccountId: mandate.loanAccountId,
        });
    },

    // ── 6. Get payments for a loan account ────────────────────────────────────

    async listPayments(input: ListPaymentsInput) {
        return paymentsRepository.listPayments(input);
    },

    async getPayment(paymentId: string): Promise<PaymentResponse> {
        const p = await paymentsRepository.findPaymentByIdOrThrow(paymentId);
        return toPaymentResponse(p);
    },

    async getMandateForAccount(
        loanAccountId: string,
    ): Promise<MandateResponse | null> {
        const m = await paymentsRepository.findMandateByLoanAccountId(
            loanAccountId,
        );
        return m ? toMandateResponse(m) : null;
    },
};
