import type { Loan, EMISchedule, LoanApplication, ApplyLoanResponse } from '@/src/entities/loan';

export interface ILoanService {
  getActiveLoans(): Promise<Loan[]>;
  getLoanById(id: string): Promise<Loan>;
  getEMISchedule(loanId: string): Promise<EMISchedule[]>;
  applyLoan(application: LoanApplication): Promise<ApplyLoanResponse>;
  registerGoldLoanNotification(userId: string): Promise<void>;
}
