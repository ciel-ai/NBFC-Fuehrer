// src/api/dashboard.api.ts
//
// Dashboard summary — single-call contract matching the backend's
// GET /dashboard/summary (modules/web/dashboard). The previous four-endpoint
// contract (/kpis, /trends, /pending-actions, /recent-applications) never
// existed on the backend; this resolves that mismatch frontend-side.

import { apiClient } from './client';

// ─── Wire shapes (mirror dashboard.routes.ts response) ───────────────────────

export interface DashboardKpis {
  totalLoans: number;
  activeLoans: number;
  disbursedThisMonth: number;
  closedThisMonth: number;
  npaLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalOverdue: number;
  npaRate: number;
}

export interface TrendPoint {
  month: string;
  count: number;
  amount: number;
}

export interface PendingAction {
  type: string;   // CREDIT_REVIEW | FINANCE_DISBURSEMENT | …
  count: number;
  link: string;
}

export interface RecentApplicationRow {
  id: string;
  status: string;
  amount_requested: string | number;
  approved_amount: string | number | null;
  product_type: string;
  applied_at: string;
  user: { full_name: string; phone: string };
}

export interface RecentActivityRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  role: string | null;
  created_at: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  applicationTrend: { week: string; count: number }[];
  typeDistribution: { type: string; count: number }[];
  approvalRatio: { approved: number; rejected: number; approvalRate: number };
  disbursementTrend: TrendPoint[];
  collectionPerformance: TrendPoint[];
  pendingActions: PendingAction[];
  recentApplications: RecentApplicationRow[];
  recentActivities: RecentActivityRow[];
}

export const dashboardApi = {
  /** GET /dashboard/summary — responds with the summary object unwrapped. */
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data as DashboardSummary;
  },
};
