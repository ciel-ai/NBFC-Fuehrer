// tests/unit/cdlLoans.contract.test.ts
//
// The CDL request contract, pinned.
//
// Joi runs with stripUnknown:true, which makes a renamed field invisible: it is
// deleted before the controller sees it, so a mismatch shows up as a missing
// value deep in the service, or as data that silently never persists — never as
// an error naming the field. That is exactly how the app and the API drifted
// into speaking different languages:
//
//   app sent          API required        result
//   ────────────────  ──────────────────  ─────────────────────────────────────
//   amount            loanAmount          stripped; loanAmount reported missing
//   tenure            tenureMonths        stripped; tenureMonths missing
//   emi               (not accepted)      stripped
//   (never sent)      productCategory     missing → 400
//   (never sent)      productValue        missing → 400
//   (never sent)      downPayment         missing → 400
//   (never sent)      storeName/storeCity missing → 400
//   existingObligations existingEmis      stripped; existingEmis missing
//   "****1234"        bankAccount         8 chars → below min(9)
//   (never sent)      ifsc                missing → 400
//
// Each test below states a field name the mobile client sends and asserts the
// schema keeps it. The fixtures are the exact payloads
// frontend/mobile/src/core/services/real/realConsumerDurableLoanService.ts
// builds, so if either side is renamed without the other, one of these fails.

import {
    cdlQuoteSchema,
    cdlSubmitApplicationSchema,
    cdlCreditAssessmentSchema,
    cdlCreditDecisionSchema,
    cdlNachSchema,
    cdlManualPaymentSchema,
    cdlPartPaymentSchema,
    cdlDisburseSchema,
} from '@/modules/cdlLoans/cdlLoans.dto';

// Matches validate.middleware.ts's DEFAULT_OPTIONS exactly — testing with
// different options would test a validation that never runs in production.
const OPTS = { abortEarly: false, stripUnknown: true, convert: true };

/**
 * The payload the app sends to POST /consumer-durable-loans/applications.
 *
 * No productCategory: the customer flow uses manual product entry, so there is
 * no catalogue to derive one from. No emi and no processingFee either — the
 * backend calculates both.
 */
const application = {
    productName: 'Samsung 55 inch Smart TV',
    productValue: 65000,
    downPayment: 10000,
    loanAmount: 55000,
    tenureMonths: 12,
    storeName: 'Croma, Andheri West',
    storeCity: 'Mumbai',
    employmentType: 'SALARIED',
    monthlyIncome: 50000,
    interestRate: 14,
    preferredDebitDay: 7,
};

const creditInput = {
    monthlyIncome: 85000,
    existingEmis: 4000,
    proposedEmi: 6250,
};

describe('CDL application contract', () => {
    test('accepts the exact payload the mobile client sends', () => {
        const { error } = cdlSubmitApplicationSchema.validate(application, OPTS);
        expect(error).toBeUndefined();
    });

    test('keeps every canonical field — none is silently stripped', () => {
        const { value } = cdlSubmitApplicationSchema.validate(application, OPTS);
        // productCategory is the one addition: it defaults to OTHERS.
        expect(Object.keys(value).sort()).toEqual(
            [...Object.keys(application), 'productCategory'].sort(),
        );
        expect(value.productCategory).toBe('OTHERS');
    });

    test.each([
        'productName',
        'productValue',
        'loanAmount',
        'tenureMonths',
        'storeName',
        'storeCity',
        'employmentType',
        'monthlyIncome',
    ])('%s is required — omitting it is an error, not a silent default', (field) => {
        const { [field as keyof typeof application]: _omitted, ...rest } = application;
        const { error } = cdlSubmitApplicationSchema.validate(rest, OPTS);
        expect(error?.details.some((d) => d.path.includes(field))).toBe(true);
    });

    test.each([
        ['amount', 'loanAmount'],
        ['tenure', 'tenureMonths'],
        ['productPrice', 'productValue'],
        ['interestRatePct', 'interestRate'],
        ['autoDebitDate', 'preferredDebitDay'],
    ])('the retired name %s is rejected in favour of %s', (oldName, canonical) => {
        const { [canonical as keyof typeof application]: v, ...rest } = application;
        const { error, value } = cdlSubmitApplicationSchema.validate(
            { ...rest, [oldName]: v },
            OPTS,
        );
        // Either the canonical field is now missing (required ones) or the old
        // name was stripped (optional ones). Both prove the old name is dead.
        const stillPresent = Object.prototype.hasOwnProperty.call(value ?? {}, oldName);
        expect(stillPresent).toBe(false);
        if (['loanAmount', 'tenureMonths', 'productValue'].includes(canonical)) {
            expect(error?.details.some((d) => d.path.includes(canonical))).toBe(true);
        }
    });

    test('employment type is the uppercase enum, not the UI lowercase form', () => {
        expect(cdlSubmitApplicationSchema.validate(application, OPTS).error).toBeUndefined();
        expect(
            cdlSubmitApplicationSchema.validate(
                { ...application, employmentType: 'salaried' },
                OPTS,
            ).error,
        ).toBeDefined();
    });

    test('interestRate and preferredDebitDay are optional', () => {
        const { interestRate: _r, preferredDebitDay: _d, ...rest } = application;
        expect(cdlSubmitApplicationSchema.validate(rest, OPTS).error).toBeUndefined();
    });

    // The customer types emi/processingFee onto the screen but they are the
    // backend's to compute. Nothing a client sends may influence them.
    test.each(['emi', 'processingFee', 'monthlyEmi'])(
        'a client-supplied %s is discarded',
        (field) => {
            const { value } = cdlSubmitApplicationSchema.validate(
                { ...application, [field]: 1 },
                OPTS,
            );
            expect(value).not.toHaveProperty(field);
        },
    );
});

// ─── Manual product entry: the money rules ────────────────────────────────────

describe('CDL product and loan amount rules', () => {
    const withValues = (
        productValue: number,
        downPayment: number,
        loanAmount: number,
    ) => cdlSubmitApplicationSchema.validate(
        { ...application, productValue, downPayment, loanAmount },
        OPTS,
    );

    test('the worked example is accepted: ₹80,000 product, ₹20,000 down, ₹60,000 loan', () => {
        expect(withValues(80000, 20000, 60000).error).toBeUndefined();
    });

    test('the same product with a ₹70,000 loan is rejected', () => {
        const { error } = withValues(80000, 20000, 70000);
        expect(error).toBeDefined();
        expect(error?.message).toMatch(/after down payment/i);
    });

    test.each([
        [6999, false],
        [7000, true],
        [7001, true],
        [50000, true],
        [99999, true],
        [100000, true],
        [100001, false],
    ])('loanAmount %d → accepted: %s', (loanAmount, ok) => {
        // Product value kept well above the ceiling so only the loan bounds
        // decide the outcome.
        const { error } = withValues(200000, 0, loanAmount as number);
        expect(error === undefined).toBe(ok);
    });

    test.each([
        ['productValue of 0', 0, 0, 7000, false],
        ['downPayment equal to productValue leaves nothing to finance', 50000, 50000, 7000, false],
        ['downPayment one rupee over productValue', 50000, 50001, 7000, false],
        ['downPayment just under productValue, loan within the remainder', 50000, 43000, 7000, true],
        ['no down payment at all', 50000, 0, 50000, true],
    ])('%s', (_name, productValue, downPayment, loanAmount, ok) => {
        const { error } = withValues(
            productValue as number,
            downPayment as number,
            loanAmount as number,
        );
        expect(error === undefined).toBe(ok);
    });

    test('a negative down payment is rejected', () => {
        expect(withValues(50000, -1, 7000).error).toBeDefined();
    });

    test.each([
        ['', false],
        ['   ', false],
        ['A', false],
        ['TV', true],
        ['Samsung 55 inch Smart TV', true],
    ])('productName %j → accepted: %s', (productName, ok) => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...application, productName },
            OPTS,
        );
        expect(error === undefined).toBe(ok);
    });

    test('a product name beyond 200 characters is rejected', () => {
        const { error } = cdlSubmitApplicationSchema.validate(
            { ...application, productName: 'x'.repeat(201) },
            OPTS,
        );
        expect(error?.details.some((d) => d.path.includes('productName'))).toBe(true);
    });

    test('a product name is trimmed before it is stored', () => {
        const { value } = cdlSubmitApplicationSchema.validate(
            { ...application, productName: '  Samsung 55 inch Smart TV  ' },
            OPTS,
        );
        expect(value.productName).toBe('Samsung 55 inch Smart TV');
    });
});

// ─── Quote: the screen's EMI and fee come from here ───────────────────────────

describe('CDL quote contract', () => {
    const quote = {
        productValue: 65000,
        downPayment: 10000,
        loanAmount: 55000,
        tenureMonths: 12,
        employmentType: 'SALARIED',
        interestRate: 14,
    };

    test('accepts what the product screen sends', () => {
        expect(cdlQuoteSchema.validate(quote, OPTS).error).toBeUndefined();
    });

    test('rejects a tenure outside 6–12 months', () => {
        expect(cdlQuoteSchema.validate({ ...quote, tenureMonths: 5 }, OPTS).error).toBeDefined();
        expect(cdlQuoteSchema.validate({ ...quote, tenureMonths: 13 }, OPTS).error).toBeDefined();
    });

    test.each([6, 7, 8, 9, 10, 11, 12])('accepts a tenure of %d months', (tenureMonths) => {
        expect(cdlQuoteSchema.validate({ ...quote, tenureMonths }, OPTS).error).toBeUndefined();
    });

    test('rejects a rate no employment type permits', () => {
        expect(cdlQuoteSchema.validate({ ...quote, interestRate: 11 }, OPTS).error).toBeDefined();
    });

    test('interestRate is optional — the service picks the default rate', () => {
        const { interestRate: _r, ...rest } = quote;
        expect(cdlQuoteSchema.validate(rest, OPTS).error).toBeUndefined();
    });
});

describe('CDL credit contract', () => {
    test.each([
        ['credit-assessment', cdlCreditAssessmentSchema],
        ['credit-decision', cdlCreditDecisionSchema],
    ])('%s accepts the three canonical income fields and keeps them', (_name, schema) => {
        const { error, value } = schema.validate(creditInput, OPTS);
        expect(error).toBeUndefined();
        expect(Object.keys(value).sort()).toEqual(['existingEmis', 'monthlyIncome', 'proposedEmi']);
    });

    test('existingObligations is not the field name — existingEmis is', () => {
        const { error } = cdlCreditAssessmentSchema.validate(
            { monthlyIncome: 85000, existingObligations: 4000, proposedEmi: 6250 },
            OPTS,
        );
        expect(error?.details.some((d) => d.path.includes('existingEmis'))).toBe(true);
    });

    // The score is read from the bureau-verified kyc_documents row. A client
    // that sends one must not be able to influence the decision with it.
    test('a client-supplied cibilScore is discarded', () => {
        const { value } = cdlCreditAssessmentSchema.validate(
            { ...creditInput, cibilScore: 900 },
            OPTS,
        );
        expect(value).not.toHaveProperty('cibilScore');
    });
});

describe('CDL NACH contract', () => {
    test('accepts a real account number, IFSC and debit day', () => {
        const { error, value } = cdlNachSchema.validate(
            { bankAccount: '123456789012', ifsc: 'HDFC0001234', preferredDebitDay: 7 },
            OPTS,
        );
        expect(error).toBeUndefined();
        expect(value.preferredDebitDay).toBe(7);
    });

    test('rejects a masked account number', () => {
        const { error } = cdlNachSchema.validate(
            { bankAccount: '****1234', ifsc: 'HDFC0001234' },
            OPTS,
        );
        expect(error?.details.some((d) => d.path.includes('bankAccount'))).toBe(true);
    });

    test('ifsc is required — the app used to validate it and never send it', () => {
        const { error } = cdlNachSchema.validate({ bankAccount: '123456789012' }, OPTS);
        expect(error?.details.some((d) => d.path.includes('ifsc'))).toBe(true);
    });
});

describe('CDL payment contracts', () => {
    // The customer app pays a whole EMI and sends no amount; the service reads
    // the payable figure from the EMI row so a client cannot understate it.
    test('a payment of one EMI needs only emiId', () => {
        const { error } = cdlManualPaymentSchema.validate(
            { emiId: '3f6c1a2e-6b1e-4a0a-9c2d-5f7b8e9a0c11' },
            OPTS,
        );
        expect(error).toBeUndefined();
    });

    test('an explicit amount is still accepted for staff collections', () => {
        const { error, value } = cdlManualPaymentSchema.validate(
            { emiId: '3f6c1a2e-6b1e-4a0a-9c2d-5f7b8e9a0c11', amount: 6250 },
            OPTS,
        );
        expect(error).toBeUndefined();
        expect(value.amount).toBe(6250);
    });

    test('part payment takes an amount and no emiId — the service allocates it', () => {
        const { error, value } = cdlPartPaymentSchema.validate({ amount: 10000 }, OPTS);
        expect(error).toBeUndefined();
        expect(value).not.toHaveProperty('emiId');
    });

    test('disbursal takes merchantName and amount', () => {
        const { error } = cdlDisburseSchema.validate(
            { merchantName: 'Croma', amount: 69900 },
            OPTS,
        );
        expect(error).toBeUndefined();
    });
});
