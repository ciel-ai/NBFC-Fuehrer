import { useCallback, useEffect, useState } from 'react';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';

import {
  draftLabel,
  latestApplyDraft,
  removeApplyDraft,
  saveApplyDraft,
  type ApplyFlow,
  type CustomerApplyDraft,
} from './customerDraft';

type Href = Parameters<typeof router.push>[0];

/**
 * Snapshot the current step of a customer apply flow so it can be resumed
 * after the app is killed. Call once near the top of each gold/CDL step
 * screen: it reads the threaded params + current route and persists them.
 *
 * Only persists once the flow has actually started (an `applicationId` is
 * present), so the estimator / landing screens don't create empty drafts.
 */
export function usePersistApplyStep(flow: ApplyFlow): void {
  const params = useLocalSearchParams<Record<string, string>>();
  const pathname = usePathname();
  // Params is a fresh object each render; serialize for a stable effect dep.
  const serialized = JSON.stringify(params);

  useEffect(() => {
    if (!params.applicationId) return;
    void saveApplyDraft({
      flow,
      pathname,
      params: params as Record<string, string>,
      label: draftLabel(flow, params as Record<string, string>),
      updatedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, pathname, serialized]);
}

/**
 * Clear a flow's resume draft once the journey reaches a terminal screen
 * (disbursal / submitted / summary). Idempotent — safe to call on mount.
 */
export function useClearApplyDraft(flow: ApplyFlow): void {
  useEffect(() => {
    void removeApplyDraft(flow);
  }, [flow]);
}

/**
 * Read the latest resumable draft for the home screen. Refreshes whenever the
 * screen regains focus so a freshly-abandoned flow shows up immediately, and a
 * resumed/completed one disappears.
 */
export function useCustomerApplyDraft() {
  const [draft, setDraft] = useState<CustomerApplyDraft | null>(null);

  const refresh = useCallback(async () => {
    setDraft(await latestApplyDraft());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const resume = useCallback(() => {
    if (!draft) return;
    router.push({ pathname: draft.pathname, params: draft.params } as Href);
  }, [draft]);

  const discard = useCallback(async () => {
    if (!draft) return;
    await removeApplyDraft(draft.flow);
    setDraft(null);
  }, [draft]);

  return { draft, resume, discard, refresh };
}
