import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  NPA_DPD_THRESHOLD,
  allocateToSchedule,
  applyPayment,
  computeDpd,
  computeOutstandingPaise,
  computeOverdueAmount,
  deriveLoanStatus,
  earliestUnpaid,
  retagUnpaidRows,
  toPaise,
  toRupees,
} from '../payments';
import type { EmiRow, LoanAccount } from '../../types';

/* ============================================================================
 * Payment allocation, DPD and status transitions (gate G2).
 *
 * The six `it.fails` tests that used to live here documented six real money
 * bugs. They are now ordinary passing tests asserting the CORRECTED behaviour —
 * each is still labelled with the bug it locks down, so a regression names
 * itself. See docs/PAYMENT_LOGIC_DECISIONS.md.
 *
 * The two rules under test:
 *   1. Integer paise everywhere — no float drift, ever.
 *   2. Money is never destroyed:
 *        settledPaise + closingAdvance === openingAdvance + tender
 * ==========================================================================*/

// ─── fixtures ────────────────────────────────────────────────────────────────

const row = (over: Partial<EmiRow> & Pick<EmiRow, 'seq' | 'dueDate' | 'status'>): EmiRow => ({
  principal: 8000,
  interest: 2000,
  emi: 10000,
  balance: 0,
  ...over,
});

const loan = (over: Partial<LoanAccount> = {}): LoanAccount => ({
  loanNumber: 'FNLN-CDL-00001',
  applicationId: 'app-1',
  appNumber: 'FHR-2026-00001',
  customerName: 'Priya Sharma',
  mobile: '9000000001',
  loanType: 'CDL',
  principal: 100000,
  interestRate: 14,
  tenureMonths: 12,
  emi: 10000,
  disbursedOn: '2025-12-01T00:00:00.000Z',
  firstEmiDate: '2026-01-01',
  paidCount: 0,
  outstandingPrincipal: 100000,
  overdueAmount: 0,
  dpd: 0,
  status: 'ACTIVE',
  collectionStatus: 'NORMAL',
  collectionNotes: [],
  branch: 'Chennai — T Nagar',
  schedule: [],
  ...over,
});

/** The rule that must never break, whatever the inputs. */
const expectConserved = (a: {
  settledPaise: number;
  closingAdvancePaise: number;
  openingAdvancePaise: number;
  tenderPaise: number;
}): void => {
  expect(a.settledPaise + a.closingAdvancePaise).toBe(a.openingAdvancePaise + a.tenderPaise);
};

// ─── paise boundary ──────────────────────────────────────────────────────────

describe('toPaise / toRupees', () => {
  it('converts rupees with paise to exact integers', () => {
    expect(toPaise(8333.33)).toBe(833333);
    expect(toPaise(0.1)).toBe(10);
    expect(toPaise(10000)).toBe(1000000);
    expect(toPaise(0)).toBe(0);
  });

  it('round-trips', () => {
    for (const r of [8333.33, 0.01, 1234.56, 99999.99]) {
      expect(toRupees(toPaise(r))).toBeCloseTo(r, 2);
    }
  });

  it('produces integers even where float multiplication would not', () => {
    // 1234.56 * 100 === 123455.99999999999 in IEEE-754.
    expect(Number.isInteger(toPaise(1234.56))).toBe(true);
    expect(toPaise(1234.56)).toBe(123456);
  });
});

// ─── allocation ──────────────────────────────────────────────────────────────

describe('allocateToSchedule', () => {
  const NOW = dayjs('2026-03-01');

  it('settles an exact full EMI', () => {
    const schedule = [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE', balance: 90000 })];
    const res = allocateToSchedule(schedule, toPaise(10000), 0, 0, NOW);

    expect(res.paidCount).toBe(1);
    expect(res.schedule[0].status).toBe('PAID');
    expect(res.schedule[0].paidAmount).toBe(10000);
    expect(res.schedule[0].paidOn).toBe('2026-03-01');
    expect(res.allocation.settledPaise).toBe(toPaise(10000));
    expect(res.allocation.closingAdvancePaise).toBe(0);
    expectConserved(res.allocation);
  });

  it('settles several instalments oldest-due-date first', () => {
    const schedule = [
      row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE', balance: 90000 }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'OVERDUE', balance: 80000 }),
      row({ seq: 3, dueDate: '2026-03-01', status: 'DUE', balance: 70000 }),
    ];
    const res = allocateToSchedule(schedule, toPaise(30000), 0, 0, NOW);

    expect(res.paidCount).toBe(3);
    expect(res.allocation.settledSeqs).toEqual([1, 2, 3]);
    expectConserved(res.allocation);
  });

  it('settles in due-date order even when the array is out of order', () => {
    const schedule = [
      row({ seq: 3, dueDate: '2026-03-01', status: 'UPCOMING' }),
      row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'OVERDUE' }),
    ];
    const res = allocateToSchedule(schedule, toPaise(20000), 0, 0, NOW);
    expect(res.allocation.settledSeqs).toEqual([1, 2]);
  });

  it('stops at the first instalment the money cannot cover (never out of order)', () => {
    const schedule = [
      row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'OVERDUE' }),
    ];
    const res = allocateToSchedule(schedule, toPaise(15000), 0, 0, NOW);

    expect(res.allocation.settledSeqs).toEqual([1]);
    expect(res.schedule[1].status).toBe('OVERDUE');
    expect(res.allocation.closingAdvancePaise).toBe(toPaise(5000));
    expectConserved(res.allocation);
  });

  it('preserves the caller’s array order and never mutates the input', () => {
    const schedule = [
      row({ seq: 2, dueDate: '2026-02-01', status: 'OVERDUE' }),
      row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' }),
    ];
    const res = allocateToSchedule(schedule, toPaise(10000), 0, 0, NOW);

    expect(res.schedule.map((r) => r.seq)).toEqual([2, 1]); // order preserved
    expect(schedule[1].status).toBe('OVERDUE'); // input untouched
    expect(schedule[1].paidAmount).toBeUndefined();
  });

  // ── BUG #1 (was it.fails) — partial payment must not be discarded ──────────
  it('BUG#1 FIXED: a partial payment is held in suspense, not discarded', () => {
    const schedule = [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' })];
    const res = allocateToSchedule(schedule, toPaise(5000), 0, 0, NOW);

    expect(res.allocation.settledPaise).toBe(0);
    expect(res.allocation.closingAdvancePaise).toBe(toPaise(5000));
    expect(res.schedule[0].status).toBe('OVERDUE');
    expectConserved(res.allocation);
  });

  it('BUG#1 FIXED: two partials accumulate and settle the instalment automatically', () => {
    const schedule = [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' })];

    const first = allocateToSchedule(schedule, toPaise(4000), 0, 0, NOW);
    expect(first.allocation.closingAdvancePaise).toBe(toPaise(4000));
    expect(first.paidCount).toBe(0);

    const second = allocateToSchedule(
      first.schedule,
      toPaise(6000),
      first.paidCount,
      first.allocation.closingAdvancePaise,
      NOW,
    );
    expect(second.paidCount).toBe(1);
    expect(second.schedule[0].status).toBe('PAID');
    expect(second.allocation.closingAdvancePaise).toBe(0);
    expectConserved(second.allocation);
  });

  // ── BUG #2 (was it.fails) — overpayment must not be discarded ──────────────
  it('BUG#2 FIXED: overpayment beyond the book is carried as advance', () => {
    const schedule = [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' })];
    const res = allocateToSchedule(schedule, toPaise(25000), 0, 0, NOW);

    expect(res.allocation.settledPaise).toBe(toPaise(10000));
    expect(res.allocation.closingAdvancePaise).toBe(toPaise(15000));
    expectConserved(res.allocation);
  });

  it('BUG#2 FIXED: a foreclosure-sized tender prepays every instalment, remainder as advance', () => {
    const schedule = [1, 2, 3, 4, 5, 6].map((seq) =>
      row({ seq, dueDate: `2026-0${seq}-01`, status: seq <= 2 ? 'OVERDUE' : 'UPCOMING', balance: 0 }),
    );
    const res = allocateToSchedule(schedule, toPaise(65000), 0, 0, NOW);

    expect(res.paidCount).toBe(6);
    expect(res.allocation.settledSeqs).toEqual([1, 2, 3, 4, 5, 6]);
    expect(res.allocation.closingAdvancePaise).toBe(toPaise(5000));
    expectConserved(res.allocation);
  });

  // ── BUG #3 (was it.fails) — no float drift ────────────────────────────────
  it('BUG#3 FIXED: paying exactly 4x EMI of ₹8,333.33 settles 4 instalments', () => {
    const emi = 8333.33;
    const schedule = [1, 2, 3, 4].map((seq) =>
      row({ seq, dueDate: `2026-0${seq}-01`, status: 'OVERDUE', emi }),
    );
    const res = allocateToSchedule(schedule, toPaise(emi * 4), 0, 0, NOW);

    expect(res.paidCount).toBe(4);
    expect(res.allocation.closingAdvancePaise).toBe(0);
    expectConserved(res.allocation);
  });

  it('BUG#3 FIXED: no drift across the awkward EMIs that used to lose an instalment', () => {
    for (const emi of [8333.33, 3541.67, 916.67, 1666.67, 0.1]) {
      for (const n of [2, 3, 4, 5, 6]) {
        const schedule = Array.from({ length: n }, (_, i) =>
          row({ seq: i + 1, dueDate: `2026-01-${String(i + 1).padStart(2, '0')}`, status: 'OVERDUE', emi }),
        );
        const res = allocateToSchedule(schedule, toPaise(emi) * n, 0, 0, NOW);
        expect(res.paidCount, `emi ${emi} x ${n}`).toBe(n);
        expect(res.allocation.closingAdvancePaise, `emi ${emi} x ${n}`).toBe(0);
      }
    }
  });

  // ── the invariant, against randomised tenders ─────────────────────────────
  it('INVARIANT: money is conserved for 500 randomised tenders and advances', () => {
    let seed = 20260804;
    const rand = (n: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };

    for (let i = 0; i < 500; i++) {
      const rows = 1 + rand(8);
      const emi = (50 + rand(900000)) / 100; // rupees, 2dp
      const schedule = Array.from({ length: rows }, (_, k) =>
        row({
          seq: k + 1,
          dueDate: `2026-01-${String(k + 1).padStart(2, '0')}`,
          status: 'OVERDUE',
          emi,
        }),
      );
      const tenderPaise = rand(9_000_00);
      const openingAdvancePaise = rand(50_00);

      const res = allocateToSchedule(schedule, tenderPaise, 0, openingAdvancePaise, NOW);

      expectConserved(res.allocation);
      expect(Number.isInteger(res.allocation.closingAdvancePaise)).toBe(true);
      expect(res.allocation.closingAdvancePaise).toBeGreaterThanOrEqual(0);
      expect(res.allocation.settledPaise).toBe(res.allocation.settledSeqs.length * toPaise(emi));
    }
  });
});

// ─── DPD ─────────────────────────────────────────────────────────────────────

describe('computeDpd — from dates only', () => {
  const r = (status: EmiRow['status'] = 'OVERDUE'): EmiRow =>
    row({ seq: 1, dueDate: '2026-01-01', status });

  it('is 0 on the due date itself', () => {
    expect(computeDpd(r(), dayjs('2026-01-01'))).toBe(0);
  });

  it('is 1 the day after', () => {
    expect(computeDpd(r(), dayjs('2026-01-02'))).toBe(1);
  });

  it('counts whole days across months', () => {
    expect(computeDpd(r(), dayjs('2026-03-31'))).toBe(89);
    expect(computeDpd(r(), dayjs('2026-04-01'))).toBe(90);
    expect(computeDpd(r(), dayjs('2026-04-02'))).toBe(91);
  });

  it('is never negative for an instalment not yet due', () => {
    expect(computeDpd(r('UPCOMING'), dayjs('2025-12-01'))).toBe(0);
  });

  it('is 0 when the book is fully settled', () => {
    expect(computeDpd(undefined, dayjs('2026-04-01'))).toBe(0);
  });

  // ── BUG #4 (was it.fails) — DPD must ignore the row's status tag ───────────
  it.each(['DUE', 'UPCOMING', 'OVERDUE'] as const)(
    'BUG#4 FIXED: a 151-day-old row reports 151 DPD even when tagged %s',
    (status) => {
      expect(computeDpd(r(status), dayjs('2026-06-01'))).toBe(151);
    },
  );
});

describe('earliestUnpaid', () => {
  it('picks the oldest unpaid row by due date, not array position', () => {
    const schedule = [
      row({ seq: 3, dueDate: '2026-03-01', status: 'UPCOMING' }),
      row({ seq: 1, dueDate: '2026-01-01', status: 'PAID' }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'OVERDUE' }),
    ];
    expect(earliestUnpaid(schedule)?.seq).toBe(2);
  });

  it('is undefined when everything is paid', () => {
    expect(earliestUnpaid([row({ seq: 1, dueDate: '2026-01-01', status: 'PAID' })])).toBeUndefined();
  });
});

// ─── status thresholds ───────────────────────────────────────────────────────

describe('deriveLoanStatus — exact boundaries', () => {
  it('is ACTIVE at 0 DPD', () => {
    expect(deriveLoanStatus(false, 0, 100000)).toBe('ACTIVE');
  });

  it('flips to OVERDUE at 1 DPD — day before / day of', () => {
    expect(deriveLoanStatus(false, 0, 100000)).toBe('ACTIVE');
    expect(deriveLoanStatus(false, 1, 100000)).toBe('OVERDUE');
  });

  // ── BUG #5 (was it.fails) — NPA at >= 90, not > 90 ────────────────────────
  it('BUG#5 FIXED: NPA on the day DPD reaches 90 — day before / day of', () => {
    expect(deriveLoanStatus(false, 89, 100000)).toBe('OVERDUE');
    expect(deriveLoanStatus(false, 90, 100000)).toBe('NPA');
  });

  it('BUG#5 FIXED: stays NPA beyond 90', () => {
    expect(deriveLoanStatus(false, 91, 100000)).toBe('NPA');
    expect(deriveLoanStatus(false, 365, 100000)).toBe('NPA');
  });

  it('exposes the threshold as a named constant', () => {
    expect(NPA_DPD_THRESHOLD).toBe(90);
    expect(deriveLoanStatus(false, NPA_DPD_THRESHOLD, 1)).toBe('NPA');
    expect(deriveLoanStatus(false, NPA_DPD_THRESHOLD - 1, 1)).toBe('OVERDUE');
  });

  it('CLOSED requires both: everything paid AND nothing outstanding', () => {
    expect(deriveLoanStatus(true, 0, 0)).toBe('CLOSED');
    expect(deriveLoanStatus(true, 200, 0)).toBe('CLOSED');
    // paid flag set but money still outstanding must NOT read as closed
    expect(deriveLoanStatus(true, 0, 5000)).toBe('ACTIVE');
  });
});

// ─── arrears, retagging, outstanding ─────────────────────────────────────────

describe('computeOverdueAmount — date-driven', () => {
  const NOW = dayjs('2026-03-15');

  it('sums unpaid instalments whose due date has passed', () => {
    const schedule = [
      row({ seq: 1, dueDate: '2026-01-01', status: 'PAID' }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'DUE' }), // stale tag, genuinely overdue
      row({ seq: 3, dueDate: '2026-03-01', status: 'OVERDUE' }),
      row({ seq: 4, dueDate: '2026-04-01', status: 'UPCOMING' }),
    ];
    expect(computeOverdueAmount(schedule, NOW)).toBe(20000);
  });

  it('is 0 on a clean book', () => {
    expect(computeOverdueAmount([row({ seq: 1, dueDate: '2026-01-01', status: 'PAID' })], NOW)).toBe(0);
  });
});

describe('retagUnpaidRows', () => {
  it('re-derives DUE / OVERDUE / UPCOMING from the calendar and leaves PAID alone', () => {
    const schedule = [
      row({ seq: 1, dueDate: '2026-01-01', status: 'PAID' }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'UPCOMING' }),
      row({ seq: 3, dueDate: '2026-03-15', status: 'UPCOMING' }),
      row({ seq: 4, dueDate: '2026-04-01', status: 'OVERDUE' }),
    ];
    const out = retagUnpaidRows(schedule, dayjs('2026-03-15'));

    expect(out.map((r) => r.status)).toEqual(['PAID', 'OVERDUE', 'DUE', 'UPCOMING']);
  });
});

describe('computeOutstandingPaise', () => {
  it('is the closing balance of the last settled row', () => {
    const schedule = [
      row({ seq: 1, dueDate: '2026-01-01', status: 'PAID', balance: 90000 }),
      row({ seq: 2, dueDate: '2026-02-01', status: 'PAID', balance: 80000 }),
      row({ seq: 3, dueDate: '2026-03-01', status: 'OVERDUE', balance: 70000 }),
    ];
    expect(computeOutstandingPaise(schedule, 100000)).toBe(toPaise(80000));
  });

  it('is the sanctioned principal when nothing has been settled', () => {
    const schedule = [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE', balance: 90000 })];
    expect(computeOutstandingPaise(schedule, 100000)).toBe(toPaise(100000));
  });
});

// ─── end-to-end ──────────────────────────────────────────────────────────────

describe('applyPayment — account transitions', () => {
  const threeRowLoan = (balances = [90000, 80000, 70000]): LoanAccount =>
    loan({
      schedule: [1, 2, 3].map((seq) =>
        row({ seq, dueDate: `2026-0${seq}-01`, status: 'UPCOMING', balance: balances[seq - 1] }),
      ),
    });

  it('OVERDUE → ACTIVE once arrears are cleared', () => {
    const out = applyPayment(threeRowLoan(), 20000, dayjs('2026-02-15')).loan;

    expect(out.paidCount).toBe(2);
    expect(out.status).toBe('ACTIVE');
    expect(out.dpd).toBe(0);
    expect(out.overdueAmount).toBe(0);
    expect(out.nextDueDate).toBe('2026-03-01');
    expect(out.collectionStatus).toBe('NORMAL');
    expect(out.advanceBalancePaise).toBe(0);
  });

  it('stays OVERDUE when only part of the arrears clears', () => {
    const out = applyPayment(threeRowLoan(), 10000, dayjs('2026-02-15')).loan;

    expect(out.paidCount).toBe(1);
    expect(out.status).toBe('OVERDUE');
    expect(out.dpd).toBe(14); // 2026-02-01 → 2026-02-15
    expect(out.overdueAmount).toBe(10000);
  });

  it('reaches CLOSED when every instalment settles', () => {
    const out = applyPayment(threeRowLoan([90000, 80000, 0]), 30000, dayjs('2026-03-05')).loan;

    expect(out.status).toBe('CLOSED');
    expect(out.paidCount).toBe(3);
    expect(out.dpd).toBe(0);
    expect(out.overdueAmount).toBe(0);
    expect(out.nextDueDate).toBeUndefined();
    expect(out.outstandingPrincipal).toBe(0);
  });

  it('an NPA account recovers to CLOSED when fully repaid', () => {
    const l = loan({
      status: 'NPA',
      dpd: 120,
      collectionStatus: 'LEGAL',
      schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE', balance: 0 })],
    });
    const out = applyPayment(l, 10000, dayjs('2026-05-01')).loan;

    expect(out.status).toBe('CLOSED');
    expect(out.collectionStatus).toBe('NORMAL');
  });

  it('BUG#4 FIXED end-to-end: a stale DUE tag can no longer hide an NPA', () => {
    const l = loan({
      schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'DUE', balance: 90000 })],
    });
    // pay nothing meaningful; the account must still classify from the calendar
    const out = applyPayment(l, 0, dayjs('2026-04-01')).loan;

    expect(out.dpd).toBe(90);
    expect(out.status).toBe('NPA');
    expect(out.schedule[0].status).toBe('OVERDUE');
  });

  it('keeps the existing collectionStatus while still in arrears', () => {
    const l = loan({
      collectionStatus: 'PTP',
      schedule: [1, 2].map((seq) => row({ seq, dueDate: `2026-0${seq}-01`, status: 'OVERDUE' })),
    });
    const out = applyPayment(l, 10000, dayjs('2026-02-15')).loan;

    expect(out.status).toBe('OVERDUE');
    expect(out.collectionStatus).toBe('PTP');
  });

  // ── BUG #6 (was it.fails) — the ledger must balance ───────────────────────
  it('BUG#6 FIXED: lastPaymentAmount is the tender, and the allocation balances it', () => {
    const l = loan({ schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE', balance: 0 })] });
    const { loan: out, allocation } = applyPayment(l, 15000, dayjs('2026-02-01'));

    expect(out.lastPaymentAmount).toBe(15000); // truthful about the tender
    expect(allocation.settledPaise).toBe(toPaise(10000)); // what reached instalments
    expect(allocation.closingAdvancePaise).toBe(toPaise(5000)); // where the rest went
    expect(out.advanceBalancePaise).toBe(toPaise(5000));
    expectConserved(allocation);

    // nothing unaccounted: settled + held === tendered
    expect(toRupees(allocation.settledPaise + allocation.closingAdvancePaise)).toBe(
      out.lastPaymentAmount,
    );
  });

  it('BUG#1+#6 FIXED: carried advance is applied automatically on the next payment', () => {
    const l = loan({
      schedule: [1, 2].map((seq) => row({ seq, dueDate: `2026-0${seq}-01`, status: 'OVERDUE' })),
    });

    const first = applyPayment(l, 6000, dayjs('2026-02-15')).loan;
    expect(first.paidCount).toBe(0);
    expect(first.advanceBalancePaise).toBe(toPaise(6000));

    const second = applyPayment(first, 14000, dayjs('2026-02-16'));
    expect(second.loan.paidCount).toBe(2);
    expect(second.loan.advanceBalancePaise).toBe(0);
    expect(second.allocation.openingAdvancePaise).toBe(toPaise(6000));
    expectConserved(second.allocation);
  });

  it('treats a loan with no advanceBalancePaise field as zero advance', () => {
    const l = loan({ schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' })] });
    expect(l.advanceBalancePaise).toBeUndefined();

    const { allocation } = applyPayment(l, 10000, dayjs('2026-02-01'));
    expect(allocation.openingAdvancePaise).toBe(0);
    expectConserved(allocation);
  });

  it('never mutates the input loan or its schedule', () => {
    const l = loan({ schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'OVERDUE' })] });
    applyPayment(l, 10000, dayjs('2026-02-01'));

    expect(l.schedule[0].status).toBe('OVERDUE');
    expect(l.paidCount).toBe(0);
    expect(l.advanceBalancePaise).toBeUndefined();
  });

  it('records the payment timestamp', () => {
    const l = loan({ schedule: [row({ seq: 1, dueDate: '2026-01-01', status: 'DUE' })] });
    const out = applyPayment(l, 10000, dayjs('2026-01-15')).loan;
    expect(out.lastPaymentDate).toBe(dayjs('2026-01-15').toDate().toISOString());
  });
});
