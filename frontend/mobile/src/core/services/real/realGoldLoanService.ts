import api from '../../api/api';
import { idempotentConfig } from '../../api/idempotency';
import type { DocumentUploadResult } from '@/src/entities/document';
import type { IGoldLoanService } from '../interfaces/IGoldLoanService';
import type {
  GoldEligibility,
  GoldEligibilityRequest,
  GoldLoanAgreementResult,
  GoldLoanApplicationRef,
  GoldLoanAppraisalResult,
  GoldLoanAppointment,
  GoldLoanAppointmentRequest,
  GoldLoanBranch,
  GoldLoanClosureQuote,
  GoldLoanComplianceResult,
  GoldLoanCreateApplicationRequest,
  GoldLoanDisbursalStatus,
  GoldLoanMonitoring,
  GoldLoanNachResult,
  GoldRate,
} from '@/src/entities/goldLoan';

export const realGoldLoanService: IGoldLoanService = {
  async getGoldRate(): Promise<GoldRate> {
    const response = await api.get<GoldRate>('/gold-loans/rate');
    return response.data;
  },

  async calculateEligibility(request: GoldEligibilityRequest): Promise<GoldEligibility> {
    const response = await api.post<GoldEligibility>('/gold-loans/eligibility', request);
    return response.data;
  },

  async createApplication(
    request: GoldLoanCreateApplicationRequest,
  ): Promise<GoldLoanApplicationRef> {
    // Backend-blocked: endpoint may 501 until the create-application contract
    // lands. See docs/GOLD_LOAN_S4_API_CONTRACTS.md.
    const response = await api.post<GoldLoanApplicationRef>('/gold-loans/applications', request);
    return response.data;
  },

  async uploadDocument(
    applicationId: string,
    uri: string,
    type: string,
  ): Promise<DocumentUploadResult> {
    // Multipart upload of the captured file. Backend-blocked until the
    // documents endpoint lands (may 501).
    const form = new FormData();
    form.append('type', type);
    form.append('file', {
      uri,
      name: `${type}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
    const response = await api.post<DocumentUploadResult>(
      `/gold-loans/applications/${applicationId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async runCompliance(applicationId: string): Promise<GoldLoanComplianceResult> {
    const response = await api.post<GoldLoanComplianceResult>(
      `/gold-loans/applications/${applicationId}/compliance`,
    );
    return response.data;
  },

  async getNearbyBranches(): Promise<GoldLoanBranch[]> {
    const response = await api.get<GoldLoanBranch[]>('/gold-loans/branches/nearby');
    return response.data;
  },

  async bookBranchAppointment(request: GoldLoanAppointmentRequest): Promise<GoldLoanAppointment> {
    const response = await api.post<GoldLoanAppointment>('/gold-loans/appointments', request);
    return response.data;
  },

  async getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult> {
    const response = await api.get<GoldLoanAppraisalResult>(
      `/gold-loans/applications/${applicationId}/appraisal`,
    );
    return response.data;
  },

  async acceptFinalLoanAmount(applicationId: string, amount: number): Promise<void> {
    await api.post(`/gold-loans/applications/${applicationId}/accept-final-amount`, { amount });
  },

  async generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult> {
    const response = await api.post<GoldLoanAgreementResult>(
      `/gold-loans/applications/${applicationId}/agreement`,
    );
    return response.data;
  },

  async completeESign(applicationId: string, otp: string): Promise<GoldLoanAgreementResult> {
    const response = await api.post<GoldLoanAgreementResult>(
      `/gold-loans/applications/${applicationId}/esign`,
      { otp },
    );
    return response.data;
  },

  async initiateNach(applicationId: string, idempotencyKey?: string): Promise<GoldLoanNachResult> {
    const response = await api.post<GoldLoanNachResult>(
      `/gold-loans/applications/${applicationId}/nach`,
      undefined,
      idempotentConfig(idempotencyKey),
    );
    return response.data;
  },

  async getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus> {
    const response = await api.get<GoldLoanDisbursalStatus>(
      `/gold-loans/applications/${applicationId}/disbursal`,
    );
    return response.data;
  },

  async getMonitoring(loanId: string): Promise<GoldLoanMonitoring> {
    const response = await api.get<GoldLoanMonitoring>(`/gold-loans/${loanId}/monitoring`);
    return response.data;
  },

  async getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote> {
    const response = await api.get<GoldLoanClosureQuote>(`/gold-loans/${loanId}/closure-quote`);
    return response.data;
  },
};
