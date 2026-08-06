// src/utils/payments.ts
//
// Pure payment-allocation math for servicing (LMS). Extracted from
// store/appStore.ts `recordPayment` (G2), then CORRECTED — see
// docs/PAYMENT_LOGIC_DECISIONS.md for the six bugs this fixes, the default
// policy chosen for each, and the three questions still open with compliance.
//
// ── The two rules everything here obeys ─────────────────────────────────────
//
// 1. INTEGER PAISE ONLY. Every internal amount is an integer number of paise.
//    Rupees are converted in once (`toPaise`) and out once (`toRupees`). The old
//    code did `remaining -= row.emi` on rupee floats, which lost a whole ₹8,333.33
//    instalment when a customer paid exactly 4 × EMI. That class of bug is now
//    unrepresentable: integers do not drift.
//
// 2. MONEY IS NEVER DESTROYED. Every paisa tendered is either settled against an
//    instalment or carried in `advanceBalancePaise`. The invariant
//
//        settledPaise + closingAdvancePaise === openingAdvancePaise + tenderPaise
//
//    holds for every payment, and is asserted against randomised tenders in
//    payments.test.ts. The old code silently dropped anything that could not
//    cover a whole instalment.
//
// ── Vocabulary note ─────────────────────────────────────────────────────────
// The spec calls the healthy state "CURRENT"; this codebase's `LoanStatus` has
// always called it `ACTIVE`, and 21 files (StatusTag, statusMap, queue filters,
// mock data) key off that. Same meaning, existing word — no new enum member.

import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { EmiRow, LoanAccount, LoanStatus, PaymentAllocation } from '../types';

export type { PaymentAllocation };

/** RBI IRACP: an account 90 days or more past due is a non-performing asset. */
export const NPA_DPD_THRESHOLD = 90;

// ─── paise boundary ──────────────────────────────────────────────────────────

/**
 * Rupees → integer paise. The store holds rupees (the API divides by 100 on
 * ingest), so this is the single entry point into integer arithmetic. Rounding
 * here is deliberate and lossless for any real money value: a rupee amount only
 * ever carries two decimals.
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Integer paise → rupees, for handing back to the store / UI. */
export function toRupees(paise: number): number {
  return paise / 100;
}

// ─── allocation ──────────────────────────────────────────────────────────────

export interface AllocationResult {
  /** Copy of the schedule with settled rows flipped to PAID. Input untouched. */
  schedule: EmiRow[];
  /** The loan's `paidCount` after this payment. */
  paidCount: number;
  allocation: PaymentAllocation;
}

/** Chronological order, ties broken by instalment number. */
function byDueDateThenSeq(a: EmiRow, b: EmiRow): number {
  const d = a.dueDate.localeCompare(b.dueDate);
  return d !== 0 ? d : a.seq - b.seq;
}

/**
 * Settle instalments out of (carried advance + this tender), oldest due-date first.
 *
 * DEFAULT POLICY — see docs/PAYMENT_LOGIC_DECISIONS.md, open questions 1 and 2:
 *  - An instalment settles only when the available money covers it in FULL. A
 *    part-payment is not written against a row; it is held in suspense and
 *    applied automatically once enough accumulates. (Nothing is lost either way —
 *    this is about *when* the customer gets credit, not *whether*.)
 *  - Walking stops at the first instalment the money cannot cover, so instalments
 *    are always settled in due order and never out of sequence.
 *  - Anything left over is carried as advance. There is no auto-refund, and no
 *    foreclosure settlement is computed: a large tender simply prepays future
 *    instalments at face value (no interest rebate, no foreclosure charge).
 *
 * The returned `schedule` preserves the caller's array order; only statuses change.
 */
export function allocateToSchedule(
  schedule: EmiRow[],
  tenderPaise: number,
  startingPaidCount: number,
  openingAdvancePaise: number,
  now: Dayjs = dayjs(),
): AllocationResult {
  const next = schedule.map((row) => ({ ...row }));

  let available = openingAdvancePaise + tenderPaise;
  let settledPaise = 0;
  let paidCount = startingPaidCount;
  const settledSeqs: number[] = [];

  const unpaid = next.filter((row) => row.status !== 'PAID').sort(byDueDateThenSeq);
  const paidOn = now.format('YYYY-MM-DD');

  for (const row of unpaid) {
    const emiPaise = toPaise(row.emi);
    if (available < emiPaise) break; // stop — never settle out of due order

    available -= emiPaise;
    settledPaise += emiPaise;
    row.status = 'PAID';
    row.paidOn = paidOn;
    row.paidAmount = row.emi;
    paidCount += 1;
    settledSeqs.push(row.seq);
  }

  return {
    schedule: next,
    paidCount,
    allocation: {
      tenderPaise,
      openingAdvancePaise,
      settledPaise,
      closingAdvancePaise: available,
      settledSeqs,
    },
  };
}

// ─── dates, DPD and status ───────────────────────────────────────────────────

/** Oldest unpaid instalment by due date — the row that drives DPD. */
export function earliestUnpaid(schedule: EmiRow[]): EmiRow | undefined {
  return schedule.filter((row) => row.status !== 'PAID').sort(byDueDateThenSeq)[0];
}

/**
 * Days past due, computed from DATES ONLY.
 *
 * The old version returned 0 unless the row happened to carry an `OVERDUE` tag,
 * so a loan 151 days in arrears could report 0 DPD and read as healthy. DPD is a
 * property of the calendar, not of a flag some other process may or may not have
 * set. Never negative: an instalment that is not yet due is 0 DPD, not -30.
 */
export function computeDpd(row: EmiRow | undefined, now: Dayjs = dayjs()): number {
  if (!row) return 0;
  return Math.max(0, now.diff(dayjs(row.dueDate), 'day'));
}

/**
 * Account status.
 *
 * CLOSED   every instalment settled and nothing outstanding
 * NPA      dpd >= 90  ← RBI IRACP. See open question 3: the old code used > 90,
 *                       which left an account at exactly 90 days unprovisioned.
 * OVERDUE  dpd > 0    ← no grace period today; also open question 3
 * ACTIVE   otherwise  (the spec's "CURRENT")
 */
export function deriveLoanStatus(allPaid: boolean, dpd: number, outstandingPaise: number): LoanStatus {
  if (allPaid && outstandingPaise <= 0) return 'CLOSED';
  if (dpd >= NPA_DPD_THRESHOLD) return 'NPA';
  if (dpd > 0) return 'OVERDUE';
  return 'ACTIVE';
}

/**
 * Arrears: unpaid instalments whose due date has already passed, in rupees.
 * Date-driven for the same reason DPD is — a stale row tag must not be able to
 * hide money that is genuinely overdue.
 */
export function computeOverdueAmount(schedule: EmiRow[], now: Dayjs = dayjs()): number {
  const overduePaise = schedule
    .filter((row) => row.status !== 'PAID' && now.diff(dayjs(row.dueDate), 'day') > 0)
    .reduce((sum, row) => sum + toPaise(row.emi), 0);
  return toRupees(overduePaise);
}

/**
 * Re-tag unpaid rows from the calendar so the schedule agrees with the account.
 * Without this a row can read `DUE` on a screen while the loan it belongs to
 * reads NPA. PAID rows are never touched.
 */
export function retagUnpaidRows(schedule: EmiRow[], now: Dayjs = dayjs()): EmiRow[] {
  return schedule.map((row) => {
    if (row.status === 'PAID') return row;
    const days = now.diff(dayjs(row.dueDate), 'day');
    const status: EmiRow['status'] = days > 0 ? 'OVERDUE' : days === 0 ? 'DUE' : 'UPCOMING';
    return { ...row, status };
  });
}

/** Outstanding principal in paise: the closing balance of the last settled row. */
export function computeOutstandingPaise(schedule: EmiRow[], principal: number): number {
  const paid = schedule.filter((row) => row.status === 'PAID').sort(byDueDateThenSeq);
  const last = paid[paid.length - 1];
  return Math.max(0, last ? toPaise(last.balance) : toPaise(principal));
}

// ─── the whole payment ───────────────────────────────────────────────────────

export interface PaymentOutcome {
  loan: LoanAccount;
  allocation: PaymentAllocation;
}

/**
 * Apply a payment and return the updated account plus a balanced allocation.
 *
 * Pure — neither `loan` nor its `schedule` is mutated.
 *
 * `amount` is in RUPEES (the store's unit). Everything inside is integer paise.
 * `lastPaymentAmount` records the tender truthfully; the split between what was
 * settled and what is being held is in `allocation` / `advanceBalancePaise`, so
 * the ledger balances instead of the account quietly claiming credit it never gave.
 */
export function applyPayment(loan: LoanAccount, amount: number, now: Dayjs = dayjs()): PaymentOutcome {
  const tenderPaise = toPaise(amount);
  const openingAdvancePaise = loan.advanceBalancePaise ?? 0;

  const { schedule: settled, paidCount, allocation } = allocateToSchedule(
    loan.schedule,
    tenderPaise,
    loan.paidCount,
    openingAdvancePaise,
    now,
  );

  const schedule = retagUnpaidRows(settled, now);
  const firstUnpaid = earliestUnpaid(schedule);
  const allPaid = schedule.every((row) => row.status === 'PAID');
  const outstandingPaise = allPaid ? 0 : computeOutstandingPaise(schedule, loan.principal);
  const dpd = computeDpd(firstUnpaid, now);

  return {
    allocation,
    loan: {
      ...loan,
      schedule,
      paidCount,
      overdueAmount: computeOverdueAmount(schedule, now),
      dpd,
      status: deriveLoanStatus(allPaid, dpd, outstandingPaise),
      collectionStatus: dpd > 0 ? loan.collectionStatus : 'NORMAL',
      outstandingPrincipal: toRupees(outstandingPaise),
      nextDueDate: firstUnpaid?.dueDate,
      lastPaymentDate: now.toDate().toISOString(),
      lastPaymentAmount: amount,
      advanceBalancePaise: allocation.closingAdvancePaise,
      lastAllocation: allocation,
    },
  };
}
