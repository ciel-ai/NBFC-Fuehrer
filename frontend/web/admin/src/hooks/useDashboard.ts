// src/hooks/useDashboard.ts
//
// Live dashboard summary — same live-first / labelled-fallback convention
// as useLms: fetch the real /dashboard/summary once; if the API is
// unreachable the screen keeps its store-derived sample data and the
// `live` flag lets it say so honestly.

import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardSummary } from '../api/dashboard.api';

export function useDashboardSummary(): {
  summary: DashboardSummary | null;
  live: boolean;
  loading: boolean;
} {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) { setLoading(false); return; }
    let alive = true;
    dashboardApi.getSummary()
      .then((s) => { if (alive) { setSummary(s); setLoading(false); } })
      .catch(() => { if (alive) { setSummary(null); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  return { summary, live: summary !== null, loading };
}
