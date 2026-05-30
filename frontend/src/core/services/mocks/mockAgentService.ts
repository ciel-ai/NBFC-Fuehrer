import { mockDelay } from '../../api/api';
import type { IAgentService } from '../interfaces/IAgentService';
import type {
  AgentLoan,
  AgentLoanDetail,
  OverdueAccount,
  AgentLoanStatus,
  UpdateLoanStatusResponse,
  AgentDashboardStats,
  AgentPendingCounters,
  AgentReviewDecisionInput,
  AgentActionResult,
  GoldAuctionRecord,
  GoldAuctionStatus,
  LegalNoticeRecord,
  GoldPriceAlert,
} from '@/src/entities/agent';

const ref = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;

const MOCK_ASSIGNED_LOANS: AgentLoan[] = [
  {
    id: 'loan_001',
    customerId: 'usr_001',
    customerName: 'Arjun Kumar',
    customerPhone: '+91 9800000012',
    loanType: 'consumer_durable',
    amount: 50000,
    outstandingAmount: 27492,
    status: 'active',
    disbursedAt: '2023-04-15',
    nextDueDate: '2023-10-15',
  },
  {
    id: 'loan_002',
    customerId: 'usr_002',
    customerName: 'Priya Sharma',
    customerPhone: '+91 9900000023',
    loanType: 'affordable_housing',
    amount: 1500000,
    outstandingAmount: 1420000,
    status: 'active',
    disbursedAt: '2023-03-01',
    nextDueDate: '2023-10-01',
  },
];

const MOCK_OVERDUE: OverdueAccount[] = [
  {
    loanId: 'loan_003',
    customerId: 'usr_003',
    customerName: 'Rajesh Nair',
    customerPhone: '+91 9700000034',
    loanType: 'gold_loan',
    outstandingAmount: 85000,
    daysOverdue: 12,
    lastContactDate: '2023-10-05',
    lastPaymentDate: '2023-08-15',
  },
];

export const mockAgentService: IAgentService = {
  async getAssignedLoans(): Promise<AgentLoan[]> {
    return mockDelay([...MOCK_ASSIGNED_LOANS], 700);
  },

  async getOverdueAccounts(): Promise<OverdueAccount[]> {
    return mockDelay([...MOCK_OVERDUE], 700);
  },

  async getLoanDetail(loanId: string): Promise<AgentLoanDetail> {
    const loan = MOCK_ASSIGNED_LOANS.find((l) => l.id === loanId);
    if (!loan) throw new Error(`Loan ${loanId} not found`);
    return mockDelay<AgentLoanDetail>(
      {
        ...loan,
        customerEmail: 'arjun@example.com',
        panNumber: 'ABCDE****F',
        address: '42, MG Road, Indiranagar, Bangalore 560038',
        emiAmount: 4582,
        tenure: 12,
        interestRate: 14.5,
        bankAccount: 'HDFC ****4521',
        agentRemarks: '',
      },
      500,
    );
  },

  async updateLoanStatus(
    loanId: string,
    status: AgentLoanStatus,
    remarks?: string,
  ): Promise<UpdateLoanStatusResponse> {
    await mockDelay(null, 600);
    return {
      success: true,
      loanId,
      status,
      message: `Loan status updated to ${status}.`,
    };
  },

  async getDashboardStats(): Promise<AgentDashboardStats> {
    return mockDelay<AgentDashboardStats>(
      {
        assignedLoansCount: MOCK_ASSIGNED_LOANS.length,
        overdueAccountsCount: MOCK_OVERDUE.length,
        collectedAmountToday: 9164,
        targetAmountToday: 50000,
        totalOutstanding: 1532492,
      },
      500,
    );
  },

  // --- LOS review queues -----------------------------------------------------

  async getPendingCounters(): Promise<AgentPendingCounters> {
    // Only flagged / mandatory-review cases are counted — auto-approved and
    // auto-rejected (AML) applications never appear here.
    return mockDelay<AgentPendingCounters>(
      {
        kycReview: 5,
        complianceReview: 2,
        creditReview: 8,
        goldAppraisal: 3,
        housingReview: 4,
        overdueFollowup: 22,
      },
      500,
    );
  },

  async submitReviewDecision(input: AgentReviewDecisionInput): Promise<AgentActionResult> {
    await mockDelay(null, 700);
    const verb =
      input.outcome === 'approve' ? 'approved'
      : input.outcome === 'reject' ? 'rejected'
      : 'returned for more documents';
    return { success: true, message: `Application ${input.applicationId} ${verb}.` };
  },

  async confirmGoldAppraisal(applicationId: string): Promise<AgentActionResult> {
    await mockDelay(null, 800);
    // Locks the final loan amount and lets the LOS proceed automatically.
    return { success: true, message: `Appraisal confirmed for ${applicationId}. LOS will proceed automatically.` };
  },

  // --- LMS recovery actions --------------------------------------------------

  async logCallOutcome(loanId: string, outcome: string): Promise<AgentActionResult> {
    await mockDelay(null, 600);
    return { success: true, message: `Call outcome "${outcome}" saved against ${loanId}.` };
  },

  async escalateCase(loanId, recipient): Promise<AgentActionResult> {
    await mockDelay(null, 700);
    return { success: true, message: `${loanId} escalated to ${recipient === 'legal' ? 'legal team' : 'senior recovery officer'}.` };
  },

  async initiateGoldAuction(loanId: string): Promise<GoldAuctionRecord> {
    return mockDelay<GoldAuctionRecord>(
      {
        loanId,
        auctionId: ref('AUC'),
        status: 'initiated',
        daysOverdue: 92,
        outstanding: 158607,
        reservePrice: 172000,
        auctionDate: null,
        message: 'Auction initiated per RBI gold-loan guidelines (90+ days overdue).',
      },
      900,
    );
  },

  async updateAuctionStatus(loanId: string, status: GoldAuctionStatus): Promise<GoldAuctionRecord> {
    return mockDelay<GoldAuctionRecord>(
      {
        loanId,
        auctionId: ref('AUC'),
        status,
        daysOverdue: 92,
        outstanding: 158607,
        reservePrice: 172000,
        auctionDate: status === 'scheduled' || status === 'completed'
          ? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
          : null,
        message: `Auction status updated to "${status}".`,
      },
      800,
    );
  },

  async getLegalNotice(loanId: string): Promise<LegalNoticeRecord> {
    return mockDelay<LegalNoticeRecord>(
      {
        loanId,
        noticeId: ref('LGL'),
        currentStage: 'Demand notice sent',
        daysOverdue: 34,
        stages: [
          { stage: 'Case flagged (30+ days)', date: '2026-05-01', status: 'done' },
          { stage: 'Demand notice sent', date: '2026-05-10', status: 'active' },
          { stage: 'SARFAESI 13(2) notice', date: null, status: 'pending' },
          { stage: 'Possession / attachment', date: null, status: 'pending' },
        ],
      },
      800,
    );
  },

  async advanceLegalNotice(loanId: string): Promise<LegalNoticeRecord> {
    return mockDelay<LegalNoticeRecord>(
      {
        loanId,
        noticeId: ref('LGL'),
        currentStage: 'SARFAESI 13(2) notice',
        daysOverdue: 34,
        stages: [
          { stage: 'Case flagged (30+ days)', date: '2026-05-01', status: 'done' },
          { stage: 'Demand notice sent', date: '2026-05-10', status: 'done' },
          { stage: 'SARFAESI 13(2) notice', date: new Date().toISOString().slice(0, 10), status: 'active' },
          { stage: 'Possession / attachment', date: null, status: 'pending' },
        ],
      },
      800,
    );
  },

  async getGoldPriceAlert(loanId: string): Promise<GoldPriceAlert> {
    return mockDelay<GoldPriceAlert>(
      {
        loanId,
        customerName: 'Rajesh Nair',
        currentLtv: 92,
        thresholdLtv: 90,
        outstanding: 158607,
        currentGoldValue: 172400,
        topUpRequired: 13500,
      },
      700,
    );
  },
};
