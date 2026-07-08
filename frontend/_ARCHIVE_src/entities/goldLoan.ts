export type GoldLoanStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface GoldRate {
  ratePerGram: number;
  source: string;
  fetchedAt: string;
}

export interface GoldEligibilityRequest {
  goldType: string;
  karat: string;
  weightGrams: number;
}

export interface GoldEligibility {
  goldValue: number;
  maxLoanAmount: number;
  ltvRatio: number;
  ratePerGram: number;
  source: string;
}

export interface GoldLoanBranch {
  id: string;
  name: string;
  address: string;
  distance: string;
  hours: string;
}

export interface GoldLoanAppointmentRequest {
  branchId: string;
  date: string;
  slot: string;
}

export interface GoldLoanAppointment {
  appointmentId: string;
  referenceId: string;
  branch: GoldLoanBranch;
  date: string;
  slot: string;
}

export interface GoldLoanComplianceResult {
  applicationId: string;
  status: GoldLoanStepStatus;
  checks: Array<{
    label: string;
    provider: string;
    status: GoldLoanStepStatus;
  }>;
}

export interface GoldLoanAppraisalResult {
  applicationId: string;
  grossWeight: number;
  netWeight: number;
  purity: string;
  ratePerGram: number;
  assessedValue: number;
  finalLoanAmount: number;
  ltvRatio: number;
  photos: string[];
  appraiserName: string;
  assessedAt: string;
}

export interface GoldLoanAgreementResult {
  agreementId: string;
  stampRef: string;
  esignRef?: string;
  status: GoldLoanStepStatus;
}

export interface GoldLoanNachResult {
  mandateId: string;
  status: GoldLoanStepStatus;
  debitDate: string;
  amount: number;
}

export interface GoldLoanDisbursalStatus {
  payoutId: string;
  status: GoldLoanStepStatus;
  amount: number;
  bankAccount: string;
  vaultReceiptId: string;
  vaultName: string;
}

export interface GoldLoanMonitoring {
  loanId: string;
  currentGoldValue: number;
  outstandingAmount: number;
  ltvRatio: number;
  lastCheckedAt: string;
  alertTriggered: boolean;
}

export interface GoldLoanClosureQuote {
  loanId: string;
  outstandingAmount: number;
  interestAccrued: number;
  foreclosureCharges: number;
  totalPayable: number;
  goldReleaseBranch: string;
  nocRef: string;
}
