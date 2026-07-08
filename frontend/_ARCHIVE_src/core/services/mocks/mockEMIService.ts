import { mockDelay } from '../../api/api';
import type { IEMIService } from '../interfaces/IEMIService';
import type { Loan, EMISchedule, LoanSummary } from '@/src/entities/loan';

const MOCK_ACTIVE_LOANS: Loan[] = [
  {
    id: 'loan_001',
    type: 'consumer_durable',
    amount: 50000,
    emi: 4582,
    tenure: 12,
    status: 'active',
    disbursedAt: '2023-04-15',
    nextDueDate: '2023-10-15',
    outstandingAmount: 27492,
    applicationStatus: 'repayment',
    bankAccount: 'HDFC ****4521',
  },
];

const MOCK_EMI_SCHEDULE: EMISchedule[] = [
  {
    id: 'emi_001',
    loanId: 'loan_001',
    dueDate: '2023-10-15',
    amount: 4582,
    principal: 3832,
    interest: 750,
    status: 'pending',
  },
  {
    id: 'emi_002',
    loanId: 'loan_001',
    dueDate: '2023-09-15',
    amount: 4582,
    principal: 3780,
    interest: 802,
    status: 'paid',
    paidAt: '2023-09-14',
  },
];

export const mockEMIService: IEMIService = {
  async getEMISchedule(loanId: string): Promise<EMISchedule[]> {
    return mockDelay(
      MOCK_EMI_SCHEDULE.filter((e) => e.loanId === loanId),
      600,
    );
  },

  async getActiveLoans(): Promise<Loan[]> {
    return mockDelay([...MOCK_ACTIVE_LOANS], 800);
  },

  async getLoanSummary(loanId: string): Promise<LoanSummary> {
    const loan = MOCK_ACTIVE_LOANS.find((l) => l.id === loanId);
    if (!loan) throw new Error(`Loan ${loanId} not found`);
    const paid = MOCK_EMI_SCHEDULE.filter(
      (e) => e.loanId === loanId && e.status === 'paid',
    ).length;
    return mockDelay<LoanSummary>(
      {
        loanId: loan.id,
        type: loan.type,
        totalAmount: loan.amount,
        disbursedAmount: loan.amount,
        outstandingAmount: loan.outstandingAmount,
        totalEMIs: loan.tenure,
        paidEMIs: paid,
        remainingEMIs: loan.tenure - paid,
        nextDueDate: loan.nextDueDate,
        nextEMIAmount: loan.emi,
        interestRate: 14.5,
        tenure: loan.tenure,
        status: loan.status,
      },
      500,
    );
  },
};
