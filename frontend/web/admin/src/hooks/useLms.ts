// src/hooks/useLms.ts
//
// Live-data hooks for the LMS (loan servicing) screens.
// Live-first, with a labelled sample-data fallback that reports why it fell back.
// See hooks/useLiveData.ts for the contract.

import { useEffect, useMemo, useState } from 'react';
import { USE_MOCK } from '../config';
import { lmsApi } from '../api/lms.api';
import type { LiveLoanAccount } from '../api/lms.api';
import { nachApi } from '../api/nach.api';
import { useAppStore } from '../store/appStore';
import { describeError, useLiveData } from './useLiveData';
import type { DataSource } from './useLiveData';
import type { LoanAccount, Repayment } from '../types';

// ─── Loan book (list screen) ──────────────────────────────────────────────────

export function useLoanBook(): {
  loans: LoanAccount[];
  source: DataSource;
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const mockLoans = useAppStore((s) => s.loans);

  const { data, source, loading, error, reload } = useLiveData<LoanAccount[]>(
    () => lmsApi.listAccounts({ limit: 100 }) as Promise<LoanAccount[]>,
    mockLoans,
  );

  return { loans: data, source, live: source === 'live', loading, error, reload };
}

// ─── Single loan account + schedule (detail screen) ───────────────────────────

export function useLoanAccount(loanNumber: string | undefined): {
  loan: LoanAccount | undefined;
  source: DataSource;
  live: boolean;
  loading: boolean;
  error: string | null;
  payments: Repayment[] | null;
  reload: () => void;
} {
  const mockLoan = useAppStore((s) => s.loans.find((l) => l.loanNumber === loanNumber));

  const [liveLoan, setLiveLoan] = useState<LiveLoanAccount | null>(null);
  const [payments, setPayments] = useState<Repayment[] | null>(null);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (USE_MOCK || !loanNumber) {
      setLiveLoan(null);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Account numbers are unique — search resolves the UUID, then the
        // schedule is fetched from the EMI module.
        const rows = await lmsApi.listAccounts({ search: loanNumber, limit: 5 });
        const hit = rows.find((r) => r.loanNumber === loanNumber) ?? null;

        if (hit) {
          hit.schedule = await lmsApi.getSchedule(hit.id);
          // The payment ledger is non-fatal: the tab falls back to the store.
          try {
            const pmts = await lmsApi.getPayments(hit.id, hit);
            if (alive) setPayments(pmts);
          } catch {
            if (alive) setPayments(null);
          }
          /* The mandate is non-fatal too. It stays UNDEFINED on failure, which
             the panel renders as "could not be loaded" — deliberately not as
             "no mandate", because telling staff a live mandate does not exist
             is worse than telling them we do not know. */
          try {
            hit.mandate = (await nachApi.getLoanMandate(hit.id)) ?? undefined;
          } catch {
            hit.mandate = undefined;
          }
        }

        if (alive) {
          setLiveLoan(hit);
          // A search that matches nothing is not an error — it's a missing record.
          setError(hit ? null : 'This loan account was not found on the server');
          setLoading(false);
        }
      } catch (err) {
        if (alive) {
          setLiveLoan(null);
          setError(describeError(err));
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [loanNumber, nonce]);

  return useMemo(() => {
    const source: DataSource = USE_MOCK ? 'mock' : liveLoan !== null ? 'live' : 'fallback';
    return {
      loan: liveLoan ?? mockLoan,
      source,
      live: source === 'live',
      loading,
      error: source === 'fallback' ? error : null,
      payments,
      reload: () => setNonce((n) => n + 1),
    };
  }, [liveLoan, mockLoan, loading, error, payments]);
}
