import api from '../../api/api';
import type { IKYCService } from '../interfaces/IKYCService';
import type { VerifyPANRequest, VerifyPANResponse } from '@/src/entities/kyc';

export const realKYCService: IKYCService = {
  async verifyPAN(request: VerifyPANRequest): Promise<VerifyPANResponse> {
    const response = await api.post<VerifyPANResponse>('/kyc/verify-pan', request);
    return response.data;
  },

  async submitKYCCompletion(userId: string): Promise<void> {
    await api.post('/kyc/complete', { userId });
  },
};
