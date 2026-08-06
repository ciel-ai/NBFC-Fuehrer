import { mockDelay } from '../../api/api';
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

/**
 * Linked accounts as the ENachMandate table would return them.
 *
 * Deliberately not all-green: the second account carries a mandate the bank
 * revoked. The screen has to render that honestly, because a customer who
 * believes auto-debit is working and is silently accruing DPD is the exact
 * failure this data shape exists to prevent.
 */
const MOCK_ACCOUNTS: LinkedBankAccount[] = [
  {
    id: 'acc-hdfc',
    bankName: 'HDFC Bank',
    accountMasked: 'XXXX XXXX 4521',
    accountType: 'Savings',
    ifsc: 'HDFC0001234',
    isPrimary: true,
    mandate: {
      status: 'active',
      umrn: 'HDFC6120250417001',
      maxAmount: 10000,
      registeredAt: '2025-04-17T09:12:00Z',
    },
  },
  {
    id: 'acc-icici',
    bankName: 'ICICI Bank',
    accountMasked: 'XXXX XXXX 8847',
    accountType: 'Savings',
    ifsc: 'ICIC0007722',
    isPrimary: false,
    mandate: {
      status: 'failed',
      umrn: 'ICIC6120250902014',
      maxAmount: 10000,
      registeredAt: '2025-09-02T11:40:00Z',
      failureReason: 'Last auto-debit was returned — insufficient funds',
    },
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

  async getBankAccounts(): Promise<LinkedBankAccount[]> {
    return mockDelay(MOCK_ACCOUNTS, 600);
  },
};
