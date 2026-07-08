import { create } from 'zustand';
import { secureStorage } from '@/src/core/storage/storage';
import { SECURE_STORE_KEYS } from '@/src/core/utils/constants';
import type { LoanState, Loan, EMISchedule, ApplicationStatus } from '@/src/entities/loan';

interface LoanActions {
  setActiveLoans: (loans: Loan[]) => void;
  setEMISchedule: (schedule: EMISchedule[]) => void;
  setApplicationStatus: (status: ApplicationStatus | null) => void;
  setGoldLoanNotifyMe: (value: boolean) => Promise<void>;
  loadGoldLoanNotifyMe: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type LoanStore = LoanState & LoanActions;

const initialState: LoanState = {
  activeLoans: [],
  emiSchedule: [],
  applicationStatus: null,
  goldLoanNotifyMe: false,
  isLoading: false,
  error: null,
};

export const useLoanStore = create<LoanStore>((set) => ({
  ...initialState,

  setActiveLoans: (loans) => set({ activeLoans: loans }),
  setEMISchedule: (schedule) => set({ emiSchedule: schedule }),
  setApplicationStatus: (status) => set({ applicationStatus: status }),

  // Persists gold loan notification preference to SecureStore
  setGoldLoanNotifyMe: async (value) => {
    await secureStorage.set(SECURE_STORE_KEYS.GOLD_LOAN_NOTIFY, String(value));
    set({ goldLoanNotifyMe: value });
  },

  // Load persisted gold loan notify preference on app start
  loadGoldLoanNotifyMe: async () => {
    const stored = await secureStorage.get(SECURE_STORE_KEYS.GOLD_LOAN_NOTIFY);
    set({ goldLoanNotifyMe: stored === 'true' });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

import { storeResetters } from './storeResetters';
storeResetters.push(() => useLoanStore.getState().reset());
