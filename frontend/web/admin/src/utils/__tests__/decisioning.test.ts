import { describe, it, expect } from 'vitest';
import { canDecideDeviation } from '../deviations';
import { tvrStatus, cpvStatus } from '../verification';
import type { CpvRecord, LoanApplication, TvrRecord } from '../../types';

const app = (partial: Partial<LoanApplication>): LoanApplication =>
  partial as unknown as LoanApplication;

describe('canDecideDeviation — L1/L2 split (Sprint-4 §2)', () => {
  it('Admin decides both severities', () => {
    expect(canDecideDeviation('ADMIN', 'L1')).toBe(true);
    expect(canDecideDeviation('ADMIN', 'L2')).toBe(true);
  });

  it('Credit Manager decides both severities', () => {
    expect(canDecideDeviation('CREDIT_MANAGER', 'L1')).toBe(true);
    expect(canDecideDeviation('CREDIT_MANAGER', 'L2')).toBe(true);
  });

  it('Branch Manager decides L1 only', () => {
    expect(canDecideDeviation('BRANCH_MANAGER', 'L1')).toBe(true);
    expect(canDecideDeviation('BRANCH_MANAGER', 'L2')).toBe(false);
  });

  it('Finance / sales cannot decide deviations', () => {
    expect(canDecideDeviation('FINANCE', 'L1')).toBe(false);
    expect(canDecideDeviation('SALES_GOLD', 'L2')).toBe(false);
  });
});

describe('tvrStatus', () => {
  it('PENDING with no attempts', () => {
    expect(tvrStatus(app({}))).toBe('PENDING');
  });
  it('reflects the latest attempt outcome', () => {
    expect(tvrStatus(app({ tvr: [{ outcome: 'NEGATIVE' } as TvrRecord] }))).toBe('NEGATIVE');
  });
  it('waiver wins over attempts', () => {
    expect(
      tvrStatus(app({ tvr: [{ outcome: 'POSITIVE' } as TvrRecord], tvrWaiver: { remarks: 'x', by: 'a', role: 'ADMIN', at: 'now' } })),
    ).toBe('WAIVED');
  });
});

describe('cpvStatus', () => {
  it('PENDING with no visits', () => {
    expect(cpvStatus(app({}))).toBe('PENDING');
  });
  it('POSITIVE / NEGATIVE pass through', () => {
    expect(cpvStatus(app({ cpv: [{ outcome: 'POSITIVE' } as CpvRecord] }))).toBe('POSITIVE');
    expect(cpvStatus(app({ cpv: [{ outcome: 'NEGATIVE' } as CpvRecord] }))).toBe('NEGATIVE');
  });
  it('DOOR_LOCKED / ADDRESS_NOT_FOUND fold to INCONCLUSIVE', () => {
    expect(cpvStatus(app({ cpv: [{ outcome: 'DOOR_LOCKED' } as CpvRecord] }))).toBe('INCONCLUSIVE');
    expect(cpvStatus(app({ cpv: [{ outcome: 'ADDRESS_NOT_FOUND' } as CpvRecord] }))).toBe('INCONCLUSIVE');
  });
  it('waiver wins', () => {
    expect(
      cpvStatus(app({ cpv: [{ outcome: 'POSITIVE' } as CpvRecord], cpvWaiver: { remarks: 'x', by: 'a', role: 'ADMIN', at: 'now' } })),
    ).toBe('WAIVED');
  });
});
