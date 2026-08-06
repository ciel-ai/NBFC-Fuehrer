import type {
  Payment,
  PaymentMethod,
  ProcessEMIPaymentResponse,
  BankDetails,
  LinkedBankAccount,
  NACHResponse,
  PaymentStatusResponse,
} from '@/src/entities/payment';

export interface IPaymentService {
  processEMIPayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    /** Idempotency key — reused across retries of the same payment. */
    idempotencyKey?: string,
  ): Promise<ProcessEMIPaymentResponse>;
  getPaymentHistory(loanId: string): Promise<Payment[]>;
  initiateNACH(
    loanId: string,
    bankDetails: BankDetails,
    idempotencyKey?: string,
  ): Promise<NACHResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
  /**
   * The customer's linked bank accounts, each with its live e-NACH mandate.
   * Backed by the ENachMandate table — never by a hardcoded list, or the app
   * shows a healthy mandate to a customer whose auto-debit has actually died.
   */
  getBankAccounts(): Promise<LinkedBankAccount[]>;
}
