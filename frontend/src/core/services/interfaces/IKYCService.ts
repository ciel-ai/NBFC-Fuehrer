import type { VerifyPANRequest, VerifyPANResponse } from '@/src/entities/kyc';

export interface IKYCService {
  verifyPAN(request: VerifyPANRequest): Promise<VerifyPANResponse>;
  submitKYCCompletion(userId: string): Promise<void>;
}
