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

export interface IConsumerDurableLoanService {
  // LOS
  submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult>;
  runKycChecks(applicationId: string): Promise<CdlKycResult>;
  runComplianceChecks(applicationId: string): Promise<CdlComplianceResult>;
  runCreditAssessment(
    applicationId: string,
    input: { monthlyIncome: number; employmentType: string; proposedEmi: number },
  ): Promise<CdlCreditAssessment>;
  /** Pure FOIR calculation — kept synchronous so screens can recompute live. */
  calculateFOIR(input: CdlFoirInput): number;
  getCreditDecision(
    applicationId: string,
    assessment: CdlCreditAssessment,
  ): Promise<CdlCreditDecision>;
  submitAgentReviewDecision(decision: CdlAgentReviewDecision): Promise<void>;

  // Agreement → NACH → Disbursal
  generateAgreement(
    applicationId: string,
    input: { amount: number; tenure: number; emi: number },
  ): Promise<CdlAgreementResult>;
  registerNachMandate(
    applicationId: string,
    input: { emi: number; bankAccount: string },
  ): Promise<CdlNachResult>;
  disburseToMerchant(
    applicationId: string,
    input: { amount: number; merchantName: string },
  ): Promise<CdlDisbursalResult>;

  // LMS
  activateLoan(input: CdlApplicationInput & { loanAccountId: string }): Promise<Loan>;
  getEmiSchedule(loanId: string): Promise<EMISchedule[]>;
  processManualPayment(loanId: string, emiId: string): Promise<CdlManualPaymentResult>;
  handlePaymentFailure(loanId: string, emiId: string): Promise<CdlPaymentFailure>;
  getOverdueStatus(loanId: string): Promise<CdlOverdueStatus>;
  closeLoan(loanId: string): Promise<CdlClosureResult>;
  generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }>;
}
