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

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
  transactionRef?: string;
  amount: number;
  updatedAt: string;
}
