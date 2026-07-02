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

export interface IGoldLoanService {
  getGoldRate(): Promise<GoldRate>;
  calculateEligibility(request: GoldEligibilityRequest): Promise<GoldEligibility>;
  runCompliance(applicationId: string): Promise<GoldLoanComplianceResult>;
  getNearbyBranches(): Promise<GoldLoanBranch[]>;
  bookBranchAppointment(request: GoldLoanAppointmentRequest): Promise<GoldLoanAppointment>;
  getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult>;
  acceptFinalLoanAmount(applicationId: string, amount: number): Promise<void>;
  generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult>;
  completeESign(applicationId: string, otp: string): Promise<GoldLoanAgreementResult>;
  initiateNach(applicationId: string): Promise<GoldLoanNachResult>;
  getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus>;
  getMonitoring(loanId: string): Promise<GoldLoanMonitoring>;
  getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote>;
}
