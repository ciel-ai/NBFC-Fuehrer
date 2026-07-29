// tests/unit/webhooks.signatureVerification.test.ts
//
// Regression coverage for webhook signature verification — flagged in the
// audit as untested despite gating whether a payment/disbursement/eSign/KYC
// callback is trusted at all. A broken or bypassable check here lets an
// attacker fabricate "payment captured" or "loan disbursed" events.

import crypto from 'crypto';
import {
    verifyRazorpaySignature,
    verifySignzySignature,
    verifyESignSignature,
} from '@/modules/webhooks/webhooks.service';

function hmac(secret: string, data: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('verifyRazorpaySignature', () => {
    const secret = 'test-razorpay-secret';
    const rawBody = JSON.stringify({ event: 'payment.captured', amount: 10000 });

    test('accepts a correctly-signed payload', () => {
        const validSignature = hmac(secret, rawBody);
        expect(verifyRazorpaySignature(rawBody, validSignature, secret)).toBe(true);
    });

    test('rejects a forged signature', () => {
        const forgedSignature = hmac('wrong-secret', rawBody);
        expect(verifyRazorpaySignature(rawBody, forgedSignature, secret)).toBe(false);
    });

    test('rejects a tampered body with an otherwise-valid-looking signature', () => {
        const validSignature = hmac(secret, rawBody);
        const tamperedBody = JSON.stringify({ event: 'payment.captured', amount: 99999999 });
        expect(verifyRazorpaySignature(tamperedBody, validSignature, secret)).toBe(false);
    });

    test('rejects an empty signature', () => {
        expect(verifyRazorpaySignature(rawBody, '', secret)).toBe(false);
    });

    test('rejects a non-hex signature without throwing', () => {
        expect(() => verifyRazorpaySignature(rawBody, 'not-valid-hex-!!!', secret)).not.toThrow();
        expect(verifyRazorpaySignature(rawBody, 'not-valid-hex-!!!', secret)).toBe(false);
    });
});

describe('verifySignzySignature', () => {
    const secret = 'test-signzy-key';
    const basePayload = {
        requestId: 'req-123',
        checkType: 'PAN_VERIFY',
        status: 'COMPLETED',
        data: { verified: true },
        timestamp: 1785312000,
    };

    test('accepts a correctly-signed callback', () => {
        const data = `${basePayload.requestId}${basePayload.checkType}${basePayload.status}${basePayload.timestamp}`;
        const signature = hmac(secret, data);
        expect(verifySignzySignature({ ...basePayload, signature }, secret)).toBe(true);
    });

    test('rejects a callback with a status flipped after signing (e.g. FAILED -> COMPLETED)', () => {
        const originalData = `${basePayload.requestId}${basePayload.checkType}FAILED${basePayload.timestamp}`;
        const signature = hmac(secret, originalData);
        // Attacker changes status to COMPLETED but reuses the old signature
        expect(verifySignzySignature({ ...basePayload, status: 'COMPLETED', signature }, secret)).toBe(false);
    });
});

describe('verifyESignSignature', () => {
    const secret = 'test-esign-key';
    const basePayload = {
        requestId: 'esign-456',
        status: 'SIGNED',
        timestamp: 1785312000,
    };

    test('accepts a correctly-signed callback', () => {
        const data = `${basePayload.requestId}${basePayload.status}${basePayload.timestamp}`;
        const signature = hmac(secret, data);
        expect(verifyESignSignature({ ...basePayload, signature }, secret)).toBe(true);
    });

    test('rejects a replayed callback for a different requestId', () => {
        const data = `${basePayload.requestId}${basePayload.status}${basePayload.timestamp}`;
        const signature = hmac(secret, data);
        expect(verifyESignSignature({ ...basePayload, requestId: 'different-request', signature }, secret)).toBe(false);
    });
});