import api from '../../api/api';
import { idempotentConfig } from '../../api/idempotency';
import type { DocumentUploadResult } from '@/src/entities/document';
import { HOUSING_INTEREST_RATE } from '@/src/entities/housingLoan';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import type {
  HousingAgreementResult,
  HousingApplicant,
  HousingApplicationInput,
  HousingApplicationResult,
  HousingClosureResult,
  HousingComplianceResult,
  HousingCreditAssessment,
  HousingDecision,
  HousingDisbursalResult,
  HousingIncomeAssessment,
  HousingKycResult,
  HousingNachResult,
  HousingOverdueStatus,
  HousingPmaySubsidyResult,
  HousingPrepaymentQuote,
  HousingPrepaymentResult,
  HousingPropertyAssessment,
} from '@/src/entities/housingLoan';
import type { IHousingLoanService } from '../interfaces/IHousingLoanService';

// Placeholder paths agreed with the backend team. App runs on the mock until live.
const base = '/housing-loans';

export const realHousingLoanService: IHousingLoanService = {
  async submitApplication(input: HousingApplicationInput): Promise<HousingApplicationResult> {
    const res = await api.post<HousingApplicationResult>(`${base}/applications`, {
      ...input,
      interestRate: HOUSING_INTEREST_RATE,
    });
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

  async runKyc(applicationId: string, applicant: HousingApplicant): Promise<HousingKycResult> {
    const res = await api.post<HousingKycResult>(`${base}/applications/${applicationId}/kyc`, { applicant });
    return res.data;
  },

  async runCompliance(applicationId: string): Promise<HousingComplianceResult> {
    const res = await api.post<HousingComplianceResult>(`${base}/applications/${applicationId}/compliance`);
    return res.data;
  },

  async runIncomeAssessment(applicationId, input): Promise<HousingIncomeAssessment> {
    const res = await api.post<HousingIncomeAssessment>(
      `${base}/applications/${applicationId}/income-assessment`,
      input,
    );
    return res.data;
  },

  async runCreditAssessment(applicationId, input): Promise<HousingCreditAssessment> {
    const res = await api.post<HousingCreditAssessment>(
      `${base}/applications/${applicationId}/credit-assessment`,
      input,
    );
    return res.data;
  },

  async runPropertyAssessment(applicationId, input): Promise<HousingPropertyAssessment> {
    const res = await api.post<HousingPropertyAssessment>(
      `${base}/applications/${applicationId}/property-assessment`,
      input,
    );
    return res.data;
  },

  async submitForReview(applicationId: string): Promise<void> {
    await api.post(`${base}/applications/${applicationId}/submit-review`);
  },

  async getCommitteeDecision(applicationId, input): Promise<HousingDecision> {
    const res = await api.get<HousingDecision>(`${base}/applications/${applicationId}/decision`, {
      params: input,
    });
    return res.data;
  },

  async generateAgreement(applicationId, input): Promise<HousingAgreementResult> {
    const res = await api.post<HousingAgreementResult>(
      `${base}/applications/${applicationId}/agreement`,
      input,
    );
    return res.data;
  },

  async eSign(applicationId, applicant): Promise<HousingAgreementResult> {
    const res = await api.post<HousingAgreementResult>(
      `${base}/applications/${applicationId}/esign`,
      { applicant },
    );
    return res.data;
  },

  async registerNach(applicationId, input, idempotencyKey): Promise<HousingNachResult> {
    const res = await api.post<HousingNachResult>(
      `${base}/applications/${applicationId}/nach`,
      input,
      idempotentConfig(idempotencyKey),
    );
    return res.data;
  },

  async applyPmaySubsidy(applicationId, input, idempotencyKey): Promise<HousingPmaySubsidyResult> {
    const res = await api.post<HousingPmaySubsidyResult>(
      `${base}/applications/${applicationId}/pmay-subsidy`,
      input,
      idempotentConfig(idempotencyKey),
    );
    return res.data;
  },

  async disburseToBuilder(applicationId, input, idempotencyKey): Promise<HousingDisbursalResult> {
    const res = await api.post<HousingDisbursalResult>(
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

  async getPrepaymentQuote(loanId: string, prepaymentAmount: number): Promise<HousingPrepaymentQuote> {
    const res = await api.get<HousingPrepaymentQuote>(`${base}/loans/${loanId}/prepayment-quote`, {
      params: { amount: prepaymentAmount },
    });
    return res.data;
  },

  async processPrepayment(loanId, input): Promise<HousingPrepaymentResult> {
    const res = await api.post<HousingPrepaymentResult>(`${base}/loans/${loanId}/prepayment`, input);
    return res.data;
  },

  async getOverdueStatus(loanId: string): Promise<HousingOverdueStatus> {
    const res = await api.get<HousingOverdueStatus>(`${base}/loans/${loanId}/overdue`);
    return res.data;
  },

  async closeLoan(loanId: string): Promise<HousingClosureResult> {
    const res = await api.post<HousingClosureResult>(`${base}/loans/${loanId}/close`);
    return res.data;
  },

  async generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }> {
    const res = await api.post<{ nocRef: string; nocS3Url: string }>(`${base}/loans/${loanId}/noc`);
    return res.data;
  },
};
