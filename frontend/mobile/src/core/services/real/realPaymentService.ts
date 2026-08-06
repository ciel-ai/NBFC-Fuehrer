import api from '../../api/api';
import { idempotentConfig } from '../../api/idempotency';
import type { IPaymentService } from '../interfaces/IPaymentService';
import type {
  Payment,
  PaymentMethod,
  ProcessEMIPaymentResponse,
  BankDetails,
  LinkedBankAccount,
  NACHResponse,
  PaymentStatusResponse,
} from '@/src/entities/payment';

export const realPaymentService: IPaymentService = {
  async processEMIPayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    idempotencyKey?: string,
  ): Promise<ProcessEMIPaymentResponse> {
    const response = await api.post<ProcessEMIPaymentResponse>(
      '/payments/process',
      { loanId, amount, paymentMethod },
      idempotentConfig(idempotencyKey),
    );
    return response.data;
  },

  async getPaymentHistory(loanId: string): Promise<Payment[]> {
    const response = await api.get<Payment[]>(`/payments/history/${loanId}`);
    return response.data;
  },

  async initiateNACH(
    loanId: string,
    bankDetails: BankDetails,
    idempotencyKey?: string,
  ): Promise<NACHResponse> {
    const response = await api.post<NACHResponse>(
      '/payments/nach',
      { loanId, bankDetails },
      idempotentConfig(idempotencyKey),
    );
    return response.data;
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await api.get<PaymentStatusResponse>(`/payments/${paymentId}/status`);
    return response.data;
  },

  async getBankAccounts(): Promise<LinkedBankAccount[]> {
    const response = await api.get<LinkedBankAccount[]>('/payments/bank-accounts');
    return response.data;
  },
};
