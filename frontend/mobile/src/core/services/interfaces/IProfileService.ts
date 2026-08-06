import type {
  UserProfile,
  UpdateProfileRequest,
  PhotoUpdateResponse,
  ChangePhoneResponse,
  AccountDeletionResult,
} from '@/src/entities/user';

export interface IProfileService {
  getProfile(): Promise<UserProfile>;
  updateProfile(data: UpdateProfileRequest): Promise<UserProfile>;
  /** Uploads a new profile photo from a local file URI. */
  updateProfilePhoto(uri: string): Promise<PhotoUpdateResponse>;
  changePhone(newPhone: string): Promise<ChangePhoneResponse>;
  /**
   * Initiates account deletion (store-policy requirement: Play User Data /
   * Apple 5.1.1(v)). Backend contract: POST /user/profile/delete-request.
   */
  requestAccountDeletion(reason?: string): Promise<AccountDeletionResult>;
}
