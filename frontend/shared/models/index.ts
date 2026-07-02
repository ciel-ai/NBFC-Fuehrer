export interface User {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  isKycDone: boolean;
  kycStatus: string;
  isActive: boolean;
  role: 'CUSTOMER' | 'AGENT' | string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesAgent {
  id: string;
  userId: string;
  product: 'cdl' | 'gold' | 'housing' | string;
  branch: string;
  fdoCode: string;
  name: string;
}

export interface LoanApplication {
  id: string;
  userId: string;
  productType: 'consumer_durable' | 'affordable_housing' | 'gold_loan' | string;
  amount: number;
  tenure: number;
  annualInterestRate: number;
  merchantId?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | string;
  cibilScore?: number | null;
  fraudScore?: number | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmiSchedule {
  id: string;
  applicationId: string;
  instalmentNo: number;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | string;
  retryCount: number;
  paidAt?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  applicationId: string;
  amount: number;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
  razorpayId?: string | null;
  createdAt: string;
}

export interface KycDetail {
  id: string;
  userId: string;
  panNumber?: string | null;
  panVerified: boolean;
  aadhaarNumber?: string | null;
  aadhaarVerified: boolean;
  selfieVerified: boolean;
  eSignStatus: 'PENDING' | 'SIGNED' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ENachMandate {
  id: string;
  userId: string;
  mandateId: string;
  status: 'PENDING' | 'ACTIVE' | 'FAILED' | string;
  createdAt: string;
  updatedAt: string;
}
