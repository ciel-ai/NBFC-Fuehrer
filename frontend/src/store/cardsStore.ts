import { create } from 'zustand';
import { storeResetters } from './storeResetters';

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'card';

/**
 * A saved card. For security we NEVER persist the full PAN or CVV — only the
 * last four digits, holder, expiry and detected network are kept (in memory).
 */
export interface SavedCard {
  id: string;
  holder: string;
  last4: string;
  expiry: string; // MM/YY
  network: CardNetwork;
}

interface CardsState {
  cards: SavedCard[];
  addCard: (card: Omit<SavedCard, 'id'>) => void;
  removeCard: (id: string) => void;
  clearCards: () => void;
}

const SEED: SavedCard[] = [
  { id: 'c_seed1', holder: 'Vishwa Kumar', last4: '4321', expiry: '08/27', network: 'visa' },
];

export const useCardsStore = create<CardsState>((set) => ({
  cards: SEED,
  addCard: (card) =>
    set((s) => ({ cards: [...s.cards, { ...card, id: `c_${Date.now()}` }] })),
  removeCard: (id) =>
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
  clearCards: () => set({ cards: [] }),
}));

storeResetters.push(() => useCardsStore.getState().clearCards());
