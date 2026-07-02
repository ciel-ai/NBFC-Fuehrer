import { KycStep, KycStatus, KycBackendResponse, KycCapabilities, KycStepPayload } from '@/src/entities/kyc';

/**
 * MOCK API LAYER
 * In a real app, this would use axios to hit the backend endpoints.
 * Example: `axios.post('/kyc/step', payload)`
 */

const MOCK_DELAY = 1000;

const defaultCapabilities: KycCapabilities = {
  canCheckout: false,
  canApplyLoan: false,
  canActivateCard: false,
};

export const kycApi = {
  async submitStep<T extends KycStep>(step: T, payload?: KycStepPayload<T>): Promise<KycBackendResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mocking the backend decision engine
        switch (step) {
          case KycStep.PERMISSIONS:
            resolve({
              status: KycStatus.IN_PROGRESS,
              nextStep: KycStep.PROFILE,
              capabilities: defaultCapabilities,
            });
            break;
            
          case KycStep.PROFILE:
            resolve({
              status: KycStatus.IN_PROGRESS,
              nextStep: KycStep.PAN,
              capabilities: defaultCapabilities,
            });
            break;
            
          case KycStep.PAN:
            // Simulate a successful verification leading to AADHAAR
            resolve({
              status: KycStatus.IN_PROGRESS,
              nextStep: KycStep.AADHAAR,
              capabilities: defaultCapabilities,
            });
            break;
            
          case KycStep.AADHAAR:
            // Fast-track completion for this MVP flow simulation
            resolve({
              status: KycStatus.COMPLETED,
              nextStep: KycStep.COMPLETED,
              capabilities: {
                canCheckout: true,
                canApplyLoan: true,
                canActivateCard: true,
              },
            });
            break;

          default:
            resolve({
              status: KycStatus.IN_PROGRESS,
              nextStep: KycStep.PROFILE, // Fallback
              capabilities: defaultCapabilities,
            });
        }
      }, MOCK_DELAY);
    });
  },
};
