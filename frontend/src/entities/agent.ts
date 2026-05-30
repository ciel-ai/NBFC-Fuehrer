// ---------------------------------------------------------------------------
// Agent Entities  (field-agent / collection-agent portal)
// ---------------------------------------------------------------------------

import type { LoanStatus, LoanType } from './loan';

export interface AgentDashboardStats {
  assignedLoansCount: number;
  overdueAccountsCount: number;
  /** Sum of all payments collected today by this agent. */
  collectedAmountToday: number;
  /** Daily collection target assigned to this agent. */
  targetAmountToday: number;
  totalOutstanding: number;
}

export interface AgentLoan {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  loanType: LoanType;
  amount: number;
  outstandingAmount: number;
  status: LoanStatus;
  disbursedAt: string;
  nextDueDate?: string;
}

export interface AgentLoanDetail extends AgentLoan {
  customerEmail?: string;
  panNumber?: string; // masked (e.g. ABCDE****F)
  address?: string;
  emiAmount: number;
  tenure: number;
  interestRate: number;
  bankAccount?: string;
  agentRemarks?: string;
}

export interface OverdueAccount {
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  loanType: LoanType;
  outstandingAmount: number;
  daysOverdue: number;
  lastContactDate?: string;
  lastPaymentDate?: string;
}

/** Subset of LoanStatus usable by a field agent. */
export type AgentLoanStatus = 'active' | 'overdue' | 'closed' | 'npa';

export interface UpdateLoanStatusRequest {
  status: AgentLoanStatus;
  remarks?: string;
}

export interface UpdateLoanStatusResponse {
  success: boolean;
  loanId: string;
  status: AgentLoanStatus;
  message: string;
}

// ---------------------------------------------------------------------------
// Agent workflow (LOS review queues + LMS recovery actions)
// ---------------------------------------------------------------------------

export type AgentReviewQueue = 'kyc' | 'compliance' | 'credit' | 'gold' | 'housing';
export type AgentReviewOutcome = 'approve' | 'reject' | 'request_docs';

/** Pending-action counters shown on the agent dashboard. Auto-approved /
 *  auto-rejected (e.g. AML match) cases are never counted here. */
export interface AgentPendingCounters {
  kycReview: number;
  complianceReview: number;
  creditReview: number;
  goldAppraisal: number;
  housingReview: number;
  overdueFollowup: number;
}

export interface AgentReviewDecisionInput {
  queue: AgentReviewQueue;
  applicationId: string;
  outcome: AgentReviewOutcome;
  remarks?: string;
}

export interface AgentActionResult {
  success: boolean;
  message: string;
}

export type GoldAuctionStatus = 'initiated' | 'valuation' | 'scheduled' | 'completed';

export interface GoldAuctionRecord {
  loanId: string;
  auctionId: string;
  status: GoldAuctionStatus;
  daysOverdue: number;
  outstanding: number;
  reservePrice: number;
  auctionDate: string | null;
  message: string;
}

export interface LegalNoticeStage {
  stage: string;
  date: string | null;
  status: 'done' | 'active' | 'pending';
}

export interface LegalNoticeRecord {
  loanId: string;
  noticeId: string;
  currentStage: string;
  daysOverdue: number;
  stages: LegalNoticeStage[];
}

export interface GoldPriceAlert {
  loanId: string;
  customerName: string;
  currentLtv: number;
  thresholdLtv: number;
  outstanding: number;
  currentGoldValue: number;
  topUpRequired: number;
}
