// ---------------------------------------------------------------------------
// Notification Entities
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'emi_due'
  | 'emi_paid'
  | 'loan_approved'
  | 'loan_disbursed'
  | 'kyc_update'
  | 'payment_failed'
  | 'nach_registered'
  | 'general';

/**
 * Named AppNotification to avoid shadowing the global DOM/RN Notification type.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  /** Arbitrary key-value pairs for deep-linking (e.g. loanId, screen route). */
  data?: Record<string, string>;
}

export interface PaginatedNotificationsResponse {
  notifications: AppNotification[];
  /** Opaque cursor for the next page; absent when there are no more pages. */
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}
