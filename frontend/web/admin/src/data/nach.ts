// src/data/nach.ts
//
// Sample store for the recurring-debit (e-NACH) and reconciliation screens.
//
// The backend does not expose these yet — see docs/NACH_RECON_API_CONTRACTS.md
// for the endpoints these shapes are modelled on. Everything here is derived
// from the existing loan book in `mock.ts` so a batch row always points at a
// loan that actually exists and whose health matches the debit outcome: an NPA
// loan's presentation bounces, a healthy one clears.

import dayjs from 'dayjs';
import { MOCK } from './mock';
import type { LoanAccount, NachBatch, NachDebitItem, ReconciliationRow } from '../types';

// ─── Deterministic per-key noise ─────────────────────────────────────────────
// Seeded off the row's own identity, so a reload does not reshuffle the book.

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const rnd = (key: string): number => hash(key) / 4294967296;
const pick = <T,>(key: string, arr: T[]): T => arr[Math.floor(rnd(key) * arr.length)]!;

const SPONSOR_BANK = 'HDFC Bank (Sponsor)';

/** NPCI ACH return reasons, in roughly the frequency a real return file shows. */
const RETURNS = [
  { code: '02', reason: 'Insufficient funds' },
  { code: '02', reason: 'Insufficient funds' },
  { code: '02', reason: 'Insufficient funds' },
  { code: '10', reason: 'Account frozen' },
  { code: '22', reason: 'Mandate not registered at destination bank' },
  { code: '08', reason: 'Payment stopped by drawer' },
  { code: '03', reason: 'Account closed' },
];

/** Presentation windows the screen shows, newest first. */
const CYCLES: { offset: number; cycle: NachBatch['cycle'] }[] = [
  { offset: 0, cycle: 'PRESENTATION' },
  { offset: 0, cycle: 'RETRY' },
  { offset: 1, cycle: 'PRESENTATION' },
  { offset: 2, cycle: 'PRESENTATION' },
  { offset: 5, cycle: 'PRESENTATION' },
];

/** A loan is presentable only while it has a mandate that can actually be debited. */
const presentable = (l: LoanAccount): boolean =>
  l.status !== 'CLOSED' &&
  l.mandate !== undefined &&
  l.mandate.status !== 'NOT_SETUP' &&
  l.mandate.status !== 'CANCELLED' &&
  l.mandate.status !== 'EXPIRED';

/**
 * Outcome of presenting this loan's EMI. Driven by the loan's real health so the
 * batch screen and the loan screen never contradict each other.
 */
function outcome(loan: LoanAccount, key: string): 'SUCCESS' | 'FAILED' {
  const r = rnd(key);
  if (loan.mandate?.status === 'FAILED' || loan.status === 'NPA') return 'FAILED';
  if (loan.status === 'OVERDUE') return r < 0.65 ? 'FAILED' : 'SUCCESS';
  return r < 0.94 ? 'SUCCESS' : 'FAILED';
}

// ─── Build ───────────────────────────────────────────────────────────────────

const batches: NachBatch[] = [];
const items: NachDebitItem[] = [];

const eligible = MOCK.loans.filter(presentable);

CYCLES.forEach(({ offset, cycle }, ci) => {
  const day = dayjs().subtract(offset, 'day');
  const presentationDate = day.format('YYYY-MM-DD');
  const isToday = offset === 0;
  const batchId = `NACH-${day.format('YYYYMMDD')}-${cycle === 'RETRY' ? 'R' : 'P'}`;

  // Which loans a PRESENTATION cycle sweeps on a given day. Today's file covers
  // the whole eligible book; older days covered a subset.
  const presented = (dayOffset: number): LoanAccount[] =>
    eligible.filter((l) => dayOffset === 0 || rnd(`${l.loanNumber}:${dayOffset}`) < 0.65);

  /* A retry cycle re-presents what bounced the day before — so it must be a
     genuine subset of yesterday's file, not an independent draw, or the sample
     shows retries for loans that were never presented. */
  const pool =
    cycle === 'RETRY'
      ? presented(offset + 1).filter(
          (l) => outcome(l, `${l.loanNumber}:${offset + 1}:PRESENTATION`) === 'FAILED',
        )
      : presented(offset);

  const batchItems: NachDebitItem[] = pool.map((loan, i) => {
    const key = `${loan.loanNumber}:${offset}:${cycle}`;
    const attempt = cycle === 'RETRY' ? 2 : 1;

    // Today's presentation file is still with the sponsor bank for part of the
    // book — that "not answered yet" state is the whole point of the screen.
    let status: NachDebitItem['status'];
    if (isToday && cycle === 'PRESENTATION' && rnd(`${key}:pending`) < 0.18) {
      status = 'PENDING';
    } else {
      const res = outcome(loan, key);
      status =
        res === 'SUCCESS'
          ? 'SUCCESS'
          : // A failure is only terminal once its retry window is exhausted.
            cycle === 'PRESENTATION' && isToday
            ? 'RETRYING'
            : 'FAILED';
    }

    const ret = pick(`${key}:ret`, RETURNS);
    const nextEmi = loan.schedule.find((e) => e.status !== 'PAID');

    return {
      id: `${batchId}-${String(i + 1).padStart(3, '0')}`,
      batchId,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      loanType: loan.loanType,
      umrn: loan.mandate?.umrn,
      bankName: loan.mandate?.bankName ?? '—',
      emiSeq: nextEmi?.seq,
      amount: loan.emi,
      status,
      returnCode: status === 'SUCCESS' || status === 'PENDING' ? undefined : ret.code,
      returnReason: status === 'SUCCESS' || status === 'PENDING' ? undefined : ret.reason,
      attempt,
      utr: status === 'SUCCESS' ? `NACH${hash(key) % 1000000000}` : undefined,
      nextRetryOn:
        status === 'RETRYING' ? day.add(3, 'day').format('YYYY-MM-DD') : undefined,
      presentedAt: day.hour(cycle === 'RETRY' ? 14 : 7).minute(30).second(0).toISOString(),
    };
  });

  items.push(...batchItems);

  const sum = (f: (x: NachDebitItem) => boolean): { count: number; amount: number } =>
    batchItems.reduce(
      (acc, x) => (f(x) ? { count: acc.count + 1, amount: acc.amount + x.amount } : acc),
      { count: 0, amount: 0 },
    );

  const success = sum((x) => x.status === 'SUCCESS');
  const failed = sum((x) => x.status === 'FAILED');
  const retrying = sum((x) => x.status === 'RETRYING');
  const pending = sum((x) => x.status === 'PENDING');

  batches.push({
    id: batchId,
    presentationDate,
    cycle,
    status: pending.count > 0 ? 'RUNNING' : failed.count + retrying.count > 0 ? 'PARTIAL' : 'COMPLETED',
    sponsorBank: SPONSOR_BANK,
    fileRef: `ACH-DR-${day.format('DDMMYYYY')}-${1000 + ci}`,
    totalCount: batchItems.length,
    totalAmount: batchItems.reduce((s, x) => s + x.amount, 0),
    successCount: success.count,
    successAmount: success.amount,
    failedCount: failed.count,
    failedAmount: failed.amount,
    retryingCount: retrying.count,
    pendingCount: pending.count,
    startedAt: day.hour(cycle === 'RETRY' ? 14 : 7).minute(0).second(0).toISOString(),
    completedAt: pending.count > 0 ? undefined : day.hour(cycle === 'RETRY' ? 15 : 9).minute(45).second(0).toISOString(),
  });
});

// ─── Reconciliation ──────────────────────────────────────────────────────────
// Book (LMS ledger) vs bank (settlement file). Most lines agree; the ones that
// do not are the entire reason the report exists, so the sample deliberately
// carries one of each break type.

const recon: ReconciliationRow[] = [];

MOCK.repayments
  .filter((r) => dayjs(r.date).isAfter(dayjs().subtract(45, 'day')))
  .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
  .slice(0, 60)
  .forEach((r) => {
    const roll = rnd(`recon:${r.id}`);
    let status: ReconciliationRow['status'] = 'MATCHED';
    let bankAmount = r.amount;
    let note: string | undefined;

    if (r.status === 'BOUNCED') {
      // A bounced presentation should never have a bank credit behind it.
      status = 'MATCHED';
      bankAmount = 0;
      note = 'Return file matched — no credit expected';
    } else if (roll < 0.06) {
      status = 'AMOUNT_MISMATCH';
      // Net-of-charges settlement: the bank credits us less than the book claims.
      bankAmount = Math.round(r.amount * 0.98);
      note = 'Bank credited net of collection charges';
    } else if (roll < 0.11) {
      status = 'UNMATCHED_IN_BOOK';
      bankAmount = 0;
      note = 'Posted in LMS; no matching credit in the settlement file';
    }

    recon.push({
      id: `RCN-${r.id}`,
      date: r.date,
      loanNumber: r.loanNumber,
      customerName: r.customerName,
      channel: r.mode,
      reference: r.reference,
      bookAmount: r.status === 'BOUNCED' ? 0 : r.amount,
      bankAmount,
      status,
      note,
    });
  });

// Credits the bank shows that nothing in the book claims — typically a customer
// paying by direct transfer without quoting a loan number.
[0, 1, 2].forEach((i) => {
  const d = dayjs().subtract(i * 3 + 1, 'day');
  recon.push({
    id: `RCN-ORPHAN-${i + 1}`,
    date: d.hour(11).minute(20).second(0).toISOString(),
    channel: 'NEFT',
    reference: `NEFT${hash(`orphan${i}`) % 1000000000}`,
    bookAmount: 0,
    bankAmount: [4582, 12750, 8300][i]!,
    status: 'UNMATCHED_IN_BANK',
    note: 'Credit received with no loan reference — needs manual allocation',
  });
});

recon.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

export const MOCK_NACH = {
  batches: batches.sort(
    (a, b) => dayjs(b.startedAt).valueOf() - dayjs(a.startedAt).valueOf(),
  ),
  items,
  reconciliation: recon,
};
