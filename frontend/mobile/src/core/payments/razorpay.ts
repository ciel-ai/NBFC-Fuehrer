import { mockDelay } from '@/src/core/api/api';
import { USE_MOCK, RAZORPAY_KEY_ID } from '@/src/core/utils/constants';

// ---------------------------------------------------------------------------
// Razorpay checkout abstraction
//
// This module is the single integration point for the Razorpay payment sheet.
// It is intentionally written so the app keeps bundling and running BEFORE the
// SDK or live keys exist:
//
//   • USE_MOCK builds        → the checkout is simulated (returns a fake
//                              payment id) so the demo repayment flow works
//                              end-to-end without a gateway.
//   • Production, no key      → throws RAZORPAY_NOT_CONFIGURED (the pay screen
//                              routes to the failure screen — never a false
//                              success).
//   • Production, key present → throws RAZORPAY_SDK_NOT_INSTALLED until the
//                              real SDK call is activated (see step 3 below).
//
// The uninstalled `react-native-razorpay` package is NOT imported anywhere yet,
// so `expo export` / Metro resolution stays green.
// ---------------------------------------------------------------------------

export interface RazorpayCheckoutOptions {
  /** EMI amount in rupees. Converted to paise for the gateway. */
  amount: number;
  description: string;
  /** Razorpay order_id created by the backend. Required in production. */
  orderId?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
}

export interface RazorpayCheckoutResult {
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  /** HMAC signature returned by the gateway — the backend must verify it. */
  razorpaySignature?: string;
}

export type RazorpayErrorCode =
  | 'RAZORPAY_CANCELLED'
  | 'RAZORPAY_NOT_CONFIGURED'
  | 'RAZORPAY_SDK_NOT_INSTALLED'
  | 'RAZORPAY_FAILED';

export class RazorpayError extends Error {
  code: RazorpayErrorCode;
  constructor(code: RazorpayErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'RazorpayError';
    this.code = code;
  }
}

/** True once a publishable key is configured via EXPO_PUBLIC_RAZORPAY_KEY_ID. */
export function isRazorpayConfigured(): boolean {
  return RAZORPAY_KEY_ID.length > 0;
}

/**
 * Opens the Razorpay checkout sheet and resolves with the payment reference on
 * a successful capture. Rejects with a {@link RazorpayError} on cancel/failure.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpayCheckoutResult> {
  // 1) Demo / development — simulate a capture. Allowed ONLY under USE_MOCK so
  //    production can never fabricate a payment.
  if (USE_MOCK) {
    await mockDelay(null, 1200);
    return {
      razorpayPaymentId: `pay_mock_${Date.now()}`,
      razorpayOrderId: options.orderId,
    };
  }

  // 2) Production requires a configured publishable key.
  if (!isRazorpayConfigured()) {
    throw new RazorpayError(
      'RAZORPAY_NOT_CONFIGURED',
      'Razorpay key (EXPO_PUBLIC_RAZORPAY_KEY_ID) is not set.',
    );
  }

  // 3) ── ACTIVATION STEP — do this once the client provides Razorpay keys ────
  //
  //    a. Install the SDK:   npx expo install react-native-razorpay
  //    b. Add any config the SDK docs require to app.json → plugins.
  //    c. Ensure the backend exposes a "create order" endpoint and pass its
  //       order_id in as options.orderId (Razorpay requires an order_id for
  //       server-verified captures).
  //    d. Replace the throw below with:
  //
  //       const RazorpayCheckout = require('react-native-razorpay').default;
  //       try {
  //         const data = await RazorpayCheckout.open({
  //           key: RAZORPAY_KEY_ID,
  //           order_id: options.orderId,
  //           amount: Math.round(options.amount * 100), // paise
  //           currency: 'INR',
  //           name: 'Fuehrer NBFC',
  //           description: options.description,
  //           prefill: options.prefill,
  //           notes: options.notes,
  //           theme: { color: '#0B1F3A' },
  //         });
  //         return {
  //           razorpayPaymentId: data.razorpay_payment_id,
  //           razorpayOrderId: data.razorpay_order_id,
  //           razorpaySignature: data.razorpay_signature,
  //         };
  //       } catch (e: any) {
  //         // SDK rejects with { code, description }. code 0/2 = user cancelled.
  //         const cancelled = e?.code === 0 || e?.code === 2;
  //         throw new RazorpayError(
  //           cancelled ? 'RAZORPAY_CANCELLED' : 'RAZORPAY_FAILED',
  //           e?.description,
  //         );
  //       }
  //
  //    Then forward razorpayPaymentId + razorpaySignature to the backend verify
  //    call (processManualPayment) so the EMI is only marked paid after the
  //    signature is validated server-side.
  // ───────────────────────────────────────────────────────────────────────────
  throw new RazorpayError(
    'RAZORPAY_SDK_NOT_INSTALLED',
    'Razorpay SDK is not installed. See src/core/payments/razorpay.ts step 3.',
  );
}
