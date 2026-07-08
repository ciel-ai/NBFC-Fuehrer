import type { Loan, EMISchedule, LoanSummary } from '@/src/entities/loan';

export interface IEMIService {
  getEMISchedule(loanId: string): Promise<EMISchedule[]>;
  getActiveLoans(): Promise<Loan[]>;
  getLoanSummary(loanId: string): Promise<LoanSummary>;
}
