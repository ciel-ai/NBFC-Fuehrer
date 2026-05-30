import { mockDelay } from '../../api/api';
import { MOCK_USER, MOCK_OTP } from '@/src/core/utils/constants';
import type { IAuthService } from '../interfaces/IAuthService';
import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RefreshTokenResponse,
} from '@/src/entities/auth';

let otpAttempts = 0;
const MAX_ATTEMPTS = 5;

let otpTimestamp: number | null = null;
let lastOtpSentAt = 0;
const RESEND_COOLDOWN = 30 * 1000;

export const mockAuthService: IAuthService = {
  async sendOTP(request: SendOTPRequest): Promise<SendOTPResponse> {
    await mockDelay(null, 800);

    // simulate network failure
    if (Math.random() < 0.2) {
      throw { code: 'NETWORK_ERROR', message: 'Network error. Try again.' };
    }

    // resend cooldown
    if (Date.now() - lastOtpSentAt < RESEND_COOLDOWN) {
      throw {
        code: 'RESEND_TOO_SOON',
        message: 'Please wait before requesting OTP again',
      };
    }

    lastOtpSentAt = Date.now();
    otpTimestamp = Date.now();
    otpAttempts = 0;

    return {
      success: true,
      message: `OTP sent to +91 ${request.phone}`,
      expiresIn: 300,
    };
  },

  async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    await mockDelay(null, 800);

    // expiry check
    if (otpTimestamp && Date.now() - otpTimestamp > 300000) {
      throw {
        code: 'OTP_EXPIRED',
        message: 'OTP has expired. Please request a new one.',
      };
    }

    // attempt limit
    if (otpAttempts >= MAX_ATTEMPTS) {
      throw {
        code: 'OTP_LIMIT_EXCEEDED',
        message: 'Too many attempts. Try again later.',
      };
    }

    if (request.otp !== MOCK_OTP) {
      otpAttempts++;
      throw {
        code: 'INVALID_OTP',
        message: 'The OTP you entered is incorrect',
      };
    }

    // success reset
    otpAttempts = 0;

    return {
      success: true,
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      user: {
        ...MOCK_USER,
        phone: request.phone,
        role: 'customer',
      },
      kycComplete: false,
    };
  },

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    return mockDelay<RefreshTokenResponse>({
      accessToken: 'mock_access_token_refreshed_' + Date.now(),
      refreshToken: 'mock_refresh_token_refreshed_' + Date.now(),
    });
  },

  async logout(): Promise<void> {
    await mockDelay(null, 300);
  },
};
