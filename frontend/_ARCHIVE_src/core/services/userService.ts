import api, { mockDelay } from '../api/api';
import { USE_MOCK } from '@/src/core/utils/constants';
import type { UserProfile, UpdateProfileRequest } from '@/src/entities/user';

const MOCK_PROFILE: UserProfile = {
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

export async function getProfile(): Promise<UserProfile> {
  if (USE_MOCK) return mockDelay(MOCK_PROFILE, 600);
  const response = await api.get<UserProfile>('/user/profile');
  return response.data;
}

export async function updateProfile(updates: UpdateProfileRequest): Promise<UserProfile> {
  if (USE_MOCK) {
    const merged: UserProfile = {
      ...MOCK_PROFILE,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.email !== undefined ? { email: updates.email } : {}),
      ...(updates.dateOfBirth !== undefined ? { dateOfBirth: updates.dateOfBirth } : {}),
    };
    return mockDelay(merged, 800);
  }
  const response = await api.put<UserProfile>('/user/profile', updates);
  return response.data;
}
