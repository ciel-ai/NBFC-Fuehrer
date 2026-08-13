import type { DocumentUploadResult } from '@/src/entities/document';
import type { EMISchedule } from '@/src/entities/loan';
import type {
  CdlAgentReviewDecision,
  CdlAgreementResult,
  CdlApplicationInput,
  CdlApplicationResult,
  CdlClosureResult,
  CdlComplianceResult,
  CdlCreditAssessment,
  CdlCreditAssessmentInput,
  CdlCreditDecision,
  CdlDisbursalResult,
  CdlFoirInput,
  CdlKycResult,
  CdlManualPaymentResult,
  CdlNachInput,
  CdlNachResult,
  CdlOverdueStatus,
  CdlPaymentFailure,
  CdlQuoteInput,
  CdlQuoteResult,
} from '@/src/entities/consumerDurableLoan';

export interface IConsumerDurableLoanService {
  /**
   * Authoritative EMI + processing fee for the product-details screen.
   * The app must not compute either itself: a second implementation can
   * disagree with the one that books the loan, and the customer would be
   * shown a figure the loan is not written at.
   */
  getQuote(input: CdlQuoteInput): Promise<CdlQuoteResult>;

  // LOS
  submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult>;
  /** Uploads a captured KYC/collateral document against the application. */
  uploadDocument(applicationId: string, uri: string, type: string): Promise<DocumentUploadResult>;
  runKycChecks(applicationId: string): Promise<CdlKycResult>;
  runComplianceChecks(applicationId: string): Promise<CdlComplianceResult>;
  // The API takes exactly three income fields and derives everything else
  // server-side — the CIBIL score from the bureau-verified kyc_documents row,
  // the FOIR limit and the auto-approval ceiling from its own policy. The app
  // used to post its whole CdlCreditAssessment view model here (cibilScore,
  // foirLimit, age, employmentType, loanAmount…); stripUnknown deleted all of
  // it, and `existingObligations` was dropped while the required
  // `existingEmis` arrived missing.
  runCreditAssessment(
    applicationId: string,
    input: CdlCreditAssessmentInput,
  ): Promise<CdlCreditAssessment>;
  /** Pure FOIR calculation — kept synchronous so screens can recompute live. */
  calculateFOIR(input: CdlFoirInput): number;
  getCreditDecision(
    applicationId: string,
    input: CdlCreditAssessmentInput,
  ): Promise<CdlCreditDecision>;
  submitAgentReviewDecision(decision: CdlAgentReviewDecision): Promise<void>;

  // Agreement → NACH → Disbursal
  /**
   * Takes no body — the route validates :id only and the service reads the
   * approved terms from the application row. The app used to post amount,
   * tenure, emi and interestRate, all of which were ignored.
   */
  generateAgreement(applicationId: string): Promise<CdlAgreementResult>;
  registerNachMandate(
    applicationId: string,
    input: CdlNachInput,
    idempotencyKey?: string,
  ): Promise<CdlNachResult>;
  disburseToMerchant(
    applicationId: string,
    input: { amount: number; merchantName: string },
    idempotencyKey?: string,
  ): Promise<CdlDisbursalResult>;

  // LMS
  getEmiSchedule(loanId: string): Promise<EMISchedule[]>;
  /**
   * Pays one EMI. No amount is sent: the API resolves the payable figure from
   * the EMI row itself, so a client cannot understate what it owes.
   */
  processManualPayment(
    loanId: string,
    emiId: string,
    idempotencyKey?: string,
  ): Promise<CdlManualPaymentResult>;
  handlePaymentFailure(loanId: string, emiId: string): Promise<CdlPaymentFailure>;
  getOverdueStatus(loanId: string): Promise<CdlOverdueStatus>;
  closeLoan(loanId: string): Promise<CdlClosureResult>;
  generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }>;
}
