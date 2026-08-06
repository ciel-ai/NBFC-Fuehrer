import { USE_MOCK } from './constants';

export const MOCK_GOLD_APPLICATION_ID = 'gold_mock_application';

/**
 * Resolve the gold application id from route params. The mock placeholder is
 * only ever substituted in mock mode — in live mode a missing id is an error
 * the screen must surface, never something to paper over with a fake id that
 * would reach the real API.
 */
export function resolveGoldApplicationId(raw: string | string[] | undefined): string | null {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return USE_MOCK ? MOCK_GOLD_APPLICATION_ID : null;
}
