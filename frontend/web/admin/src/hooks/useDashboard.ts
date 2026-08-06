// src/hooks/useDashboard.ts
//
// Live dashboard summary. Fetches /dashboard/summary and keeps the screen's
// store-derived sample data if the API cannot be reached — but reports WHY,
// so the page can say so and offer a retry. See hooks/useLiveData.ts.

import { useLiveData } from './useLiveData';
import type { DataSource } from './useLiveData';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardSummary } from '../api/dashboard.api';

export function useDashboardSummary(): {
  summary: DashboardSummary | null;
  source: DataSource;
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { data, source, loading, error, reload } = useLiveData<DashboardSummary | null>(
    () => dashboardApi.getSummary(),
    null,
  );

  return { summary: data, source, live: source === 'live', loading, error, reload };
}
