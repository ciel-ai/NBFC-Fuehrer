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

export interface IHousingLoanService {
  // LOS
  submitApplication(input: HousingApplicationInput): Promise<HousingApplicationResult>;
  runKyc(applicationId: string, applicant: HousingApplicant): Promise<HousingKycResult>;
  runCompliance(applicationId: string): Promise<HousingComplianceResult>;
  runIncomeAssessment(
    applicationId: string,
    input: { primaryMonthlyIncome: number; coApplicantMonthlyIncome: number; gstin?: string },
  ): Promise<HousingIncomeAssessment>;
  runCreditAssessment(
    applicationId: string,
    input: { combinedMonthlyIncome: number; emiEstimate: number; hasCoApplicant: boolean },
  ): Promise<HousingCreditAssessment>;
  runPropertyAssessment(
    applicationId: string,
    input: { loanAmount: number; agreementValue: number; pincode?: string },
  ): Promise<HousingPropertyAssessment>;
  submitForReview(applicationId: string): Promise<void>;
  getCommitteeDecision(
    applicationId: string,
    input: { amount: number; emi: number },
  ): Promise<HousingDecision>;

  // Agreement → eSign (both) → NACH → PMAY → Disbursal
  generateAgreement(
    applicationId: string,
    input: { amount: number; tenure: number; emi: number },
  ): Promise<HousingAgreementResult>;
  eSign(applicationId: string, applicant: HousingApplicant): Promise<HousingAgreementResult>;
  registerNach(applicationId: string, input: { emi: number; bankAccount: string }): Promise<HousingNachResult>;
  applyPmaySubsidy(applicationId: string, input: { loanAmount: number }): Promise<HousingPmaySubsidyResult>;
  disburseToBuilder(
    applicationId: string,
    input: { amount: number; builderName: string },
  ): Promise<HousingDisbursalResult>;

  // LMS
  activateLoan(input: { loanAccountId: string; amount: number; tenure: number; builderName: string }): Promise<Loan>;
  getEmiSchedule(loanId: string): Promise<EMISchedule[]>;
  getPrepaymentQuote(loanId: string, prepaymentAmount: number): Promise<HousingPrepaymentQuote>;
  processPrepayment(
    loanId: string,
    input: { prepaymentAmount: number; option: 'reduce_tenure' | 'reduce_emi' },
  ): Promise<HousingPrepaymentResult>;
  getOverdueStatus(loanId: string): Promise<HousingOverdueStatus>;
  closeLoan(loanId: string): Promise<HousingClosureResult>;
  generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }>;
}
