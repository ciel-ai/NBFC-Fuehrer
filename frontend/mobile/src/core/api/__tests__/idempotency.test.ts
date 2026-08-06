import { describe, it, expect, vi, beforeEach } from 'vitest';

// Money-movement services import the axios instance; stub it so we can assert
// exactly what config (and therefore what header) each call sends. `vi.hoisted`
// lets the mock factory (hoisted above imports) reference the same spy.
const { post } = vi.hoisted(() => ({ post: vi.fn(async (..._args: unknown[]) => ({ data: { ok: true } })) }));
vi.mock('@/src/core/api/api', () => ({ default: { post, get: vi.fn() } }));

// expo-crypto's randomUUID is native; stub with a counter so keys are distinct.
let n = 0;
vi.mock('expo-crypto', () => ({ randomUUID: () => `uuid-${++n}` }));

import { idempotentConfig, newIdempotencyKey } from '@/src/core/api/idempotency';
import { realPaymentService } from '@/src/core/services/real/realPaymentService';
import { realGoldLoanService } from '@/src/core/services/real/realGoldLoanService';
import { realConsumerDurableLoanService } from '@/src/core/services/real/realConsumerDurableLoanService';
import { realHousingLoanService } from '@/src/core/services/real/realHousingLoanService';

const HEADER = 'Idempotency-Key';
const configOf = (callIndex = 0) => post.mock.calls[callIndex]?.[2];

describe('idempotentConfig', () => {
  it('carries the Idempotency-Key header when a key is supplied', () => {
    expect(idempotentConfig('abc')).toEqual({ headers: { [HEADER]: 'abc' } });
  });

  it('returns undefined without a key so non-idempotent calls are unchanged', () => {
    expect(idempotentConfig()).toBeUndefined();
    expect(idempotentConfig(undefined)).toBeUndefined();
    expect(idempotentConfig('')).toBeUndefined();
  });
});

describe('newIdempotencyKey', () => {
  it('mints a fresh key each call', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe('money-movement real services attach the Idempotency-Key', () => {
  beforeEach(() => post.mockClear());

  it('payment: processEMIPayment (/payments/process)', async () => {
    await realPaymentService.processEMIPayment('L1', 500, 'upi', 'key-1');
    expect(post.mock.calls[0][0]).toBe('/payments/process');
    expect(configOf()).toEqual({ headers: { [HEADER]: 'key-1' } });
  });

  it('payment: initiateNACH (/payments/nach)', async () => {
    await realPaymentService.initiateNACH('L1', {} as never, 'key-2');
    expect(configOf()).toEqual({ headers: { [HEADER]: 'key-2' } });
  });

  it('gold: initiateNach', async () => {
    await realGoldLoanService.initiateNach('app-1', 'key-3');
    expect(configOf()).toEqual({ headers: { [HEADER]: 'key-3' } });
  });

  it('cdl: registerNachMandate + disburseToMerchant + processManualPayment', async () => {
    await realConsumerDurableLoanService.registerNachMandate('a', { emi: 1, bankAccount: 'x' }, 'k-nach');
    await realConsumerDurableLoanService.disburseToMerchant('a', { amount: 1, merchantName: 'm' }, 'k-disb');
    await realConsumerDurableLoanService.processManualPayment('L1', 'e1', 'k-pay');
    expect(configOf(0)).toEqual({ headers: { [HEADER]: 'k-nach' } });
    expect(configOf(1)).toEqual({ headers: { [HEADER]: 'k-disb' } });
    expect(configOf(2)).toEqual({ headers: { [HEADER]: 'k-pay' } });
  });

  it('housing: registerNach + disburseToBuilder + applyPmaySubsidy', async () => {
    await realHousingLoanService.registerNach('a', { emi: 1, bankAccount: 'x' }, 'h-nach');
    await realHousingLoanService.disburseToBuilder('a', { amount: 1, builderName: 'b' }, 'h-disb');
    await realHousingLoanService.applyPmaySubsidy('a', { loanAmount: 1 }, 'h-pmay');
    expect(configOf(0)).toEqual({ headers: { [HEADER]: 'h-nach' } });
    expect(configOf(1)).toEqual({ headers: { [HEADER]: 'h-disb' } });
    expect(configOf(2)).toEqual({ headers: { [HEADER]: 'h-pmay' } });
  });

  it('omits the header (undefined config) when no key is passed — safe for retries wiring', async () => {
    await realPaymentService.processEMIPayment('L1', 500, 'upi');
    expect(configOf()).toBeUndefined();
  });
});
