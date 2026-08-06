export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  panNumber?: string;
  address?: Address;
  bankAccounts?: BankAccount[];
  createdAt: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string; // masked
  ifscCode: string;
  isDefault: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  address?: Partial<Address>;
}

export interface PhotoUpdateResponse {
  photoUrl: string;
  message: string;
}

export interface ChangePhoneRequest {
  newPhone: string;
}

export interface ChangePhoneResponse {
  success: boolean;
  message: string;
  /** True when the backend requires OTP confirmation to commit the change. */
  otpRequired: boolean;
}

export interface AccountDeletionResult {
  requestId: string;
  status: 'PENDING';
  /** ISO date by which the deletion will be processed (regulatory retention may apply). */
  effectiveBy?: string;
  message: string;
}
