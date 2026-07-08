// In-memory store for loans created at runtime by the mock services (e.g. a CDL
// loan disbursed during the demo flow). Lets the dashboard and loan-detail
// screens reflect a freshly disbursed loan without a real backend.
// Replaced by real API responses when USE_MOCK is false.

import { calculateEMI } from '@/src/core/utils/formatters';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import { CDL_ANNUAL_INTEREST_RATE } from '@/src/entities/consumerDurableLoan';

const runtimeLoans: Loan[] = [];
const runtimeSchedules: Record<string, EMISchedule[]> = {};

export function addRuntimeLoan(loan: Loan, schedule: EMISchedule[]): void {
  const existing = runtimeLoans.findIndex((l) => l.id === loan.id);
  if (existing >= 0) runtimeLoans[existing] = loan;
  else runtimeLoans.unshift(loan);
  runtimeSchedules[loan.id] = schedule;
}

export function getRuntimeLoans(): Loan[] {
  return runtimeLoans;
}

export function getRuntimeLoan(id: string): Loan | undefined {
  return runtimeLoans.find((l) => l.id === id);
}

export function getRuntimeSchedule(loanId: string): EMISchedule[] | undefined {
  return runtimeSchedules[loanId];
}

export function setRuntimeSchedule(loanId: string, schedule: EMISchedule[]): void {
  runtimeSchedules[loanId] = schedule;
}

export function updateRuntimeLoan(id: string, patch: Partial<Loan>): void {
  const idx = runtimeLoans.findIndex((l) => l.id === id);
  if (idx >= 0) runtimeLoans[idx] = { ...runtimeLoans[idx], ...patch };
}

/**
 * Generate a reducing-balance EMI schedule. Due dates fall on the 5th of each
 * month (matches the NACH auto-debit date in the LMS workflow).
 */
export function generateCdlSchedule(
  loanId: string,
  principal: number,
  tenure: number,
  startDate: Date = new Date(),
  annualRate: number = CDL_ANNUAL_INTEREST_RATE,
): EMISchedule[] {
  const emi = calculateEMI(principal, annualRate, tenure);
  const monthlyRate = annualRate / 12 / 100;
  const schedule: EMISchedule[] = [];
  let balance = principal;

  // First due date is the 5th of the month after disbursal.
  const firstDue = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 5);

  for (let i = 0; i < tenure; i += 1) {
    const interest = Math.round(balance * monthlyRate);
    let principalPart = emi - interest;
    const isLast = i === tenure - 1;
    const amount = isLast ? balance + interest : emi;
    if (isLast) principalPart = balance;
    balance = Math.max(0, balance - principalPart);

    const dueDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, 5);
    schedule.push({
      id: `${loanId}_emi_${String(i + 1).padStart(2, '0')}`,
      loanId,
      dueDate: dueDate.toISOString().slice(0, 10),
      amount,
      principal: principalPart,
      interest,
      status: 'pending',
    });
  }

  return schedule;
}
