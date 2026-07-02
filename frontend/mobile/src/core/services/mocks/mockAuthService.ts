import { mockDelay } from '../../api/api';
import { MOCK_USER, MOCK_OTP } from '@/src/core/utils/constants';
import type { IAuthService } from '../interfaces/IAuthService';
import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
  RefreshTokenResponse,
  SalesRole,
} from '@/src/entities/auth';
import type { SalesProduct } from '@/src/entities/salesAgent';
import { SALES_PRODUCT_LABELS, salesRoleToProduct } from '@/src/entities/salesAgent';

let otpAttempts = 0;
const MAX_ATTEMPTS = 5;

let otpTimestamp: number | null = null;
let lastOtpSentAt = 0;
const RESEND_COOLDOWN = 30 * 1000;

// ---------------------------------------------------------------------------
// Mock sales directory
//
// Sales numbers are admin-registered — the backend resolves the granular role
// from the registered mobile number. Here we hard-code a few so the OTP-based
// sales flow can be exercised end-to-end. Any number NOT listed falls through
// to the self-registering customer flow. A deactivated number returns 403.
//
// Dev OTP for every number is MOCK_OTP ('123456').
// ---------------------------------------------------------------------------
const SALES_DIRECTORY: Record<string, SalesRole> = {
  '9000000001': 'sales_cdl',
  '9000000002': 'sales_gold',
  '9000000003': 'sales_housing',
};

/** Admin-deactivated sales numbers → OTP verify returns 403. */
const DEACTIVATED_SALES = new Set<string>(['9000000009']);

const BRANCH_BY_PRODUCT: Record<SalesProduct, string> = {
  cdl: 'Bengaluru - Koramangala',
  gold: 'Chennai - T. Nagar',
  housing: 'Pune - Hinjewadi',
};

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

    const phone = request.phone;

    // Admin-deactivated sales number → 403.
    if (DEACTIVATED_SALES.has(phone)) {
      throw {
        code: 'ACCESS_DENIED',
        message: 'Access not authorized. Contact your administrator.',
      };
    }

    // Registered sales number → granular SALES_* role + agent profile.
    const salesRole = SALES_DIRECTORY[phone];
    if (salesRole) {
      const product = salesRoleToProduct(salesRole);
      const agentName = 'Ravi Sharma';
      return {
        success: true,
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        user: {
          id: 'agent_' + phone,
          phone,
          name: agentName,
          role: salesRole,
        },
        kycComplete: false,
        agent: {
          id: 'agent_' + phone,
          employeeId: 'EMP' + phone.slice(-4),
          name: agentName,
          email: 'ravi.sharma@fuehrernbfc.in',
          phone,
          product,
          branch: BRANCH_BY_PRODUCT[product],
          fdoCode: 'FDO' + phone.slice(-4),
          designation: `${SALES_PRODUCT_LABELS[product]} Officer`,
        },
      };
    }

    // Default: customer self-registration.
    return {
      success: true,
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      user: {
        ...MOCK_USER,
        phone,
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
