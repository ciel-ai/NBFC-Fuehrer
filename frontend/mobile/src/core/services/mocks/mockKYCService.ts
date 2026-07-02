import { mockDelay } from '../../api/api';
import type { IKYCService } from '../interfaces/IKYCService';
import type { VerifyPANRequest, VerifyPANResponse } from '@/src/entities/kyc';
import { KycStatus, KycStep } from '@/src/entities/kyc';

export const mockKYCService: IKYCService = {
  async verifyPAN(request: VerifyPANRequest): Promise<VerifyPANResponse> {
    // Simulate network delay for realistic UX
    return mockDelay<VerifyPANResponse>(
      {
        status: KycStatus.IN_PROGRESS,
        nextStep: KycStep.AADHAAR,
        capabilities: { canCheckout: false, canApplyLoan: false, canActivateCard: false },
        panDetails: {
          panNumber: request.panNumber,
          name: 'ARJUN KUMAR',
          dateOfBirth: '1992-05-15',
          category: 'Individual',
        },
        failure: undefined,
      },
      2000
    );
  },

  async submitKYCCompletion(userId: string): Promise<void> {
    await mockDelay(null, 500);
  },
};
