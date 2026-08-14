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
export function usePersistApplyStep(
  flow: ApplyFlow,
  options?: { enabled?: boolean },
): void {
  const params = useLocalSearchParams<Record<string, string>>();
  const pathname = usePathname();
  // Params is a fresh object each render; serialize for a stable effect dep.
  const serialized = JSON.stringify(params);

  useEffect(() => {
    // Persist once the flow carries something worth resuming.
    //
    // This used to require an applicationId, which for CDL is only assigned at
    // the very END of the KYC chain (cdl-kyc-verification submits the
    // application). Everything the customer typed on the product screen —
    // productName, productValue, downPayment, loanAmount — travels through
    // five KYC screens before that point, and killing the app anywhere in
    // between discarded all of it with no draft to resume from.
    //
    // The original guard's purpose was to stop the estimator and landing
    // screens creating empty drafts; a positive loanAmount serves that purpose
    // just as well, since it only appears once the product step is complete.
    if (options?.enabled === false) return;
    const hasLoanAmount = Number(params.loanAmount ?? 0) > 0;
    if (!params.applicationId && !hasLoanAmount) return;
    void saveApplyDraft({
      flow,
      pathname,
      params: params as Record<string, string>,
      label: draftLabel(flow, params as Record<string, string>),
      updatedAt: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, pathname, serialized, options?.enabled]);
}

const APPLY_FLOWS: ApplyFlow[] = ['gold', 'cdl', 'housing'];

/**
 * Same as usePersistApplyStep, but takes the flow from the threaded
 * `applyFlow` param instead of a literal.
 *
 * For the KYC screens shared between products: address-employment is reached
 * from both the CDL chain and gold-loan-kyc, so it cannot hardcode a flow.
 * A screen reached without an `applyFlow` param persists nothing, which is
 * exactly what these screens did before — so the gold path is unchanged.
 */
export function usePersistApplyStepFromParams(): void {
  const params = useLocalSearchParams<Record<string, string>>();
  const flow = APPLY_FLOWS.find((f) => f === params.applyFlow);
  // Hook order is stable: usePersistApplyStep is always called, and decides
  // internally whether there is anything worth saving.
  usePersistApplyStep(flow ?? ('cdl' as ApplyFlow), { enabled: !!flow });
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
