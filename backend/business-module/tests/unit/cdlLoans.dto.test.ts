// tests/unit/cdlLoans.dto.test.ts
//
// Coverage for Step E: every CDL endpoint previously trusted whatever the
// app sent it — no check that loanAmount was a number, productCategory
// was a real category, etc. These tests exercise the Joi schemas
// directly (schema.validate()), same as how the middleware itself uses
// them, without needing Express request/response plumbing.

import {
    cdlSubmitApplicationSchema,
    cdlCreditAssessmentSchema,
    cdlCreditDecisionSchema,
    cdlNachSchema,
    cdlDisburseSchema,
    cdlManualPaymentSchema,
    cdlPaymentFailureSchema,
    cdlIdParamSchema,
} from '@/modules/cdlLoans/cdlLoans.dto';
import {
    CDL_MIN_LOAN_AMOUNT,
    CDL_MAX_LOAN_AMOUNT,
} from '@/modules/cdlLoans/cdlLoans.service';

// Matches validate.middleware.ts's DEFAULT_OPTIONS, since that's what
// actually runs in the request pipeline — abortEarly:false so every test
// asserting rejection also confirms an .error exists, convert:true so
// tests like the IFSC-uppercase one reflect real request behavior.
const OPTS = { abortEarly: false, stripUnknown: true, convert: true };

const validApplication = {
    productCategory: 'MOBILES_TABLETS',
    productName: 'Smartphone XYZ',
    productPrice: 30000,
    downPayment: 5000,
    loanAmount: 25000,
    tenureMonths: 12,
    storeName: 'Mobile World',
    storeCity: 'Bengaluru',
    employmentType: 'SALARIED',
    monthlyIncome: 60000,
};

describe('cdlSubmitApplicationSchema', () => {
    test('accepts a valid application', () => {
        const { error } = cdlSubmitApplicationSchema.validate(validApplication, OPTS);
        expect(error).toBeUndefined();
    });

    test('rejects a non-numeric loanAmount', () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, loanAmount: 'not-a-number' }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test('rejects a productCategory that is not a real category', () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, productCategory: 'SPACESHIP' }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test(`rejects loanAmount below the CDL minimum (₹${CDL_MIN_LOAN_AMOUNT})`, () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, loanAmount: CDL_MIN_LOAN_AMOUNT - 1 }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test(`rejects loanAmount above the CDL maximum (₹${CDL_MAX_LOAN_AMOUNT})`, () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, loanAmount: CDL_MAX_LOAN_AMOUNT + 1 }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test('rejects an autoDebitDate that is not one of the three allowed dates', () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, autoDebitDate: 15 }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test('accepts a valid autoDebitDate', () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, autoDebitDate: 7 }, OPTS,
        );
        expect(error).toBeUndefined();
    });

    test('rejects a request missing required fields', () => {
        const { error } = cdlSubmitApplicationSchema.validate({ productName: 'X' }, OPTS);
        expect(error).toBeDefined();
        expect(error?.details.length).toBeGreaterThan(1); // abortEarly:false — collects all
    });

    test('strips unknown fields rather than rejecting the whole request', () => {
        const { error, value } = cdlSubmitApplicationSchema.validate(
            { ...validApplication, unexpectedField: 'should be stripped' }, OPTS,
        );
        expect(error).toBeUndefined();
        expect(value.unexpectedField).toBeUndefined();
    });
});

describe('cdlCreditAssessmentSchema', () => {
    const valid = { cibilScore: 780, monthlyIncome: 60000, existingEmis: 5000, proposedEmi: 2233 };

    test('accepts a valid assessment', () => {
        expect(cdlCreditAssessmentSchema.validate(valid, OPTS).error).toBeUndefined();
    });

    test('rejects a cibilScore outside the real 300-900 range', () => {
        const { error } = cdlCreditAssessmentSchema.validate({ ...valid, cibilScore: 1200 }, OPTS);
        expect(error).toBeDefined();
    });

    test('rejects a negative proposedEmi', () => {
        const { error } = cdlCreditAssessmentSchema.validate({ ...valid, proposedEmi: -100 }, OPTS);
        expect(error).toBeDefined();
    });
});

describe('cdlCreditDecisionSchema', () => {
    test('accepts just the two fields the service actually reads', () => {
        const { error } = cdlCreditDecisionSchema.validate(
            { creditStatus: 'PASS', maxLoanAmount: 25000 }, OPTS,
        );
        expect(error).toBeUndefined();
    });

    test('also accepts the full echoed assessment object (existing client behavior)', () => {
        const { error } = cdlCreditDecisionSchema.validate({
            applicationId: '11111111-1111-4111-8111-111111111111',
            cibilScore: 780, foir: 12.1, foirStatus: 'PASS',
            creditStatus: 'PASS', maxLoanAmount: 1134431,
            note: 'CIBIL 780, FOIR 12.1% — PASS.',
        }, OPTS);
        expect(error).toBeUndefined();
    });

    test('rejects a creditStatus that is not PASS/FAIL/REVIEW', () => {
        const { error } = cdlCreditDecisionSchema.validate(
            { creditStatus: 'MAYBE', maxLoanAmount: 25000 }, OPTS,
        );
        expect(error).toBeDefined();
    });

    test('rejects a missing maxLoanAmount', () => {
        const { error } = cdlCreditDecisionSchema.validate({ creditStatus: 'PASS' }, OPTS);
        expect(error).toBeDefined();
    });
});

describe('cdlNachSchema', () => {
    test('accepts a valid mandate request and uppercases a lowercase IFSC', () => {
        const { error, value } = cdlNachSchema.validate(
            { bankAccount: '123456789012', ifsc: 'hdfc0001234' }, OPTS,
        );
        expect(error).toBeUndefined();
        expect(value.ifsc).toBe('HDFC0001234');
    });

    test('rejects a bank account number that is too short', () => {
        const { error } = cdlNachSchema.validate({ bankAccount: '123', ifsc: 'HDFC0001234' }, OPTS);
        expect(error).toBeDefined();
    });

    test('rejects an IFSC that is not 11 characters', () => {
        const { error } = cdlNachSchema.validate({ bankAccount: '123456789012', ifsc: 'HDFC123' }, OPTS);
        expect(error).toBeDefined();
    });
});

describe('cdlDisburseSchema', () => {
    test('accepts a valid disbursement request', () => {
        const { error } = cdlDisburseSchema.validate({ merchantName: 'Mobile World', amount: 24500 }, OPTS);
        expect(error).toBeUndefined();
    });

    test('rejects a zero or negative amount', () => {
        const { error } = cdlDisburseSchema.validate({ merchantName: 'Mobile World', amount: 0 }, OPTS);
        expect(error).toBeDefined();
    });

    test('does not accept initiatedBy from the client (stripped, not a real field on this schema)', () => {
        const { value } = cdlDisburseSchema.validate(
            { merchantName: 'Mobile World', amount: 24500, initiatedBy: 'someone-else' }, OPTS,
        );
        expect(value.initiatedBy).toBeUndefined();
    });
});

describe('cdlManualPaymentSchema', () => {
    const emiId = '11111111-1111-4111-8111-111111111111';

    test('accepts a valid payment', () => {
        const { error } = cdlManualPaymentSchema.validate({ emiId, amount: 2233 }, OPTS);
        expect(error).toBeUndefined();
    });

    test('rejects an emiId that is not a valid UUID', () => {
        const { error } = cdlManualPaymentSchema.validate({ emiId: 'not-a-uuid', amount: 2233 }, OPTS);
        expect(error).toBeDefined();
    });

    test('collectionId is optional', () => {
        const { error } = cdlManualPaymentSchema.validate({ emiId, amount: 2233, collectionId: 'ref-1' }, OPTS);
        expect(error).toBeUndefined();
    });
});

describe('cdlPaymentFailureSchema', () => {
    test('requires a valid emiId', () => {
        expect(cdlPaymentFailureSchema.validate({}, OPTS).error).toBeDefined();
        expect(
            cdlPaymentFailureSchema.validate(
                { emiId: '11111111-1111-4111-8111-111111111111' }, OPTS,
            ).error,
        ).toBeUndefined();
    });
});

describe('cdlIdParamSchema', () => {
    test('accepts a valid UUID', () => {
        const { error } = cdlIdParamSchema.validate({ id: '11111111-1111-4111-8111-111111111111' }, OPTS);
        expect(error).toBeUndefined();
    });

    test('rejects a malformed id — this used to reach the service/DB layer unvalidated', () => {
        const { error } = cdlIdParamSchema.validate({ id: 'not-a-uuid' }, OPTS);
        expect(error).toBeDefined();
    });
});
