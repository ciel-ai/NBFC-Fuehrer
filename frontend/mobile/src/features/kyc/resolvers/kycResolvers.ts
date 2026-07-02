import { KycStep, KycStatus, KycBackendResponse, KycFailureState } from '@/src/entities/kyc';
import { Href } from 'expo-router';

/**
 * ---------------------------------------------------------------------------
 * Step Resolver
 * Resolves the next actual step from the backend response.
 * ---------------------------------------------------------------------------
 */
export const resolveNextKycStep = (response: KycBackendResponse): KycStep => {
  if (response.status === KycStatus.COMPLETED) {
    return KycStep.COMPLETED;
  }
  if (response.status === KycStatus.REJECTED) {
    return KycStep.REJECTED;
  }
  return response.nextStep;
};

/**
 * ---------------------------------------------------------------------------
 * Capability Resolver
 * Resolves capabilities safely, ensuring defaults.
 * ---------------------------------------------------------------------------
 */
export const resolveCapabilities = (response: KycBackendResponse) => {
  return response.capabilities || { canCheckout: false, canApplyLoan: false, canActivateCard: false };
};

/**
 * ---------------------------------------------------------------------------
 * Failure Resolver
 * Extracts failure state if present, deciding retryability.
 * ---------------------------------------------------------------------------
 */
export const resolveFailureStrategy = (response: KycBackendResponse): KycFailureState | null => {
  if (response.status === KycStatus.FAILED && response.failure) {
    return response.failure;
  }
  return null;
};

/**
 * ---------------------------------------------------------------------------
 * Navigation Resolver
 * Maps an abstract KycStep to an actual Expo Router href.
 * ---------------------------------------------------------------------------
 */
export const resolveNavigation = (step: KycStep): Href<string> | null => {
  switch (step) {
    case KycStep.PERMISSIONS:
      return '/(kyc)/permissions' as Href<string>;
    case KycStep.PROFILE:
      return '/(kyc)/profile' as Href<string>;
    case KycStep.PAN:
      return '/(kyc)/pan-details' as Href<string>;
    case KycStep.AADHAAR:
      return '/(kyc)/pan-success' as Href<string>; // Reusing existing screen for now as mock placeholder
    case KycStep.COMPLETED:
      // When complete, we don't route within KYC, we restore intent.
      // So return null here, letting the orchestrator handle intent restoration.
      return null;
    case KycStep.REJECTED:
      // Could point to a dedicated rejected screen
      return '/(kyc)/pan-verifying' as Href<string>; 
    default:
      return null;
  }
};
