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

export interface IAgentService {
  getAssignedLoans(): Promise<AgentLoan[]>;
  getOverdueAccounts(): Promise<OverdueAccount[]>;
  getLoanDetail(loanId: string): Promise<AgentLoanDetail>;
  updateLoanStatus(loanId: string, status: AgentLoanStatus, remarks?: string): Promise<UpdateLoanStatusResponse>;
  getDashboardStats(): Promise<AgentDashboardStats>;

  // LOS review queues
  getPendingCounters(): Promise<AgentPendingCounters>;
  submitReviewDecision(input: AgentReviewDecisionInput): Promise<AgentActionResult>;
  /** Locks the final loan amount and lets the LOS proceed automatically. */
  confirmGoldAppraisal(applicationId: string): Promise<AgentActionResult>;

  // LMS recovery actions
  logCallOutcome(loanId: string, outcome: string, notes?: string): Promise<AgentActionResult>;
  escalateCase(loanId: string, recipient: 'senior' | 'legal', notes: string): Promise<AgentActionResult>;
  initiateGoldAuction(loanId: string): Promise<GoldAuctionRecord>;
  updateAuctionStatus(loanId: string, status: GoldAuctionStatus): Promise<GoldAuctionRecord>;
  getLegalNotice(loanId: string): Promise<LegalNoticeRecord>;
  advanceLegalNotice(loanId: string): Promise<LegalNoticeRecord>;
  getGoldPriceAlert(loanId: string): Promise<GoldPriceAlert>;
}
