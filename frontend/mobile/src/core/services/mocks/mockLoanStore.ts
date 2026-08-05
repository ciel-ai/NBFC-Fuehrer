// In-memory store for loans created at runtime by the mock services (e.g. a CDL
// loan disbursed during the demo flow). Lets the dashboard and loan-detail
// screens reflect a freshly disbursed loan without a real backend.
// Replaced by real API responses when USE_MOCK is false.

import { calculateEMI } from '@/src/core/utils/formatters';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import {
  CDL_DEFAULT_AUTO_DEBIT_DATE,
  CDL_DEFAULT_INTEREST_RATE,
} from '@/src/entities/consumerDurableLoan';

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
 * Generate a reducing-balance EMI schedule. Due dates fall on the customer's
 * chosen auto-debit date (4th, 7th or 12th — client spec 1(d)).
 *
 * At 0% (no-cost EMI) the interest component is zero and the principal is split
 * evenly across the tenure.
 */
export function generateCdlSchedule(
  loanId: string,
  principal: number,
  tenure: number,
  startDate: Date = new Date(),
  annualRate: number = CDL_DEFAULT_INTEREST_RATE,
  debitDay: number = CDL_DEFAULT_AUTO_DEBIT_DATE,
): EMISchedule[] {
  const emi = calculateEMI(principal, annualRate, tenure);
  const monthlyRate = annualRate / 12 / 100;
  const schedule: EMISchedule[] = [];
  let balance = principal;

  // First due date is the chosen debit day of the month after disbursal.
  const firstDue = new Date(startDate.getFullYear(), startDate.getMonth() + 1, debitDay);

  for (let i = 0; i < tenure; i += 1) {
    const interest = Math.round(balance * monthlyRate);
    let principalPart = emi - interest;
    const isLast = i === tenure - 1;
    const amount = isLast ? balance + interest : emi;
    if (isLast) principalPart = balance;
    balance = Math.max(0, balance - principalPart);

    const dueDate = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, debitDay);
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
