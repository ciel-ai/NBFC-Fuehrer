import { Config } from '../config/env';

// API Configuration
export const API_BASE_URL = Config.EXPO_PUBLIC_API_URL;
export const API_TIMEOUT = 30_000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;

// Mock flag — set EXPO_PUBLIC_USE_MOCK=false in .env.production
export const USE_MOCK = Config.EXPO_PUBLIC_USE_MOCK;

// ---------------------------------------------------------------------------
// SecureStore keys
// NEVER rename these after the first production release without a migration.
// ---------------------------------------------------------------------------
export const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'nbfc_access_token',
  REFRESH_TOKEN: 'nbfc_refresh_token',
  USER_ID: 'nbfc_user_id',
  USER: 'nbfc_user',
  GOLD_LOAN_NOTIFY: 'nbfc_gold_loan_notify',
  USER_ROLE: 'nbfc_user_role',
  ONBOARDING_DONE: 'nbfc_onboarding_done',
  MPIN: 'nbfc_mpin',
  // Per-install random UUID used as the MPIN hash salt.
  // Generated once on first setMpin; lives for the lifetime of the install.
  MPIN_SALT: 'nbfc_mpin_salt',
  // Persisted failed-attempt counter (string-encoded integer).
  // Survives app restarts — never reset except on correct PIN or re-login.
  MPIN_ATTEMPTS: 'nbfc_mpin_attempts',

  // ── Sales Team module ──────────────────────────────────────────────────
  // Authenticated sales-agent session (PII) → secureStorage.
  SALES_AGENT: 'nbfc_sales_agent',
  // Last product the agent logged into (re-routes to the right dashboard) → secureStorage.
  SALES_PRODUCT: 'nbfc_sales_product',
  // Save-as-draft envelope map, keyed by draftId (non-PII routing key; values
  // are loan drafts that the agent can resume) → appStorage.
  SALES_DRAFTS: 'nbfc_sales_drafts',
  // Offline mutation queue (applications captured without connectivity) → appStorage.
  SALES_OFFLINE_QUEUE: 'nbfc_sales_offline_queue',
} as const;

export const MPIN_LENGTH = 4;

// OTP Configuration
export const OTP_LENGTH = 6;
export const OTP_RESEND_TIMER = 30; // seconds

// Loan constants
export const LOAN_TYPES = {
  CONSUMER_DURABLE: 'consumer_durable',
  AFFORDABLE_HOUSING: 'affordable_housing',
  GOLD_LOAN: 'gold_loan',
} as const;

export const TENURE_OPTIONS = [3, 6, 9, 12, 18] as const;

// App info
export const APP_NAME = 'Fuehrer';
// TODO(owner): replace with real value (support email shown in-app)
export const SUPPORT_EMAIL = 'support@fuehrernbfc.in';
// TODO(owner): replace with real value (grievance/privacy email shown in-app)
export const PRIVACY_EMAIL = 'privacy@fuehrernbfc.in';
// TODO(owner): replace with real value (toll-free support number shown in-app)
export const SUPPORT_PHONE = '1800-XXX-XXXX';

// Links
// TODO(owner): replace with real value (public Terms of Service URL)
export const TERMS_URL = 'https://fuehrernbfc.in/terms';
// TODO(owner): replace with real value (public Privacy Policy URL)
export const PRIVACY_URL = 'https://fuehrernbfc.in/privacy';
export const PMAY_URL = 'https://pmaymis.gov.in';

// ---------------------------------------------------------------------------
// Mock data  — only used when USE_MOCK=true (development/staging)
// MOCK_OTP is only referenced inside __DEV__ blocks and in mockAuthService
// which is never bundled for production (USE_MOCK is false).
// ---------------------------------------------------------------------------
export const MOCK_USER = {
  id: 'usr_001',
  name: 'Arjun Kumar',
  phone: '+919800000012',
  email: 'arjun@example.com',
};

/** Only ever displayed in __DEV__ UI hints. Never used in logic paths. */
export const MOCK_OTP = __DEV__ ? '123456' : '';
