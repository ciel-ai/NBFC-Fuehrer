// src/hooks/useLms.ts
//
// Live-data hooks for the LMS (loan servicing) screens.
// Strategy: fetch from the real API first; if the API is unreachable the
// hooks fall back to the local sample store and set `live: false` so the
// screen can label the data honestly ("sample data").

import { useEffect, useMemo, useState } from 'react';
import { lmsApi } from '../api/lms.api';
import type { LiveLoanAccount } from '../api/lms.api';
import { useAppStore } from '../store/appStore';
import type { LoanAccount } from '../types';

// ─── Loan book (list screen) ──────────────────────────────────────────────────

export function useLoanBook(): {
  loans: LoanAccount[];
  live: boolean;
  loading: boolean;
  reload: () => void;
} {
  const mockLoans = useAppStore((s) => s.loans);
  const [data, setData] = useState<LiveLoanAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    lmsApi.listAccounts({ limit: 100 })
      .then((rows) => { if (alive) { setData(rows); setLoading(false); } })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [nonce]);

  return {
    loans: data ?? mockLoans,
    live: data !== null,
    loading,
    reload: () => setNonce((n) => n + 1),
  };
}

// ─── Single loan account + schedule (detail screen) ───────────────────────────

export function useLoanAccount(loanNumber: string | undefined): {
  loan: LoanAccount | undefined;
  live: boolean;
  loading: boolean;
} {
  const mockLoan = useAppStore(
    (s) => s.loans.find((l) => l.loanNumber === loanNumber),
  );
  const [liveLoan, setLiveLoan] = useState<LiveLoanAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loanNumber) { setLiveLoan(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // Account numbers are unique — search resolves the UUID, then the
        // schedule is fetched from the EMI module.
        const rows = await lmsApi.listAccounts({ search: loanNumber, limit: 5 });
        const hit = rows.find((r) => r.loanNumber === loanNumber) ?? null;
        if (hit) hit.schedule = await lmsApi.getSchedule(hit.id);
        if (alive) { setLiveLoan(hit); setLoading(false); }
      } catch {
        if (alive) { setLiveLoan(null); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [loanNumber]);

  return useMemo(() => ({
    loan: liveLoan ?? mockLoan,
    live: liveLoan !== null,
    loading,
  }), [liveLoan, mockLoan, loading]);
}
