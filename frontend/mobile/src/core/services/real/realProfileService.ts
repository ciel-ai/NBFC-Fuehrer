import api from '../../api/api';
import type { IProfileService } from '../interfaces/IProfileService';
import type {
  UserProfile,
  UpdateProfileRequest,
  PhotoUpdateResponse,
  ChangePhoneResponse,
  AccountDeletionResult,
} from '@/src/entities/user';

export const realProfileService: IProfileService = {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/user/profile');
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/user/profile', data);
    return response.data;
  },

  /**
   * Uploads a profile photo as multipart/form-data.
   *
   * Note: the SSL-pinning axios adapter in api.ts serialises the request body as
   * JSON by default. FormData uploads are handled here by passing the raw
   * FormData object with an explicit Content-Type override; the underlying
   * react-native-ssl-pinning fetch accepts FormData on both iOS and Android.
   * If the adapter needs updating to support FormData, see api.ts createPinnedAdapter.
   */
  async updateProfilePhoto(uri: string): Promise<PhotoUpdateResponse> {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const response = await api.patch<PhotoUpdateResponse>('/user/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async changePhone(newPhone: string): Promise<ChangePhoneResponse> {
    const response = await api.post<ChangePhoneResponse>('/user/phone/change', { newPhone });
    return response.data;
  },

  async requestAccountDeletion(reason?: string): Promise<AccountDeletionResult> {
    const response = await api.post<AccountDeletionResult>('/user/profile/delete-request', {
      reason,
    });
    return response.data;
  },
};
