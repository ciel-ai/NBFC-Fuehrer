// ---------------------------------------------------------------------------
// KYC Entities
// ---------------------------------------------------------------------------

export enum KycStep {
  PERMISSIONS = 'PERMISSIONS',
  PROFILE = 'PROFILE',
  PAN = 'PAN',
  AADHAAR = 'AADHAAR',
  SELFIE = 'SELFIE',
  BANK_VERIFICATION = 'BANK_VERIFICATION',
  ESIGN = 'ESIGN',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  LOAN_WORKFLOW = 'LOAN_WORKFLOW',
}

export enum KycStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum KycFailureType {
  RETRYABLE = 'RETRYABLE',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  FRAUD_SUSPECTED = 'FRAUD_SUSPECTED',
}

export interface KycCapabilities {
  canCheckout: boolean;
  canApplyLoan: boolean;
  canActivateCard: boolean;
  [key: string]: boolean;
}

export interface KycIntentDestination {
  href: string;
  params?: Record<string, string | string[]>;
}

export interface KycFailureState {
  type: KycFailureType;
  message?: string;
}

// ---------------------------------------------------------------------------
// Backend Contracts
// ---------------------------------------------------------------------------

export interface KycBackendResponse {
  status: KycStatus;
  nextStep: KycStep;
  capabilities: KycCapabilities;
  failure?: KycFailureState;
}

// Re-exports for payload models (mocking what was there)
export interface PANDetails {
  panNumber: string;
  name: string;
  dateOfBirth: string;
  category: string;
}

export interface VerifyPANRequest {
  panNumber: string;
  userId: string;
}

export interface VerifyPANResponse extends KycBackendResponse {
  panDetails?: PANDetails;
}

export interface PermissionsPayload {
  granted: boolean;
}

export interface ProfilePayload {
  name: string;
  email?: string;
  dateOfBirth?: string;
}

export interface PANPayload {
  panNumber: string;
}

export interface AadhaarPayload {
  aadhaarNumber: string;
}

export type KycPayloadMap = {
  [KycStep.PERMISSIONS]: PermissionsPayload | undefined;
  [KycStep.PROFILE]: ProfilePayload;
  [KycStep.PAN]: PANPayload;
  [KycStep.AADHAAR]: AadhaarPayload | undefined;
  [KycStep.SELFIE]: undefined;
  [KycStep.BANK_VERIFICATION]: { accountNumber: string; ifscCode: string };
  [KycStep.ESIGN]: undefined;
  [KycStep.REVIEW]: undefined;
  [KycStep.COMPLETED]: undefined;
  [KycStep.REJECTED]: undefined;
  [KycStep.LOAN_WORKFLOW]: undefined;
};

export type KycStepPayload<T extends KycStep> = KycPayloadMap[T];
