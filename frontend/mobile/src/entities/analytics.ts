// ---------------------------------------------------------------------------
// Analytics Entities
// ---------------------------------------------------------------------------

export enum KycAnalyticsEvent {
  KYC_STARTED = 'KYC_STARTED',
  STEP_VIEWED = 'STEP_VIEWED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  KYC_COMPLETED = 'KYC_COMPLETED',
  KYC_REJECTED = 'KYC_REJECTED',
}

export interface KycAnalyticsPayload {
  step?: string;
  durationMs?: number;
  failureReason?: string;
  failureType?: string;
  [key: string]: any;
}
