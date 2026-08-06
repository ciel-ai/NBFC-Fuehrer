import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  approvalStats,
  collectionPerformance,
  disbursementModeSplit,
  dpdBucketDist,
  monthlyDisbursement,
  recoveryThisMonth,
  riskGradeDist,
  typeDistribution,
  weeklyAppTrend,
} from '../analytics';
import type { LoanAccount, LoanApplication, Repayment } from '../../types';

const app = (partial: Partial<LoanApplication>): LoanApplication => partial as LoanApplication;
const loan = (partial: Partial<LoanAccount>): LoanAccount => partial as LoanAccount;

describe('analytics', () => {
  it('groups applications by week and product', () => {
    const result = weeklyAppTrend([
      app({ createdAt: dayjs().toISOString(), loanType: 'GOLD' }),
      app({ createdAt: dayjs().toISOString(), loanType: 'CDL' }),
    ], 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ GOLD: 1, CDL: 1, HOUSING: 0, total: 2 });
  });

  it('computes type distribution and approved amounts', () => {
    const result = typeDistribution([
      app({ loanType: 'GOLD', loan: { amount: 500 } as LoanApplication['loan'] }),
      app({ loanType: 'GOLD', loan: { amount: 700 } as LoanApplication['loan'] }),
      app({ loanType: 'CDL', loan: { amount: 100 } as LoanApplication['loan'] }),
    ]);

    expect(result).toEqual([
      { name: 'Consumer Durable', key: 'CDL', value: 1, amount: 100 },
      { name: 'Gold Loan', key: 'GOLD', value: 2, amount: 1200 },
      { name: 'Housing', key: 'HOUSING', value: 0, amount: 0 },
    ]);
  });

  it('summarises credit decisions and pending applications', () => {
    const result = approvalStats([
      app({ creditDecision: { decision: 'APPROVED' } as LoanApplication['creditDecision'], status: 'CREDIT_APPROVED' }),
      app({ creditDecision: { decision: 'REJECTED' } as LoanApplication['creditDecision'], status: 'CREDIT_REJECTED' }),
      app({ creditDecision: { decision: 'RETURNED' } as LoanApplication['creditDecision'], status: 'CREDIT_RETURNED' }),
      app({ status: 'SUBMITTED' }),
    ]);

    expect(result).toEqual({ approved: 1, rejected: 1, returned: 1, pending: 1, ratio: 33 });
    expect(approvalStats([]).ratio).toBe(0);
  });

  it('groups disbursements for the requested month', () => {
    const result = monthlyDisbursement([
      loan({ disbursedOn: dayjs().toISOString(), principal: 1250 }),
    ], 1);

    expect(result).toEqual([{ month: dayjs().format('MMM'), amount: 1250, count: 1 }]);
  });

  it('computes collection efficiency for due and paid instalments', () => {
    const result = collectionPerformance([
      loan({ schedule: [
        { dueDate: dayjs().subtract(1, 'day').toISOString(), emi: 100, status: 'PAID', paidAmount: 80 },
        { dueDate: dayjs().subtract(1, 'day').toISOString(), emi: 50, status: 'DUE' },
      ] as LoanAccount['schedule'] }),
    ], 1);

    expect(result[0]).toMatchObject({ due: 150, collected: 80, efficiency: 53 });
    expect(collectionPerformance([], 1)[0]).toMatchObject({ due: 0, collected: 0, efficiency: 100 });
  });

  it('builds risk, DPD and disbursement-mode distributions', () => {
    expect(riskGradeDist([
      app({ creditDecision: { riskGrade: 'A' } as LoanApplication['creditDecision'] }),
    ])[0]).toEqual({ grade: 'Grade A', count: 1 });

    const dpd = dpdBucketDist([
      loan({ status: 'ACTIVE', dpd: 0, outstandingPrincipal: 100 }),
      loan({ status: 'ACTIVE', dpd: 45, outstandingPrincipal: 200 }),
      loan({ status: 'CLOSED', dpd: 100, outstandingPrincipal: 999 }),
    ]);
    expect(dpd).toContainEqual({ bucket: 'Current', count: 1, outstanding: 100 });
    expect(dpd).toContainEqual({ bucket: '31–60', count: 1, outstanding: 200 });
    expect(dpd.find((item) => item.bucket === '90+')).toMatchObject({ count: 0, outstanding: 0 });

    expect(disbursementModeSplit([
      app({ finance: { disbursement: { mode: 'NEFT' } } as LoanApplication['finance'] }),
      app({ finance: { disbursement: { mode: 'IMPS' } } as LoanApplication['finance'] }),
    ])).toEqual([{ name: 'NEFT', value: 1 }, { name: 'IMPS', value: 1 }]);
  });

  it('counts only successful recoveries in the current month', () => {
    const repayments = [
      { type: 'RECOVERY', status: 'SUCCESS', date: dayjs().toISOString(), amount: 300 },
      { type: 'RECOVERY', status: 'FAILED', date: dayjs().toISOString(), amount: 400 },
      { type: 'RECOVERY', status: 'SUCCESS', date: dayjs().subtract(1, 'month').toISOString(), amount: 500 },
    ] as Repayment[];

    expect(recoveryThisMonth(repayments)).toBe(300);
  });
});
