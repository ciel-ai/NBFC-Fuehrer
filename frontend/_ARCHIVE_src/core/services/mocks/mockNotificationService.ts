import { mockDelay } from '../../api/api';
import type { INotificationService } from '../interfaces/INotificationService';
import type {
  AppNotification,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from '@/src/entities/notification';

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_003',
    type: 'emi_due',
    title: 'EMI Due in 3 Days',
    body: 'Your EMI of ₹4,582 for Consumer Durable Loan is due on 15 Oct 2023.',
    isRead: false,
    createdAt: '2023-10-12T09:00:00Z',
    data: { loanId: 'loan_001', screen: 'loan-detail' },
  },
  {
    id: 'notif_002',
    type: 'emi_paid',
    title: 'EMI Payment Successful',
    body: 'Your EMI of ₹4,582 has been received. Thank you!',
    isRead: false,
    createdAt: '2023-09-14T10:30:15Z',
    data: { loanId: 'loan_001', paymentId: 'pay_002' },
  },
  {
    id: 'notif_001',
    type: 'loan_disbursed',
    title: 'Loan Disbursed',
    body: 'Your Consumer Durable Loan of ₹50,000 has been disbursed to your account.',
    isRead: true,
    createdAt: '2023-04-15T14:22:00Z',
    data: { loanId: 'loan_001' },
  },
];

let notifications = [...MOCK_NOTIFICATIONS];

export const mockNotificationService: INotificationService = {
  async getNotifications(
    page?: number,
    cursor?: string,
  ): Promise<PaginatedNotificationsResponse> {
    return mockDelay<PaginatedNotificationsResponse>(
      {
        notifications,
        nextCursor: undefined,
        hasMore: false,
        total: notifications.length,
      },
      600,
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    notifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    );
    await mockDelay(null, 300);
  },

  async markAllAsRead(): Promise<void> {
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
    await mockDelay(null, 400);
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const count = notifications.filter((n) => !n.isRead).length;
    return mockDelay<UnreadCountResponse>({ count }, 200);
  },
};
