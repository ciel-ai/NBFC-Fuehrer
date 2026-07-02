import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RefreshTokenResponse,
} from '@/src/entities/auth';

export interface IAuthService {
  sendOTP(request: SendOTPRequest): Promise<SendOTPResponse>;
  verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse>;
  refreshToken(token: string): Promise<RefreshTokenResponse>;
  logout(): Promise<void>;
}
