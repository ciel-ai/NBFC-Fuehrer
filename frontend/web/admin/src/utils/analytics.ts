import dayjs from 'dayjs';
import type { LoanAccount, LoanApplication, Repayment } from '../types';

export interface TrendPoint { label: string; CDL: number; GOLD: number; HOUSING: number; total: number }

/** Applications submitted per week, last `weeks` weeks. */
export const weeklyAppTrend = (apps: LoanApplication[], weeks = 12): TrendPoint[] => {
  const out: TrendPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = dayjs().subtract(w, 'week').startOf('week');
    const end = start.endOf('week');
    const inWeek = apps.filter((a) => {
      const c = dayjs(a.createdAt);
      return (c.isAfter(start) || c.isSame(start)) && c.isBefore(end);
    });
    out.push({
      label: start.format('DD MMM'),
      CDL: inWeek.filter((a) => a.loanType === 'CDL').length,
      GOLD: inWeek.filter((a) => a.loanType === 'GOLD').length,
      HOUSING: inWeek.filter((a) => a.loanType === 'HOUSING').length,
      total: inWeek.length,
    });
  }
  return out;
};

export const typeDistribution = (apps: LoanApplication[]): { name: string; key: string; value: number; amount: number }[] => (
  (['CDL', 'GOLD', 'HOUSING'] as const).map((t) => ({
    name: t === 'CDL' ? 'Consumer Durable' : t === 'GOLD' ? 'Gold Loan' : 'Housing',
    key: t,
    value: apps.filter((a) => a.loanType === t).length,
    amount: apps.filter((a) => a.loanType === t).reduce((s, a) => s + a.loan.amount, 0),
  }))
);

export const approvalStats = (apps: LoanApplication[]): { approved: number; rejected: number; returned: number; pending: number; ratio: number } => {
  const decided = apps.filter((a) => a.creditDecision);
  const approved = decided.filter((a) => a.creditDecision!.decision === 'APPROVED').length;
  const rejected = decided.filter((a) => a.creditDecision!.decision === 'REJECTED').length;
  const returned = decided.filter((a) => a.creditDecision!.decision === 'RETURNED').length;
  const pending = apps.filter((a) => ['SUBMITTED', 'CREDIT_PENDING'].includes(a.status)).length;
  return {
    approved, rejected, returned, pending,
    ratio: decided.length ? Math.round((approved / decided.length) * 100) : 0,
  };
};

export const monthlyDisbursement = (loans: LoanAccount[], months = 6): { month: string; amount: number; count: number }[] => {
  const out: { month: string; amount: number; count: number }[] = [];
  for (let m = months - 1; m >= 0; m--) {
    const start = dayjs().subtract(m, 'month').startOf('month');
    const inMonth = loans.filter((l) => dayjs(l.disbursedOn).isSame(start, 'month'));
    out.push({
      month: start.format('MMM'),
      amount: inMonth.reduce((s, l) => s + l.principal, 0),
      count: inMonth.length,
    });
  }
  return out;
};

/** Demand vs collection from EMI schedules, last `months` months. */
export const collectionPerformance = (loans: LoanAccount[], months = 6): { month: string; due: number; collected: number; efficiency: number }[] => {
  const out: { month: string; due: number; collected: number; efficiency: number }[] = [];
  for (let m = months - 1; m >= 0; m--) {
    const start = dayjs().subtract(m, 'month').startOf('month');
    let due = 0;
    let collected = 0;
    loans.forEach((l) => {
      l.schedule.forEach((row) => {
        if (dayjs(row.dueDate).isSame(start, 'month') && dayjs(row.dueDate).isBefore(dayjs())) {
          due += row.emi;
          if (row.status === 'PAID') collected += row.paidAmount ?? row.emi;
        }
      });
    });
    out.push({
      month: start.format('MMM'),
      due,
      collected,
      efficiency: due ? Math.round((collected / due) * 100) : 100,
    });
  }
  return out;
};

export const riskGradeDist = (apps: LoanApplication[]): { grade: string; count: number }[] =>
  (['A', 'B', 'C', 'D'] as const).map((g) => ({
    grade: `Grade ${g}`,
    count: apps.filter((a) => a.creditDecision?.riskGrade === g).length,
  }));

export const dpdBucketDist = (loans: LoanAccount[]): { bucket: string; count: number; outstanding: number }[] => {
  const buckets = [
    { bucket: 'Current', test: (d: number) => d <= 0 },
    { bucket: '1–30', test: (d: number) => d >= 1 && d <= 30 },
    { bucket: '31–60', test: (d: number) => d >= 31 && d <= 60 },
    { bucket: '61–90', test: (d: number) => d >= 61 && d <= 90 },
    { bucket: '90+', test: (d: number) => d > 90 },
  ];
  const open = loans.filter((l) => l.status !== 'CLOSED');
  return buckets.map(({ bucket, test }) => ({
    bucket,
    count: open.filter((l) => test(l.dpd)).length,
    outstanding: open.filter((l) => test(l.dpd)).reduce((s, l) => s + l.outstandingPrincipal, 0),
  }));
};

export const disbursementModeSplit = (apps: LoanApplication[]): { name: string; value: number }[] => {
  const disbursed = apps.filter((a) => a.finance?.disbursement);
  return (['NEFT', 'RTGS', 'IMPS'] as const)
    .map((m) => ({ name: m, value: disbursed.filter((a) => a.finance!.disbursement!.mode === m).length }))
    .filter((x) => x.value > 0);
};

export const recoveryThisMonth = (repayments: Repayment[]): number =>
  repayments
    .filter((r) => r.type === 'RECOVERY' && r.status === 'SUCCESS' && dayjs(r.date).isSame(dayjs(), 'month'))
    .reduce((s, r) => s + r.amount, 0);
