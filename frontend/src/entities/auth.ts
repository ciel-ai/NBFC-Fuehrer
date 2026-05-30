export type UserRole = 'customer' | 'agent';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
}

export interface SendOTPRequest {
  phone: string;
  role: UserRole;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresIn: number; // seconds
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  kycComplete: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null; // in memory only
  refreshToken: string | null; // in memory only — stored in SecureStore
  role: UserRole | null;
  kycComplete: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
