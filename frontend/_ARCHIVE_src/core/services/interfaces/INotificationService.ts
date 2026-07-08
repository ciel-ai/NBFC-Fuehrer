import type {
  AppNotification,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from '@/src/entities/notification';

export interface INotificationService {
  getNotifications(page?: number, cursor?: string): Promise<PaginatedNotificationsResponse>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  getUnreadCount(): Promise<UnreadCountResponse>;
}
