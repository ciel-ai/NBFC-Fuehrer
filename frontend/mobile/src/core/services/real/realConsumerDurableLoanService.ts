import api from '../../api/api';
import { idempotentConfig } from '../../api/idempotency';
import type { DocumentUploadResult } from '@/src/entities/document';
import {
  cdlCalculateFoir,
  CDL_DEFAULT_INTEREST_RATE,
  CDL_FOIR_MAX,
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

  async uploadDocument(
    applicationId: string,
    uri: string,
    type: string,
  ): Promise<DocumentUploadResult> {
    const form = new FormData();
    form.append('type', type);
    form.append('file', { uri, name: `${type}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    const res = await api.post<DocumentUploadResult>(
      `${base}/applications/${applicationId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
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
    return cdlCalculateFoir(input);
  },

  async runCreditAssessment(applicationId, input): Promise<CdlCreditAssessment> {
    const res = await api.post<CdlCreditAssessment>(
      `${base}/applications/${applicationId}/credit-assessment`,
      { ...input, foirLimit: CDL_FOIR_MAX },
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
    await api.post(`${base}/applications/${decision.applicationId}/agent-review`, decision);
  },

  async generateAgreement(applicationId, input): Promise<CdlAgreementResult> {
    const res = await api.post<CdlAgreementResult>(
      `${base}/applications/${applicationId}/agreement`,
      { ...input, interestRate: input.interestRate ?? CDL_DEFAULT_INTEREST_RATE },
    );
    return res.data;
  },

  async registerNachMandate(applicationId, input, idempotencyKey): Promise<CdlNachResult> {
    const res = await api.post<CdlNachResult>(
      `${base}/applications/${applicationId}/nach`,
      input,
      idempotentConfig(idempotencyKey),
    );
    return res.data;
  },

  async disburseToMerchant(applicationId, input, idempotencyKey): Promise<CdlDisbursalResult> {
    const res = await api.post<CdlDisbursalResult>(
      `${base}/applications/${applicationId}/disburse`,
      input,
      idempotentConfig(idempotencyKey),
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

  async processManualPayment(
    loanId: string,
    emiId: string,
    idempotencyKey?: string,
  ): Promise<CdlManualPaymentResult> {
    const res = await api.post<CdlManualPaymentResult>(
      `${base}/loans/${loanId}/payments`,
      { emiId },
      idempotentConfig(idempotencyKey),
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
