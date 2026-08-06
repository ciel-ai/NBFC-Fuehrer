import { useCallback, useState } from 'react';

import type { DocumentUploadResult } from '@/src/entities/document';
import { useAssetPicker, type AssetSource } from '@/src/features/sales/hooks/useAssetPicker';

/**
 * Per-slot document capture + upload state, shared by every customer flow that
 * collects KYC docs / photos (gold KYC, ownership proof, CDL KYC, …).
 *
 * A slot renders its local `uri` immediately, then transitions
 * empty → uploading → uploaded | failed as the upload resolves. The screen
 * decides how to render each state; this hook owns the capture → upload →
 * retry / remove lifecycle so every capture point behaves the same.
 */

export type DocSlotState = 'empty' | 'uploading' | 'uploaded' | 'failed';

export interface DocSlot {
  /** Local file uri — what actually renders in mock and while uploading. */
  uri: string | null;
  /** Hosted url returned by the upload (or mock echo). */
  url: string | null;
  state: DocSlotState;
  error?: string;
}

/** Signature shared by every `*Service.uploadDocument`. */
export type UploadDocumentFn = (
  applicationId: string,
  uri: string,
  type: string,
) => Promise<DocumentUploadResult>;

function emptySlot(): DocSlot {
  return { uri: null, url: null, state: 'empty' };
}

export function useDocumentSlots(
  keys: readonly string[],
  applicationId: string,
  uploadFn: UploadDocumentFn,
) {
  const [slots, setSlots] = useState<Record<string, DocSlot>>(() =>
    Object.fromEntries(keys.map((k) => [k, emptySlot()])),
  );
  const { pick } = useAssetPicker();

  const runUpload = useCallback(
    async (key: string, uri: string) => {
      setSlots((p) => ({ ...p, [key]: { uri, url: null, state: 'uploading' } }));
      try {
        const res = await uploadFn(applicationId, uri, key);
        setSlots((p) => ({ ...p, [key]: { uri, url: res.url, state: 'uploaded' } }));
      } catch {
        setSlots((p) => ({
          ...p,
          [key]: { uri, url: null, state: 'failed', error: 'Upload failed — tap to retry' },
        }));
      }
    },
    [applicationId, uploadFn],
  );

  /** Pick from camera/library and upload. Also used to replace an existing doc. */
  const capture = useCallback(
    async (key: string, source: AssetSource) => {
      const uri = await pick(source);
      if (uri) await runUpload(key, uri);
    },
    [pick, runUpload],
  );

  /** Re-attempt the upload for the file already captured in a slot. */
  const retry = useCallback(
    (key: string) => {
      const slot = slots[key];
      if (slot?.uri) void runUpload(key, slot.uri);
    },
    [slots, runUpload],
  );

  /** Clear a slot back to empty. */
  const remove = useCallback((key: string) => {
    setSlots((p) => ({ ...p, [key]: emptySlot() }));
  }, []);

  /** True once every listed key has finished uploading. */
  const allUploaded = useCallback(
    (required: readonly string[]) => required.every((k) => slots[k]?.state === 'uploaded'),
    [slots],
  );

  return { slots, capture, retry, remove, allUploaded };
}
