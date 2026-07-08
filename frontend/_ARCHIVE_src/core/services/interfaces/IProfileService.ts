import type { UserProfile, UpdateProfileRequest, PhotoUpdateResponse, ChangePhoneResponse } from '@/src/entities/user';

export interface IProfileService {
  getProfile(): Promise<UserProfile>;
  updateProfile(data: UpdateProfileRequest): Promise<UserProfile>;
  /** Uploads a new profile photo from a local file URI. */
  updateProfilePhoto(uri: string): Promise<PhotoUpdateResponse>;
  changePhone(newPhone: string): Promise<ChangePhoneResponse>;
}
