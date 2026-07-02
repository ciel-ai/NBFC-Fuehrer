import api from '../../api/api';
import type { INotificationService } from '../interfaces/INotificationService';
import type {
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from '@/src/entities/notification';

export const realNotificationService: INotificationService = {
  async getNotifications(
    page?: number,
    cursor?: string,
  ): Promise<PaginatedNotificationsResponse> {
    const response = await api.get<PaginatedNotificationsResponse>('/notifications', {
      params: {
        ...(cursor !== undefined ? { cursor } : {}),
        ...(page !== undefined ? { page } : {}),
      },
    });
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },
};
