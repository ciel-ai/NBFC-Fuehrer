import type {
  Payment,
  PaymentMethod,
  ProcessEMIPaymentResponse,
  BankDetails,
  NACHResponse,
  PaymentStatusResponse,
} from '@/src/entities/payment';

export interface IPaymentService {
  processEMIPayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
  ): Promise<ProcessEMIPaymentResponse>;
  getPaymentHistory(loanId: string): Promise<Payment[]>;
  initiateNACH(loanId: string, bankDetails: BankDetails): Promise<NACHResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
}
