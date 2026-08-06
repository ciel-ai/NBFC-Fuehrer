import type { DocumentUploadResult } from '@/src/entities/document';
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

export interface IGoldLoanService {
  getGoldRate(): Promise<GoldRate>;
  calculateEligibility(request: GoldEligibilityRequest): Promise<GoldEligibility>;
  /** Creates the application at flow start and returns its id. */
  createApplication(request: GoldLoanCreateApplicationRequest): Promise<GoldLoanApplicationRef>;
  /** Uploads a captured document/photo against the application. */
  uploadDocument(applicationId: string, uri: string, type: string): Promise<DocumentUploadResult>;
  runCompliance(applicationId: string): Promise<GoldLoanComplianceResult>;
  getNearbyBranches(): Promise<GoldLoanBranch[]>;
  bookBranchAppointment(request: GoldLoanAppointmentRequest): Promise<GoldLoanAppointment>;
  getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult>;
  acceptFinalLoanAmount(applicationId: string, amount: number): Promise<void>;
  generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult>;
  completeESign(applicationId: string, otp: string): Promise<GoldLoanAgreementResult>;
  initiateNach(applicationId: string, idempotencyKey?: string): Promise<GoldLoanNachResult>;
  getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus>;
  getMonitoring(loanId: string): Promise<GoldLoanMonitoring>;
  getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote>;
}
