import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { appStorage, secureStorage } from '../core/storage/storage';
import { SECURE_STORE_KEYS } from '../core/utils/constants';
import type {
  SalesAgent,
  SalesDraft,
  SalesProduct,
} from '../entities/salesAgent';

// ---------------------------------------------------------------------------
// Storage routing (mirrors userStore's PII / non-PII split)
//
//   Agent profile + active product  → secureStorage  (PII: name, employee id)
//   Draft envelopes (resume map)     → appStorage     (per the build spec —
//                                       drafts can exceed SecureStore's per-value
//                                       limit and are keyed by a routing id)
// ---------------------------------------------------------------------------

const SECURE_KEYS = {
  AGENT: SECURE_STORE_KEYS.SALES_AGENT,
  PRODUCT: SECURE_STORE_KEYS.SALES_PRODUCT,
} as const;

const APP_KEYS = {
  DRAFTS: SECURE_STORE_KEYS.SALES_DRAFTS,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesState {
  agent: SalesAgent | null;
  product: SalesProduct | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  /** Resume map, keyed by draft id. */
  drafts: Record<string, SalesDraft>;
  /** The draft currently being edited in the wizard (if any). */
  activeDraftId: string | null;
}

interface SalesActions {
  bootstrap: () => Promise<void>;
  setSession: (agent: SalesAgent) => Promise<void>;
  clearSession: () => Promise<void>;
  /** Create a fresh draft for a product and make it active. Returns its id. */
  startDraft: (product: SalesProduct) => string;
  setActiveDraft: (id: string | null) => void;
  /** Idempotent upsert — used by the debounced auto-save. */
  saveDraft: (draft: SalesDraft) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  getDraft: (id: string) => SalesDraft | undefined;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

async function persistDrafts(drafts: Record<string, SalesDraft>): Promise<void> {
  await appStorage.set(APP_KEYS.DRAFTS, JSON.stringify(drafts));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSalesStore = create<SalesState & SalesActions>((set, get) => ({
  agent: null,
  product: null,
  isAuthenticated: false,
  isHydrated: false,
  drafts: {},
  activeDraftId: null,

  bootstrap: async () => {
    try {
      const [agentStr, productStr, draftsStr] = await Promise.all([
        secureStorage.get(SECURE_KEYS.AGENT),
        secureStorage.get(SECURE_KEYS.PRODUCT),
        appStorage.get(APP_KEYS.DRAFTS),
      ]);

      const agent = agentStr ? (JSON.parse(agentStr) as SalesAgent) : null;
      const drafts = draftsStr
        ? (JSON.parse(draftsStr) as Record<string, SalesDraft>)
        : {};

      set({
        agent,
        product: (productStr as SalesProduct | null) ?? agent?.product ?? null,
        isAuthenticated: !!agent,
        drafts,
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setSession: async (agent) => {
    await Promise.all([
      secureStorage.set(SECURE_KEYS.AGENT, JSON.stringify(agent)),
      secureStorage.set(SECURE_KEYS.PRODUCT, agent.product),
    ]);
    set({ agent, product: agent.product, isAuthenticated: true });
  },

  clearSession: async () => {
    await Promise.all([
      secureStorage.remove(SECURE_KEYS.AGENT),
      secureStorage.remove(SECURE_KEYS.PRODUCT),
    ]);
    // Drafts are intentionally retained across logout so an agent who signs
    // back in can resume in-flight work. They are cleared only on full
    // resetAllStores() (true logout) below.
    set({ agent: null, product: null, isAuthenticated: false, activeDraftId: null });
  },

  startDraft: (product) => {
    const id = `draft_${Crypto.randomUUID()}`;
    const now = Date.now();
    const draft: SalesDraft = {
      id,
      product,
      stepIndex: 0,
      data: {},
      label: 'Untitled application',
      createdAt: now,
      updatedAt: now,
    };
    const drafts = { ...get().drafts, [id]: draft };
    set({ drafts, activeDraftId: id });
    void persistDrafts(drafts);
    return id;
  },

  setActiveDraft: (id) => set({ activeDraftId: id }),

  saveDraft: async (draft) => {
    const next: SalesDraft = { ...draft, updatedAt: Date.now() };
    const drafts = { ...get().drafts, [next.id]: next };
    set({ drafts });
    await persistDrafts(drafts);
  },

  deleteDraft: async (id) => {
    const drafts = { ...get().drafts };
    delete drafts[id];
    set((s) => ({
      drafts,
      activeDraftId: s.activeDraftId === id ? null : s.activeDraftId,
    }));
    await persistDrafts(drafts);
  },

  getDraft: (id) => get().drafts[id],
}));

// ---------------------------------------------------------------------------
// Full-logout reset — clears the session AND wipes the persisted draft map.
// Registered alongside userStore / loanStore in storeResetters.
// ---------------------------------------------------------------------------
import { storeResetters } from './storeResetters';
storeResetters.push(async () => {
  await Promise.all([
    secureStorage.remove(SECURE_KEYS.AGENT),
    secureStorage.remove(SECURE_KEYS.PRODUCT),
    appStorage.remove(APP_KEYS.DRAFTS),
    appStorage.remove(SECURE_STORE_KEYS.SALES_OFFLINE_QUEUE),
  ]);
  useSalesStore.setState({
    agent: null,
    product: null,
    isAuthenticated: false,
    drafts: {},
    activeDraftId: null,
  });
});
