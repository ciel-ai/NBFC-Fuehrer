import api from '../../api/api';
import {
  CDL_ANNUAL_INTEREST_RATE,
  CDL_FOIR_LIMIT,
} from '@/src/entities/consumerDurableLoan';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import type {
  CdlAgentReviewDecision,
  CdlAgreementResult,
  CdlApplicationInput,
  CdlApplicationResult,
  CdlClosureResult,
  CdlComplianceResult,
  CdlCreditAssessment,
  CdlCreditDecision,
  CdlDisbursalResult,
  CdlFoirInput,
  CdlKycResult,
  CdlManualPaymentResult,
  CdlNachResult,
  CdlOverdueStatus,
  CdlPaymentFailure,
} from '@/src/entities/consumerDurableLoan';
import type { IConsumerDurableLoanService } from '../interfaces/IConsumerDurableLoanService';

// Endpoint paths are placeholders agreed with the backend team. Until the CDL
// service is live the app runs against mockConsumerDurableLoanService.
const base = '/consumer-durable-loans';

export const realConsumerDurableLoanService: IConsumerDurableLoanService = {
  async submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult> {
    const res = await api.post<CdlApplicationResult>(`${base}/applications`, input);
    return res.data;
  },

  async runKycChecks(applicationId: string): Promise<CdlKycResult> {
    const res = await api.post<CdlKycResult>(`${base}/applications/${applicationId}/kyc`);
    return res.data;
  },

  async runComplianceChecks(applicationId: string): Promise<CdlComplianceResult> {
    const res = await api.post<CdlComplianceResult>(`${base}/applications/${applicationId}/compliance`);
    return res.data;
  },

  calculateFOIR(input: CdlFoirInput): number {
    if (input.monthlyIncome <= 0) return 0;
    const ratio = ((input.existingObligations + input.proposedEmi) / input.monthlyIncome) * 100;
    return Math.round(ratio * 10) / 10;
  },

  async runCreditAssessment(applicationId, input): Promise<CdlCreditAssessment> {
    const res = await api.post<CdlCreditAssessment>(
      `${base}/applications/${applicationId}/credit-assessment`,
      { ...input, foirLimit: CDL_FOIR_LIMIT },
    );
    return res.data;
  },

  async getCreditDecision(applicationId, assessment): Promise<CdlCreditDecision> {
    const res = await api.post<CdlCreditDecision>(
      `${base}/applications/${applicationId}/credit-decision`,
      assessment,
    );
    return res.data;
  },

  async submitAgentReviewDecision(decision: CdlAgentReviewDecision): Promise<void> {
    await api.post(`${base}/applications/${decision.applicationId}/credit-decision`, decision);
  },

  async generateAgreement(applicationId, input): Promise<CdlAgreementResult> {
    const res = await api.post<CdlAgreementResult>(
      `${base}/applications/${applicationId}/agreement`,
      { ...input, interestRate: CDL_ANNUAL_INTEREST_RATE },
    );
    return res.data;
  },

  async registerNachMandate(applicationId, input): Promise<CdlNachResult> {
    const res = await api.post<CdlNachResult>(`${base}/applications/${applicationId}/nach`, input);
    return res.data;
  },

  async disburseToMerchant(applicationId, input): Promise<CdlDisbursalResult> {
    const res = await api.post<CdlDisbursalResult>(
      `${base}/applications/${applicationId}/disburse`,
      input,
    );
    return res.data;
  },

  async activateLoan(input): Promise<Loan> {
    const res = await api.post<Loan>(`${base}/loans`, input);
    return res.data;
  },

  async getEmiSchedule(loanId: string): Promise<EMISchedule[]> {
    const res = await api.get<EMISchedule[]>(`${base}/loans/${loanId}/emi-schedule`);
    return res.data;
  },

  async processManualPayment(loanId: string, emiId: string): Promise<CdlManualPaymentResult> {
    const res = await api.post<CdlManualPaymentResult>(
      `${base}/loans/${loanId}/payments`,
      { emiId },
    );
    return res.data;
  },

  async handlePaymentFailure(loanId: string, emiId: string): Promise<CdlPaymentFailure> {
    const res = await api.post<CdlPaymentFailure>(
      `${base}/loans/${loanId}/payment-failure`,
      { emiId },
    );
    return res.data;
  },

  async getOverdueStatus(loanId: string): Promise<CdlOverdueStatus> {
    const res = await api.get<CdlOverdueStatus>(`${base}/loans/${loanId}/overdue`);
    return res.data;
  },

  async closeLoan(loanId: string): Promise<CdlClosureResult> {
    const res = await api.post<CdlClosureResult>(`${base}/loans/${loanId}/close`);
    return res.data;
  },

  async generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }> {
    const res = await api.post<{ nocRef: string; nocS3Url: string }>(`${base}/loans/${loanId}/noc`);
    return res.data;
  },
};

