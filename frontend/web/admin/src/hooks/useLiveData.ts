import { useCallback, useEffect, useRef, useState } from 'react';
import { USE_MOCK } from '../config';

/* ============================================================================
 * The data-source contract.
 *
 * Every screen in this app fetches from the real API and falls back to the local
 * sample store when it cannot. That is a reasonable strategy — but each hook
 * implemented it with a bare `.catch(() => setData(null))`, which threw the error
 * away. The consequence was that the UI could not distinguish:
 *
 *     "the API is down"   from   "we're in mock mode"   from   "no records"
 *
 * All three collapsed into `live: false`, and six screens papered over it by
 * concatenating " · sample data (live API unreachable)" into a subtitle string.
 * Nothing offered a retry, because nothing knew a failure had happened.
 *
 * This hook keeps the fallback but stops lying about it. A screen now knows which
 * of the three states it is in, why, and how to recover — and renders that through
 * one shared <DataSourceNotice />.
 * ==========================================================================*/

export type DataSource =
  | 'live' // came from the API
  | 'mock' // VITE_USE_MOCK — sample data by configuration, not by failure
  | 'fallback'; // the API failed; showing sample data instead

export interface LiveResult<T> {
  data: T;
  source: DataSource;
  loading: boolean;
  /** Human-readable reason we fell back. Null unless source === 'fallback'. */
  error: string | null;
  reload: () => void;
}

/** Turn an unknown throwable into something worth showing a person. */
export function describeError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { message?: string } };
    code?: string;
  };

  const status = e.response?.status;
  if (status === 401) return 'Your session has expired — sign in again';
  if (status === 403) return 'You do not have permission to view this data';
  if (status === 404) return 'This record no longer exists';
  if (status && status >= 500) return 'The server failed while loading this data';

  if (e.code === 'ECONNABORTED') return 'The server took too long to respond';
  if (e.code === 'ERR_NETWORK') return 'Cannot reach the server';

  return e.response?.data?.message ?? 'Could not load this data';
}

/**
 * Fetch with a sample-data fallback, without discarding the failure.
 *
 * @param fetcher  the live call
 * @param fallback the sample data to show if it fails (or in mock mode)
 * @param deps     re-fetch when these change
 */
export function useLiveData<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: React.DependencyList = [],
): LiveResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  /* Keep the fetcher in a ref so callers can pass an inline arrow function
     without the effect re-running on every render. */
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (USE_MOCK) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((rows) => {
        if (!alive) return;
        setData(rows);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setData(null);
        setError(describeError(err)); // <- the line the old hooks were missing
        setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const source: DataSource = USE_MOCK ? 'mock' : data !== null ? 'live' : 'fallback';

  return {
    data: data ?? fallback,
    source,
    loading,
    error: source === 'fallback' ? error : null,
    reload,
  };
}
