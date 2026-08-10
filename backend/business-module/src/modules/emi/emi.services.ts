// src/modules/emi/emi.service.ts
import type { Request } from 'express';
import { emiRepository } from './emi.repository';
import { loansRepository } from '@/modules/loans';
import { prisma } from '@/config/database';
import {
    buildAmortizationSchedule,
    computeMonthlyEmi,
    computeDailyOverduePenalty,
    computeTieredOverduePenalty,
    computeBouncePenalty,
    computeForeclosureAmount,
    allocatePartialPayment,
} from './emi.calculator';

import { eventBus } from '@/events';
import { accountingService } from '@/modules/accounting/accounting.service';
import { setAuditContext } from '@/middlewares';
import {
    EMI_STATUS,
    BUSINESS_RULES,
    AUDIT_ACTION,
} from '@/config/constants';
import {
    roundRupees,
    daysBetween,
    toNumber,
} from '@/types/common.types';
import {
    NotFoundError,
    ConflictError,
    DomainError,
    EmiAlreadyPaidError,
} from '@/errors';
import { createModuleLogger } from '@/config/logger';

import type {
    EmiScheduleEntry,
    AmortizationSchedule,
    EmiScheduleSummary,
    ListEmiScheduleInput,
    MarkEmiPaidInput,
    WaiveEmiInput,
    OverdueEmiResult,
    EmiReminderTarget,
    NachDebitTarget,
} from './emi.types';

const log = createModuleLogger('emi.service');

export const emiService = {

    // ── 1. Generate and persist schedule at disbursement ─────────────────────
    // Called once per loan at the moment of disbursement.
    // Returns the schedule for immediate use by the disbursement module.

    async createSchedule(params: {
        loanAccountId: string;
        principal: number;
        annualRatePct: number;
        tenureMonths: number;
        disbursementDate: Date;
    }): Promise<AmortizationSchedule> {
        // Build the full schedule in memory — pure calculation, no DB
        const schedule = buildAmortizationSchedule({
            loanAccountId: params.loanAccountId,
            principal: params.principal,
            annualRatePct: params.annualRatePct,
            tenureMonths: params.tenureMonths,
            disbursementDate: params.disbursementDate,
        });

        // Persist atomically — all entries or none
        await emiRepository.createSchedule(schedule);

        log.info('EMI schedule persisted', {
            loanAccountId: params.loanAccountId,
            tenure: params.tenureMonths,
            monthlyEmi: schedule.monthlyEmi,
            firstEmiDate: schedule.firstEmiDate,
            totalPayable: schedule.totalPayable,
        });

        return schedule;
    },

    // ── 2. Get full schedule ──────────────────────────────────────────────────

    async getSchedule(
        input: ListEmiScheduleInput,
    ): Promise<EmiScheduleEntry[]> {
        return emiRepository.findByLoanAccountId(input);
    },

    // ── 3. Get summary ────────────────────────────────────────────────────────

    async getSummary(loanAccountId: string): Promise<EmiScheduleSummary> {
        return emiRepository.getSummary(loanAccountId);
    },

    // ── 4. Get single EMI ─────────────────────────────────────────────────────

    async getEmi(emiId: string): Promise<EmiScheduleEntry> {
        return emiRepository.findByIdOrThrow(emiId);
    },

    // ── 5. Mark EMI as paid ───────────────────────────────────────────────────
    // Called by payments.service on successful payment capture.
    // Also called by collections module for cash/UPI collections.
    //
    // Previously: any nonzero paidAmount, however small, unconditionally
    // set status: PAID via emiRepository.markPaid — a ₹1 payment against a
    // ₹5,000 EMI marked it fully paid, silently forgiving the principal/
    // interest shortfall (only the penalty component had a residual-
    // tracking mechanism). That cascaded into getSummary's
    // totalOutstanding (which sums by status), so a systematically
    // underpaid loan could show ₹0 outstanding and pass closeLoan's
    // balance gate, generating a real NOC for a loan that was never
    // actually repaid. allocatePartialPayment was already computing the
    // correct penalty/interest/principal/shortfall/fullySettled split —
    // every field except penaltySettled was being discarded.
    //
    // Now branches on allocation.fullySettled: full settlement behaves
    // exactly as before (status PAID, full GL posting). An insufficient
    // payment instead records a REAL partial settlement — remaining
    // amounts decremented by exactly what was collected, status PARTIAL
    // (an EMI_STATUS value that already existed in the schema/enum but
    // was never actually used anywhere), and GL entries posted only for
    // what actually moved this time, not the full scheduled split.

    async markPaid(
        input: MarkEmiPaidInput,
        req: Request,
    ): Promise<EmiScheduleEntry> {
        const emi = await emiRepository.findByIdOrThrow(input.emiId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }
        if (emi.status === EMI_STATUS.WAIVED) {
            throw new ConflictError(
                `EMI #${emi.emiNumber} has been waived and cannot be marked paid`,
            );
        }

        const allocation = allocatePartialPayment({
            paymentAmount: input.paidAmount,
            penaltyDue: emi.penaltyAmount,
            interestDue: emi.interestComponent,
            principalDue: emi.principalComponent,
        });

        // Resolve the real userId for the payment.received event —
        // previously hardcoded to an empty string with a comment claiming
        // "resolved by payments module", but nothing downstream ever
        // resolved it.
        const loanAccount = await loansRepository.findAccountByIdOrThrow(emi.loanAccountId);

        // productType isn't denormalized onto loan_accounts — same lookup
        // pattern already used in applyOverduePenalty below.
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: loanAccount.applicationId },
            select: { product_type: true },
        });

        let updated: EmiScheduleEntry;

        if (allocation.fullySettled) {
            updated = await emiRepository.markPaid(
                emi.id,
                input.paidAt,
                input.collectionId,
                0, // fully settled — no residual penalty left
            );

            // Post the GL entries for this collection. Previously only
            // postDisbursement() was ever called from a live code path —
            // postEmiCollection() existed but nothing invoked it, so
            // every recurring EMI collection created zero ledger entries.
            // Uses the EMI's stored principal/interest split, the
            // authoritative full-settlement split.
            await accountingService.postEmiCollection({
                paymentId:   input.paymentId ?? emi.id,
                productType: application.product_type,
                principal:   emi.principalComponent,
                interest:    emi.interestComponent,
                postedBy:    'system:emi-collection',
            });

            setAuditContext(req, {
                action: AUDIT_ACTION.EMI_PAID,
                entityType: 'emi_schedule',
                entityId: emi.id,
                before: { status: emi.status, penaltyAmount: emi.penaltyAmount },
                after: { status: EMI_STATUS.PAID, paidAt: input.paidAt },
            });

            log.info('EMI marked paid', {
                emiId: emi.id,
                emiNumber: emi.emiNumber,
                loanAccountId: emi.loanAccountId,
                channel: input.channel,
            });
        } else {
            updated = await emiRepository.recordPartialPayment(
                emi.id,
                input.collectionId,
                {
                    penaltySettled: allocation.penaltySettled,
                    interestSettled: allocation.interestSettled,
                    principalSettled: allocation.principalSettled,
                },
            );

            // Only post GL entries for what was actually collected this
            // time — postEmiCollection already no-ops on a 0 amount for
            // either leg, so passing the real settled figures (not the
            // full scheduled split) is safe even when one leg is 0.
            await accountingService.postEmiCollection({
                paymentId:   input.paymentId ?? emi.id,
                productType: application.product_type,
                principal:   allocation.principalSettled,
                interest:    allocation.interestSettled,
                postedBy:    'system:emi-collection',
            });

            setAuditContext(req, {
                action: AUDIT_ACTION.EMI_PARTIALLY_PAID,
                entityType: 'emi_schedule',
                entityId: emi.id,
                before: { status: emi.status, penaltyAmount: emi.penaltyAmount },
                after: { status: EMI_STATUS.PARTIAL, shortfall: allocation.shortfall },
            });

            log.warn('EMI partially paid — shortfall remains', {
                emiId: emi.id,
                emiNumber: emi.emiNumber,
                loanAccountId: emi.loanAccountId,
                channel: input.channel,
                paidAmount: input.paidAmount,
                shortfall: allocation.shortfall,
            });
        }

        // Emit payment.received either way — real money moved even on a
        // partial payment. Loan-closure handlers already key off the
        // account's actual outstanding balance, not this event alone.
        eventBus.emit('payment.received', {
            paymentId: input.emiId,   // Placeholder; real paymentId from payments module
            loanAccountId: emi.loanAccountId,
            userId: loanAccount.userId,
            emiId: emi.id,
            emiNumber: emi.emiNumber,
            amount: input.paidAmount,
            channel: input.channel,
            gatewayTxnId: '',
            paidAt: input.paidAt,
            requestId: req.requestId,
        });

        return updated;
    },

    // ── 6. Apply bounce ───────────────────────────────────────────────────────
    // Called by payments.service when eNACH debit fails.

    async applyBounce(
        emiId: string,
        bounceReason: string,
        req: Request,
    ): Promise<EmiScheduleEntry> {
        const emi = await emiRepository.findByIdOrThrow(emiId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }

        // Bounce penalty
        const bouncePenalty = computeBouncePenalty(
            emi.emiAmount,
            BUSINESS_RULES.EMI_BOUNCE_PENALTY_RATE * 100, // convert 0.02 → 2
        );

        // Add to existing penalty
        await emiRepository.incrementPenalty(emiId, Math.round(bouncePenalty * 100));

        // Calculate next retry date
        const newBounceCount = emi.bounceCount + 1;
        const nextRetryAt = newBounceCount < BUSINESS_RULES.ENACH_RETRY_LIMIT
            ? new Date(
                Date.now() +
                BUSINESS_RULES.ENACH_RETRY_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
            )
            : null; // No more retries

        const updated = await emiRepository.markBounced(emiId, nextRetryAt);

        eventBus.emit('emi.bounced', {
            loanAccountId: emi.loanAccountId,
            userId: '', // Resolved by payments module
            emiId: emi.id,
            emiNumber: emi.emiNumber,
            amount: emi.emiAmount,
            bounceReason,
            retryCount: newBounceCount,
            nextRetryAt,
        });

        log.warn('EMI bounce applied', {
            emiId,
            emiNumber: emi.emiNumber,
            bounceCount: newBounceCount,
            bouncePenalty,
            nextRetryAt,
        });

        return updated;
    },

    // ── 7. Apply daily overdue penalty ────────────────────────────────────────
    // Called by npaWatch.job for each overdue EMI each day.

    async applyOverduePenalty(emiId: string): Promise<void> {
    const emi = await emiRepository.findByIdOrThrow(emiId);

    if (
        emi.status === EMI_STATUS.PAID ||
        emi.status === EMI_STATUS.WAIVED
    ) return;

    const account = await loansRepository.findAccountByIdOrThrow(emi.loanAccountId);
    const application = await prisma.loan_applications.findUniqueOrThrow({
        where: { id: account.applicationId },
        select: { product_type: true },
    });

    let dailyPenalty: number;

    if (application.product_type === 'GOLD_LOAN') {
        const daysOverdue = daysBetween(emi.dueDate, new Date());
        dailyPenalty = computeTieredOverduePenalty(
            emi.emiAmount,
            daysOverdue,
            BUSINESS_RULES.GOLD_PENAL_INTEREST_SLABS,
        );
    } else {
        dailyPenalty = computeDailyOverduePenalty(
            emi.emiAmount,
            BUSINESS_RULES.EMI_OVERDUE_PENALTY_RATE * 100, // 0.24 → 24%
        );
    }

    await emiRepository.incrementPenalty(
        emiId,
        Math.round(dailyPenalty * 100), // to paisa
    );

    // Mark overdue if not already
    if (emi.status !== EMI_STATUS.OVERDUE && emi.status !== EMI_STATUS.BOUNCED) {
        await emiRepository.markOverdue(emiId);
    }
},

    // ── 8. Waive EMI (Super Admin / Finance only) ──────────────────────────────

    async waiveEmi(
        input: WaiveEmiInput,
        req: Request,
    ): Promise<EmiScheduleEntry> {
        const emi = await emiRepository.findByIdOrThrow(input.emiId);

        if (emi.status === EMI_STATUS.PAID) {
            throw new EmiAlreadyPaidError(emi.id, emi.emiNumber);
        }

        const updated = await emiRepository.waiveEmi(emi.id);

        setAuditContext(req, {
            action: 'EMI_WAIVED',
            entityType: 'emi_schedule',
            entityId: emi.id,
            before: { status: emi.status, penaltyAmount: emi.penaltyAmount },
            after: { status: EMI_STATUS.WAIVED, reason: input.reason },
            metadata: { waivedBy: input.waivedBy },
        });

        log.warn('EMI waived', {
            emiId: emi.id,
            emiNumber: emi.emiNumber,
            waivedBy: input.waivedBy,
            reason: input.reason,
        });

        return updated;
    },

    // ── 9. Foreclosure quote ──────────────────────────────────────────────────

    async getForeclosureQuote(
        loanAccountId: string,
        annualRatePct: number,
    ): Promise<ReturnType<typeof computeForeclosureAmount>> {
        const summary = await emiRepository.getSummary(loanAccountId);
        const nextDue = await emiRepository.findNextDueEmi(loanAccountId);

        if (!nextDue) {
            throw new DomainError(
                'No outstanding EMIs — loan may already be closed',
                'NO_OUTSTANDING_EMIS',
            );
        }

        // Last paid EMI date as starting point for accrued interest
        const lastPaidDate = summary.lastPaidAt ?? new Date();

        return computeForeclosureAmount({
            outstandingPrincipal: summary.totalOutstanding,
            annualRatePct,
            lastEmiDate: lastPaidDate,
            settlementDate: new Date(),
            foreclosureFeePct: 5,   // 5% per client requirements (principal outstanding + GST)
            accumulatedPenalty: summary.totalPenalty,
        });
    },

    // ── 10. Cron job helpers ──────────────────────────────────────────────────

    async getReminders(
        targetDate: Date,
        daysBefore: number,
    ): Promise<EmiReminderTarget[]> {
        return emiRepository.findEmisForReminder(targetDate, daysBefore);
    },

    async getNachDebitTargets(
        debitDate: Date,
    ): Promise<NachDebitTarget[]> {
        return emiRepository.findEmisForNachDebit(debitDate);
    },

    async getOverdueEmis(
        gracePeriodDays?: number,
    ): Promise<OverdueEmiResult[]> {
        return emiRepository.findOverdueEmis(
            gracePeriodDays ?? BUSINESS_RULES.EMI_GRACE_PERIOD_DAYS,
        );
    },

    // ── 11. Count remaining — used by payments module to detect loan closure ──

    async countUnpaid(loanAccountId: string): Promise<number> {
        return emiRepository.countUnpaidEmis(loanAccountId);
    },
};
