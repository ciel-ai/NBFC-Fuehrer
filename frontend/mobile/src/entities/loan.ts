export type LoanType =
  | 'consumer_durable'
  | 'affordable_housing'
  | 'gold_loan';

export type LoanStatus =
  | 'applied'
  | 'under_review'
  | 'approved'
  | 'disbursed'
  | 'active'
  | 'closed'
  | 'rejected';

export type ApplicationStatus = 'applied' | 'approved' | 'repayment';

export interface Loan {
  id: string;
  type: LoanType;
  amount: number;
  emi: number;
  tenure: number; // months
  status: LoanStatus;
  disbursedAt: string;
  nextDueDate: string;
  outstandingAmount: number;
  applicationStatus: ApplicationStatus;
  bankAccount?: string;
}

export interface EMISchedule {
  id: string;
  loanId: string;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface LoanApplication {
  type: LoanType;
  amount: number;
  tenure: number;
  purpose?: string;
  productName?: string;
  vendorName?: string;
}

export interface ApplyLoanResponse {
  success: boolean;
  applicationId: string;
  message: string;
}

export interface LoanSummary {
  loanId: string;
  type: LoanType;
  totalAmount: number;
  disbursedAmount: number;
  outstandingAmount: number;
  totalEMIs: number;
  paidEMIs: number;
  remainingEMIs: number;
  nextDueDate: string;
  nextEMIAmount: number;
  interestRate: number;
  tenure: number;
  status: LoanStatus;
}

export interface LoanState {
  activeLoans: Loan[];
  emiSchedule: EMISchedule[];
  applicationStatus: ApplicationStatus | null;
  goldLoanNotifyMe: boolean;
  isLoading: boolean;
  error: string | null;
}
