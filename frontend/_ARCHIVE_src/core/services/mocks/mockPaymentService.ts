import { mockDelay } from '../../api/api';
import type { IPaymentService } from '../interfaces/IPaymentService';
import type {
  Payment,
  PaymentMethod,
  ProcessEMIPaymentResponse,
  BankDetails,
  NACHResponse,
  PaymentStatusResponse,
} from '@/src/entities/payment';

const MOCK_HISTORY: Payment[] = [
  {
    id: 'pay_002',
    loanId: 'loan_001',
    amount: 4582,
    status: 'success',
    method: 'upi',
    transactionRef: 'TXN20230914001',
    createdAt: '2023-09-14T10:30:00Z',
    updatedAt: '2023-09-14T10:30:12Z',
  },
  {
    id: 'pay_001',
    loanId: 'loan_001',
    amount: 4582,
    status: 'success',
    method: 'net_banking',
    transactionRef: 'TXN20230814002',
    createdAt: '2023-08-14T11:00:00Z',
    updatedAt: '2023-08-14T11:00:08Z',
  },
];

export const mockPaymentService: IPaymentService = {
  async processEMIPayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
  ): Promise<ProcessEMIPaymentResponse> {
    await mockDelay(null, 1200);
    return {
      paymentId: 'pay_' + Date.now(),
      status: 'processing',
      transactionRef: 'TXN' + Date.now(),
      message: 'Payment initiated. Please complete the transaction.',
    };
  },

  async getPaymentHistory(loanId: string): Promise<Payment[]> {
    return mockDelay(
      MOCK_HISTORY.filter((p) => p.loanId === loanId),
      700,
    );
  },

  async initiateNACH(loanId: string, bankDetails: BankDetails): Promise<NACHResponse> {
    await mockDelay(null, 1500);
    return {
      mandateId: 'mandate_' + Date.now(),
      status: 'pending',
      registrationUrl: 'https://nach.example.com/register/mock',
      message: 'NACH mandate initiated. Complete registration via net banking.',
    };
  },

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    return mockDelay<PaymentStatusResponse>(
      {
        paymentId,
        status: 'success',
        transactionRef: 'TXN_MOCK_' + paymentId,
        amount: 4582,
        updatedAt: new Date().toISOString(),
      },
      500,
    );
  },
};
