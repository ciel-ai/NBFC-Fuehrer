import { mockDelay } from '../../api/api';
import type { IProfileService } from '../interfaces/IProfileService';
import type {
  UserProfile,
  UpdateProfileRequest,
  PhotoUpdateResponse,
  ChangePhoneResponse,
  AccountDeletionResult,
} from '@/src/entities/user';

let MOCK_PROFILE: UserProfile = {
  id: 'usr_001',
  name: 'Arjun Kumar',
  phone: '+91 9800000012',
  email: 'arjun@example.com',
  dateOfBirth: '1992-05-15',
  panNumber: 'ABCDE****F',
  address: {
    line1: '42, MG Road',
    line2: 'Indiranagar',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560038',
  },
  bankAccounts: [
    {
      id: 'bank_001',
      bankName: 'HDFC Bank',
      accountNumber: '****4521',
      ifscCode: 'HDFC0001234',
      isDefault: true,
    },
  ],
  createdAt: '2023-01-15',
};

export const mockProfileService: IProfileService = {
  async getProfile(): Promise<UserProfile> {
    return mockDelay({ ...MOCK_PROFILE }, 600);
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    MOCK_PROFILE = {
      ...MOCK_PROFILE,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth } : {}),
      ...(data.address !== undefined
        ? { address: { ...MOCK_PROFILE.address!, ...data.address } }
        : {}),
    };
    return mockDelay({ ...MOCK_PROFILE }, 800);
  },

  async updateProfilePhoto(uri: string): Promise<PhotoUpdateResponse> {
    await mockDelay(null, 1200);
    return {
      photoUrl: uri, // echo back the local URI in mock
      message: 'Profile photo updated successfully.',
    };
  },

  async changePhone(newPhone: string): Promise<ChangePhoneResponse> {
    await mockDelay(null, 700);
    return {
      success: true,
      message: `OTP sent to ${newPhone}. Please verify to confirm the change.`,
      otpRequired: true,
    };
  },

  async requestAccountDeletion(): Promise<AccountDeletionResult> {
    await mockDelay(null, 900);
    const effectiveBy = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      requestId: `del_${Date.now()}`,
      status: 'PENDING',
      effectiveBy,
      message: 'Your account deletion request has been recorded.',
    };
  },
};
