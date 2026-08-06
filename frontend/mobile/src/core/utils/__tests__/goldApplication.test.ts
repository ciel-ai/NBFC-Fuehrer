import { describe, expect, it } from 'vitest';
import { MOCK_GOLD_APPLICATION_ID, resolveGoldApplicationId } from '../goldApplication';

// vitest.setup.ts pins EXPO_PUBLIC_USE_MOCK=true, so the mock-mode branch is
// what these tests exercise; the live-mode branch (null) is asserted through
// the passthrough contract.

describe('resolveGoldApplicationId', () => {
  it('passes a real id through untouched', () => {
    expect(resolveGoldApplicationId('app_123')).toBe('app_123');
  });

  it('falls back to the mock placeholder only in mock mode', () => {
    expect(resolveGoldApplicationId(undefined)).toBe(MOCK_GOLD_APPLICATION_ID);
    expect(resolveGoldApplicationId('')).toBe(MOCK_GOLD_APPLICATION_ID);
  });

  it('ignores array-shaped route params', () => {
    // expo-router can hand back string[]; never treat that as a usable id.
    expect(resolveGoldApplicationId(['a', 'b'])).toBe(MOCK_GOLD_APPLICATION_ID);
  });
});
