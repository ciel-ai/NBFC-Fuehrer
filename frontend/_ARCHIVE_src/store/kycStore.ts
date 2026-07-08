import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { appStorage } from '@/src/core/storage/storage';
import { 
  KycStep, 
  KycStatus, 
  KycCapabilities, 
  KycIntentDestination,
  KycFailureState 
} from '@/src/entities/kyc';

const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await appStorage.get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await appStorage.set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await appStorage.remove(name);
  },
};

interface KycEngineState {
  status: KycStatus;
  currentStep: KycStep;
  capabilities: KycCapabilities;
  intentDestination: KycIntentDestination | null;
  failure: KycFailureState | null;
}

interface KycStore extends KycEngineState {
  isHydrated: boolean;
  bootstrap: () => Promise<void>;
  setEngineState: (state: Partial<KycEngineState>) => void;
  saveIntentDestination: (dest: KycIntentDestination) => void;
  consumeIntentDestination: () => KycIntentDestination | null;
  clearIntent: () => void;
  reset: () => void;
}

const defaultState: KycEngineState = {
  status: KycStatus.NOT_STARTED,
  currentStep: KycStep.PERMISSIONS,
  capabilities: { canCheckout: false, canApplyLoan: false, canActivateCard: false },
  intentDestination: null,
  failure: null,
};

export const useKycStore = create<KycStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      isHydrated: false,

      bootstrap: async () => {
        // Wait until `onRehydrateStorage` marks this as hydrated.
        // We use a small loop check to wait for persist to finish.
        if (get().isHydrated) return;
        return new Promise((resolve) => {
          let unsubscribe: () => void = () => {};
          const timeout = setTimeout(() => {
            unsubscribe();
            useKycStore.setState({ isHydrated: true });
            resolve();
          }, 2500);

          unsubscribe = useKycStore.subscribe((state) => {
            if (state.isHydrated) {
              clearTimeout(timeout);
              unsubscribe();
              resolve();
            }
          });
        });
      },

      setEngineState: (newState) => set((state) => ({ ...state, ...newState })),

      saveIntentDestination: (dest) => set({ intentDestination: dest }),

      consumeIntentDestination: () => {
        const current = get().intentDestination;
        set({ intentDestination: null });
        return current;
      },

      clearIntent: () => set({ intentDestination: null }),

      reset: () => set({ ...defaultState }),
    }),
    {
      name: 'nbfc_kyc_orchestrator',
      storage: createJSONStorage(() => zustandStorage),
      // ONLY persist the required core fields.
      // E.g., don't persist any sensitive ephemeral payload if it accidentally gets in.
      partialize: (state) => ({
        status: state.status,
        currentStep: state.currentStep,
        capabilities: state.capabilities,
        intentDestination: state.intentDestination,
        // we can also persist failure state if we want recovery to know why it failed
        failure: state.failure,
      }),
      onRehydrateStorage: () => (state) => {
        // If the app was killed mid-KYC, reset the flow on cold start.
        // The user must re-enter KYC via an intent (checkout/apply).
        // Only COMPLETED status survives across sessions.
        const wasInterrupted = state?.status === KycStatus.IN_PROGRESS;
        useKycStore.setState({
          isHydrated: true,
          ...(wasInterrupted ? {
            status: KycStatus.NOT_STARTED,
            currentStep: KycStep.PERMISSIONS,
          } : {}),
          // Always clear stale intent so checkout/repayment screens
          // don't appear on cold start.
          intentDestination: null,
        });
      },
    }
  )
);

import { storeResetters } from './storeResetters';
storeResetters.push(() => useKycStore.getState().reset());
