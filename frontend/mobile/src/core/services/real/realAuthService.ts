import api from '../../api/api';
import type { IAuthService } from '../interfaces/IAuthService';
import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RefreshTokenResponse,
} from '@/src/entities/auth';

export const realAuthService: IAuthService = {
  async sendOTP(request: SendOTPRequest): Promise<SendOTPResponse> {
    const response = await api.post<SendOTPResponse>('/auth/send-otp', request);
    return response.data;
  },

  async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    const response = await api.post<VerifyOTPResponse>('/auth/verify-otp', request);
    return response.data;
  },

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken: token,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
