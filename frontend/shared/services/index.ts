// Base endpoint configurations and vendor integrations (stub).
export const API_ENDPOINTS = {
  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  users: {
    profile: '/api/users/profile',
    getById: (id: string) => `/api/users/${id}`,
  },
  kyc: {
    verifyPan: '/api/kyc/verify-pan',
    verifyAadhaar: '/api/kyc/verify-aadhaar',
    verifySelfie: '/api/kyc/verify-selfie',
    status: '/api/kyc/status',
    esign: '/api/kyc/esign',
    enach: '/api/kyc/enach',
    enachStatus: '/api/kyc/enach/status',
  },
} as const;
