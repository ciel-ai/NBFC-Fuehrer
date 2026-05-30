import api from '../../api/api';
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

export const realAgentService: IAgentService = {
  async getAssignedLoans(): Promise<AgentLoan[]> {
    const response = await api.get<AgentLoan[]>('/agent/loans');
    return response.data;
  },

  async getOverdueAccounts(): Promise<OverdueAccount[]> {
    const response = await api.get<OverdueAccount[]>('/agent/overdue');
    return response.data;
  },

  async getLoanDetail(loanId: string): Promise<AgentLoanDetail> {
    const response = await api.get<AgentLoanDetail>(`/agent/loans/${loanId}`);
    return response.data;
  },

  async updateLoanStatus(
    loanId: string,
    status: AgentLoanStatus,
    remarks?: string,
  ): Promise<UpdateLoanStatusResponse> {
    const response = await api.patch<UpdateLoanStatusResponse>(
      `/agent/loans/${loanId}/status`,
      { status, ...(remarks !== undefined ? { remarks } : {}) },
    );
    return response.data;
  },

  async getDashboardStats(): Promise<AgentDashboardStats> {
    const response = await api.get<AgentDashboardStats>('/agent/dashboard');
    return response.data;
  },

  async getPendingCounters(): Promise<AgentPendingCounters> {
    const response = await api.get<AgentPendingCounters>('/agent/pending-counters');
    return response.data;
  },

  async submitReviewDecision(input: AgentReviewDecisionInput): Promise<AgentActionResult> {
    const response = await api.post<AgentActionResult>(
      `/agent/reviews/${input.queue}/${input.applicationId}/decision`,
      { outcome: input.outcome, remarks: input.remarks },
    );
    return response.data;
  },

  async confirmGoldAppraisal(applicationId: string): Promise<AgentActionResult> {
    const response = await api.post<AgentActionResult>(
      `/agent/gold-appraisal/${applicationId}/confirm`,
    );
    return response.data;
  },

  async logCallOutcome(loanId: string, outcome: string, notes?: string): Promise<AgentActionResult> {
    const response = await api.post<AgentActionResult>(`/agent/loans/${loanId}/call-log`, { outcome, notes });
    return response.data;
  },

  async escalateCase(loanId, recipient, notes): Promise<AgentActionResult> {
    const response = await api.post<AgentActionResult>(`/agent/loans/${loanId}/escalate`, { recipient, notes });
    return response.data;
  },

  async initiateGoldAuction(loanId: string): Promise<GoldAuctionRecord> {
    const response = await api.post<GoldAuctionRecord>(`/agent/loans/${loanId}/gold-auction`);
    return response.data;
  },

  async updateAuctionStatus(loanId: string, status: GoldAuctionStatus): Promise<GoldAuctionRecord> {
    const response = await api.patch<GoldAuctionRecord>(`/agent/loans/${loanId}/gold-auction`, { status });
    return response.data;
  },

  async getLegalNotice(loanId: string): Promise<LegalNoticeRecord> {
    const response = await api.get<LegalNoticeRecord>(`/agent/loans/${loanId}/legal-notice`);
    return response.data;
  },

  async advanceLegalNotice(loanId: string): Promise<LegalNoticeRecord> {
    const response = await api.post<LegalNoticeRecord>(`/agent/loans/${loanId}/legal-notice/advance`);
    return response.data;
  },

  async getGoldPriceAlert(loanId: string): Promise<GoldPriceAlert> {
    const response = await api.get<GoldPriceAlert>(`/agent/loans/${loanId}/gold-price-alert`);
    return response.data;
  },
};
