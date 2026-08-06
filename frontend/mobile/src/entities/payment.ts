// ---------------------------------------------------------------------------
// Payment Entities
// ---------------------------------------------------------------------------

export type PaymentMethod = 'upi' | 'net_banking' | 'debit_card' | 'nach';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'refunded';

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionRef?: string;
  createdAt: string;
  updatedAt: string;
  remarks?: string;
}

export interface ProcessEMIPaymentRequest {
  loanId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface ProcessEMIPaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  transactionRef?: string;
  /** Present when paymentMethod requires a browser redirect (UPI / net-banking). */
  redirectUrl?: string;
  message: string;
}

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
}

export interface NACHInitiateRequest {
  loanId: string;
  bankDetails: BankDetails;
}

export interface NACHResponse {
  mandateId: string;
  status: 'pending' | 'active' | 'failed' | 'cancelled';
  /** URL to complete NACH registration in a webview (net-banking flow). */
  registrationUrl?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Linked bank accounts & their e-NACH mandates
// ---------------------------------------------------------------------------

/**
 * Mandate lifecycle as the customer app needs to see it.
 *
 * `paused`, `cancelled` and `expired` are deliberately distinct from `failed`:
 * a customer whose mandate the BANK cancelled needs to re-register, whereas one
 * whose debit merely bounced needs to fund the account. Collapsing them into
 * "inactive" is what made the old hardcoded screen useless.
 */
export type MandateState =
  | 'active'
  | 'pending'
  | 'paused'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'none';

export interface AccountMandate {
  status: MandateState;
  /** NPCI Unique Mandate Reference Number. Absent until registration completes. */
  umrn?: string;
  maxAmount?: number;
  registeredAt?: string;
  /** Human-readable reason for the last failure — shown verbatim to the customer. */
  failureReason?: string;
}

export interface LinkedBankAccount {
  id: string;
  bankName: string;
  /** Already masked by the server. The app never receives a full account number. */
  accountMasked: string;
  accountType: 'Savings' | 'Current';
  ifsc: string;
  isPrimary: boolean;
  /** null = no mandate has ever been registered on this account. */
  mandate: AccountMandate | null;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  transactionRef?: string;
  amount: number;
  updatedAt: string;
}
