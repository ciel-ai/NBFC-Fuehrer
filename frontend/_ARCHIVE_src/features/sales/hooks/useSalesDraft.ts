import { useCallback, useEffect, useRef, useState } from 'react';
import { useSalesStore } from '@/src/store/salesStore';
import type { SalesProduct } from '@/src/entities/salesAgent';

const AUTOSAVE_DEBOUNCE_MS = 600;

/**
 * Owns the active wizard draft: creates a new one (or resumes an existing
 * `draftId`), exposes the captured data to seed the form, and debounce-saves
 * every change to the store (which persists to appStorage).
 */
export function useSalesDraft(product: SalesProduct, paramDraftId?: string) {
  const startDraft = useSalesStore((s) => s.startDraft);
  const saveDraft = useSalesStore((s) => s.saveDraft);
  const getDraft = useSalesStore((s) => s.getDraft);
  const setActiveDraft = useSalesStore((s) => s.setActiveDraft);

  // Resolve the draft id once. Resuming uses the passed id; a fresh start
  // creates an empty draft and makes it active.
  const [draftId] = useState(() => paramDraftId ?? startDraft(product));

  // Capture the seed data once so re-renders don't reset the form.
  const initialDataRef = useRef<Record<string, unknown>>(getDraft(draftId)?.data ?? {});
  const initialStepRef = useRef<number>(getDraft(draftId)?.stepIndex ?? 0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveDraft(draftId);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      setActiveDraft(null);
    };
  }, [draftId, setActiveDraft]);

  const writeNow = useCallback(
    (data: Record<string, unknown>, stepIndex: number, label: string) => {
      const existing = getDraft(draftId);
      if (!existing) return;
      void saveDraft({ ...existing, data, stepIndex, label });
    },
    [draftId, getDraft, saveDraft],
  );

  /** Debounced auto-save — called on every form change. */
  const save = useCallback(
    (data: Record<string, unknown>, stepIndex: number, label: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => writeNow(data, stepIndex, label), AUTOSAVE_DEBOUNCE_MS);
    },
    [writeNow],
  );

  /** Immediate save — called on explicit step transitions. */
  const flush = useCallback(
    (data: Record<string, unknown>, stepIndex: number, label: string) => {
      if (timer.current) clearTimeout(timer.current);
      writeNow(data, stepIndex, label);
    },
    [writeNow],
  );

  return {
    draftId,
    initialData: initialDataRef.current,
    initialStep: initialStepRef.current,
    save,
    flush,
  };
}
