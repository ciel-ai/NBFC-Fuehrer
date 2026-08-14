import { appStorage } from '@/src/core/storage/storage';
import { SECURE_STORE_KEYS } from '@/src/core/utils/constants';

// ---------------------------------------------------------------------------
// Customer apply-flow draft / resume.
//
// The customer gold & CDL journeys thread all their state through router
// params (see CLAUDE.md). Killing the app mid-flow loses everything, so on
// every step we snapshot the accumulated param bundle + the current route to
// appStorage. The home screen offers "Resume application" from the latest
// snapshot, re-pushing the exact route with its params restored.
//
// This mirrors the agent-side useSalesDraft, but the customer flow has no
// wizard store — it lives entirely in navigation params — so the snapshot is
// the param bundle itself rather than a flat field map.
// ---------------------------------------------------------------------------

export type ApplyFlow = 'gold' | 'cdl' | 'housing';

export interface CustomerApplyDraft {
  flow: ApplyFlow;
  /** expo-router pathname of the furthest step reached. */
  pathname: string;
  /** The full param bundle threaded through the flow so far. */
  params: Record<string, string>;
  /** Human label for the resume card (product + best-effort amount). */
  label: string;
  updatedAt: number;
}

/** Persisted shape: one draft per in-flight product flow. */
export type ApplyDraftMap = Partial<Record<ApplyFlow, CustomerApplyDraft>>;

const KEY = SECURE_STORE_KEYS.CUSTOMER_APPLY_DRAFTS;

const FLOW_LABELS: Record<ApplyFlow, string> = {
  gold: 'Gold Loan',
  cdl: 'Consumer Durable Loan',
  housing: 'Affordable Housing Loan',
};

// ── Pure helpers (unit-tested without touching storage) ───────────────────

/** Idempotent upsert of one flow's draft into the map. */
export function upsertDraft(
  map: ApplyDraftMap,
  draft: CustomerApplyDraft,
): ApplyDraftMap {
  return { ...map, [draft.flow]: draft };
}

/** The most recently touched draft across all flows, or null when none. */
export function pickLatestDraft(map: ApplyDraftMap): CustomerApplyDraft | null {
  const drafts = Object.values(map).filter(Boolean) as CustomerApplyDraft[];
  if (drafts.length === 0) return null;
  return drafts.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
}

/** Human summary for the resume card, e.g. "Gold Loan · ₹1,50,000". */
export function draftLabel(flow: ApplyFlow, params: Record<string, string>): string {
  const base = FLOW_LABELS[flow];
  // `loanAmount` is the canonical CDL field; the older names stay for the gold
  // flow and for drafts saved before the CDL rename.
  const amount =
    params.approvedAmount ?? params.maxLoan ?? params.loanAmount ?? params.amount;
  const n = amount ? Number(amount) : NaN;
  if (!isNaN(n) && n > 0) {
    return `${base} · ₹${Math.round(n).toLocaleString('en-IN')}`;
  }
  return base;
}

// ── Storage-backed API ─────────────────────────────────────────────────────

export async function readApplyDrafts(): Promise<ApplyDraftMap> {
  const raw = await appStorage.get(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ApplyDraftMap;
  } catch {
    return {};
  }
}

export async function saveApplyDraft(draft: CustomerApplyDraft): Promise<void> {
  const map = await readApplyDrafts();
  await appStorage.set(KEY, JSON.stringify(upsertDraft(map, draft)));
}

export async function removeApplyDraft(flow: ApplyFlow): Promise<void> {
  const map = await readApplyDrafts();
  if (!map[flow]) return;
  const next = { ...map };
  delete next[flow];
  await appStorage.set(KEY, JSON.stringify(next));
}

export async function latestApplyDraft(): Promise<CustomerApplyDraft | null> {
  return pickLatestDraft(await readApplyDrafts());
}

/**
 * Best-effort product-flow inference from the human product name shown on the
 * shared success screen (which doesn't carry a flow key). Returns null when it
 * can't be classified so callers can skip clearing rather than clear the wrong
 * flow.
 */
export function flowFromProductName(name?: string): ApplyFlow | null {
  const n = (name ?? '').toLowerCase();
  if (n.includes('gold')) return 'gold';
  if (n.includes('housing') || n.includes('home')) return 'housing';
  if (n.includes('consumer') || n.includes('durable') || n.includes('cdl')) return 'cdl';
  return null;
}
