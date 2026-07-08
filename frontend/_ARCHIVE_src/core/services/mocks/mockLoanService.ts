import { mockDelay } from '../../api/api';
import type { ILoanService } from '../interfaces/ILoanService';
import type { Loan, EMISchedule, LoanApplication, ApplyLoanResponse } from '@/src/entities/loan';
import { getRuntimeLoan, getRuntimeLoans, getRuntimeSchedule } from './mockLoanStore';

const MOCK_ACTIVE_LOANS: Loan[] = [
  {
    id: 'gold_loan_001',
    type: 'gold_loan',
    amount: 139500,
    emi: 27850,
    tenure: 6,
    status: 'active',
    disbursedAt: '2026-05-20',
    nextDueDate: '2026-06-05',
    outstandingAmount: 139500,
    applicationStatus: 'repayment',
    bankAccount: 'HDFC ****4521',
  },
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
    id: 'gold_emi_001',
    loanId: 'gold_loan_001',
    dueDate: '2026-06-05',
    amount: 27850,
    principal: 25500,
    interest: 2350,
    status: 'pending',
  },
  {
    id: 'gold_emi_002',
    loanId: 'gold_loan_001',
    dueDate: '2026-07-05',
    amount: 27850,
    principal: 25750,
    interest: 2100,
    status: 'pending',
  },
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

export const mockLoanService: ILoanService = {
  async getActiveLoans() {
    // Runtime-disbursed loans (e.g. a CDL loan completed in this session) appear first.
    return mockDelay([...getRuntimeLoans(), ...MOCK_ACTIVE_LOANS], 800);
  },

  async getLoanById(id) {
    const loan = getRuntimeLoan(id) ?? MOCK_ACTIVE_LOANS.find((l) => l.id === id);
    if (!loan) throw new Error('Loan not found');
    return mockDelay(loan, 500);
  },

  async getEMISchedule(loanId) {
    const runtime = getRuntimeSchedule(loanId);
    if (runtime) return mockDelay(runtime, 600);
    return mockDelay(MOCK_EMI_SCHEDULE.filter((e) => e.loanId === loanId), 600);
  },

  async applyLoan(application) {
    return mockDelay<ApplyLoanResponse>({
      success: true,
      applicationId: 'app_' + Date.now(),
      message: 'Application submitted successfully! We will review it shortly.',
    }, 1500);
  },

  async registerGoldLoanNotification(userId) {
    await mockDelay(null, 500);
  },
};
