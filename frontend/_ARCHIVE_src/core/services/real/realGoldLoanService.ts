import api from '../../api/api';
import type { IGoldLoanService } from '../interfaces/IGoldLoanService';
import type {
  GoldEligibility,
  GoldEligibilityRequest,
  GoldLoanAgreementResult,
  GoldLoanAppraisalResult,
  GoldLoanAppointment,
  GoldLoanAppointmentRequest,
  GoldLoanBranch,
  GoldLoanClosureQuote,
  GoldLoanComplianceResult,
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

  async initiateNach(applicationId: string): Promise<GoldLoanNachResult> {
    const response = await api.post<GoldLoanNachResult>(
      `/gold-loans/applications/${applicationId}/nach`,
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
