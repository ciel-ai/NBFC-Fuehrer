import { describe, expect, it } from 'vitest';
import {
  buildWaiverDeviation,
  canDecideDeviation,
  isApprovalBlocked,
  openDeviations,
} from '../deviations';
import type { Deviation, DeviationSeverity } from '../../types';

/* ============================================================================
 * The four-eyes gate (gate G2).
 *
 * Two rules protect an out-of-policy sanction:
 *   1. An APPROVED decision is refused while any deviation is still OPEN —
 *      mirrors the client guard in CreditDecisionDrawer.tsx and the server's
 *      409 OPEN_DEVIATIONS. Someone other than the raiser must clear it.
 *   2. Waiving a verification (TVR/CPV) does not make the check disappear — it
 *      auto-raises an L1 deviation, which then trips rule 1. Skipping a step
 *      therefore still costs an explicit, attributable credit decision.
 *
 * These assert the pure helpers, not the store or the drawer.
 * ==========================================================================*/

const dev = (over: Partial<Deviation> = {}): Deviation => ({
  id: 'dev_1',
  code: 'LTV_ABOVE_CAP',
  category: 'LTV',
  severity: 'L2',
  description: 'LTV 78% exceeds the 75% policy cap',
  raisedBy: 'SYSTEM',
  status: 'OPEN',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

// ─── rule 1: OPEN deviations block approval ──────────────────────────────────

describe('isApprovalBlocked — an OPEN deviation stops a sanction', () => {
  it('blocks APPROVED while a deviation is OPEN', () => {
    expect(isApprovalBlocked('APPROVED', [dev()])).toBe(true);
  });

  it('allows APPROVED once every deviation is decided', () => {
    expect(
      isApprovalBlocked('APPROVED', [
        dev({ id: 'a', status: 'APPROVED' }),
        dev({ id: 'b', status: 'REJECTED' }),
        dev({ id: 'c', status: 'WITHDRAWN' }),
      ]),
    ).toBe(false);
  });

  it('blocks if even one of several deviations is still OPEN', () => {
    expect(
      isApprovalBlocked('APPROVED', [
        dev({ id: 'a', status: 'APPROVED' }),
        dev({ id: 'b', status: 'OPEN' }),
      ]),
    ).toBe(true);
  });

  it('allows APPROVED when there are no deviations at all', () => {
    expect(isApprovalBlocked('APPROVED', [])).toBe(false);
    expect(isApprovalBlocked('APPROVED', undefined)).toBe(false);
  });

  it('never blocks REJECTED or RETURNED — declining needs no exception approval', () => {
    expect(isApprovalBlocked('REJECTED', [dev()])).toBe(false);
    expect(isApprovalBlocked('RETURNED', [dev()])).toBe(false);
  });

  it('an L1 deviation blocks just as hard as an L2', () => {
    expect(isApprovalBlocked('APPROVED', [dev({ severity: 'L1' })])).toBe(true);
  });
});

describe('openDeviations', () => {
  it('returns only the OPEN rows', () => {
    const list = [
      dev({ id: 'a', status: 'OPEN' }),
      dev({ id: 'b', status: 'APPROVED' }),
      dev({ id: 'c', status: 'OPEN' }),
    ];
    expect(openDeviations(list).map((d) => d.id)).toEqual(['a', 'c']);
  });

  it('treats a missing list as none open', () => {
    expect(openDeviations(undefined)).toEqual([]);
  });
});

// ─── rule 2: a waiver auto-raises an L1 deviation ────────────────────────────

describe('buildWaiverDeviation — waiving a verification still costs a decision', () => {
  const AT = '2026-08-03T10:00:00.000Z';

  it.each(['TVR', 'CPV'] as const)('a %s waiver raises an OPEN L1 deviation', (kind) => {
    const d = buildWaiverDeviation(kind, 'Customer unreachable after 3 attempts', 'R. Iyer', 'DEV-1', AT);

    expect(d.severity).toBe('L1');
    expect(d.status).toBe('OPEN');
    expect(d.code).toBe(`${kind}_WAIVED`);
    expect(d.category).toBe('OTHER');
    expect(d.raisedBy).toBe('R. Iyer');
    expect(d.createdAt).toBe(AT);
    expect(d.description).toContain('Customer unreachable after 3 attempts');
  });

  it('the raised deviation is itself enough to block an approval', () => {
    const d = buildWaiverDeviation('TVR', 'Waived by credit manager', 'R. Iyer', 'DEV-1', AT);
    expect(isApprovalBlocked('APPROVED', [d])).toBe(true);
  });

  it('a waiver deviation added to a clean file flips it from approvable to blocked', () => {
    const clean: Deviation[] = [];
    expect(isApprovalBlocked('APPROVED', clean)).toBe(false);

    const withWaiver = [...clean, buildWaiverDeviation('CPV', 'Address not traceable', 'S. Rao', 'DEV-2', AT)];
    expect(isApprovalBlocked('APPROVED', withWaiver)).toBe(true);
  });
});

// ─── who may clear the gate ──────────────────────────────────────────────────

describe('canDecideDeviation — the second pair of eyes must be senior enough', () => {
  const cases: [string, DeviationSeverity, boolean][] = [
    ['ADMIN', 'L1', true],
    ['ADMIN', 'L2', true],
    ['CREDIT_MANAGER', 'L1', true],
    ['CREDIT_MANAGER', 'L2', true],
    ['BRANCH_MANAGER', 'L1', true],
    ['BRANCH_MANAGER', 'L2', false],
  ];

  it.each(cases)('%s may decide %s → %s', (role, severity, expected) => {
    expect(canDecideDeviation(role as Parameters<typeof canDecideDeviation>[0], severity)).toBe(expected);
  });

  it('a branch manager cannot clear the L2 that blocks the file', () => {
    const l2 = dev({ severity: 'L2' });
    expect(isApprovalBlocked('APPROVED', [l2])).toBe(true);
    expect(canDecideDeviation('BRANCH_MANAGER', l2.severity)).toBe(false);
  });

  it('a branch manager CAN clear the L1 raised by a verification waiver', () => {
    const waiver = buildWaiverDeviation('TVR', 'x', 'R. Iyer', 'DEV-1', '2026-08-03T10:00:00.000Z');
    expect(canDecideDeviation('BRANCH_MANAGER', waiver.severity)).toBe(true);
  });
});
