// tests/unit/migration.schema.test.ts

import { BorrowerRowSchema, LoanRowSchema } from '@/modules/migration/migration.schema';

// ─── BorrowerRowSchema ────────────────────────────────────────────────────────

describe('BorrowerRowSchema', () => {

    const validBorrower = {
        legacyId:       'CUST-001',
        fullName:       'Ramesh Kumar',
        phone:          '9876543210',
        pan:            'ABCPE1234F',
        aadhaar:        '234123412346',
        dob:            '1990-05-15',
        flatHouseNo:    '12A',
        streetArea:     'MG Road',
        city:           'Bengaluru',
        state:          'Karnataka',
        pincode:        '560001',
        employmentType: 'SALARIED',
        employerName:   'Infosys Ltd',
    };

    test('accepts a valid borrower row', () => {
        const result = BorrowerRowSchema.safeParse(validBorrower);
        expect(result.success).toBe(true);
    });

    test('normalises phone to E.164', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, phone: '09876543210' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.phone).toBe('+919876543210');
    });

    test('rejects invalid phone', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, phone: '12345' });
        expect(result.success).toBe(false);
    });

    test('normalises PAN to uppercase', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, pan: 'abcpe1234f' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.pan).toBe('ABCPE1234F');
    });

    test('rejects invalid PAN', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, pan: 'INVALID123' });
        expect(result.success).toBe(false);
    });

    test('rejects invalid Aadhaar', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, aadhaar: '123456789012' });
        expect(result.success).toBe(false);
    });

    test('coerces Excel date serial to Date', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, dob: 32874 });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.dob).toBeInstanceOf(Date);
    });

    test('rejects invalid pincode', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, pincode: '56000' });
        expect(result.success).toBe(false);
    });

    test('rejects invalid employmentType', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, employmentType: 'FREELANCER' });
        expect(result.success).toBe(false);
    });

    test('email is optional — omitting it is valid', () => {
        const { ...withoutEmail } = validBorrower;
        const result = BorrowerRowSchema.safeParse(withoutEmail);
        expect(result.success).toBe(true);
    });

    test('rejects malformed email when provided', () => {
        const result = BorrowerRowSchema.safeParse({ ...validBorrower, email: 'not-an-email' });
        expect(result.success).toBe(false);
    });
});

// ─── LoanRowSchema ────────────────────────────────────────────────────────────

describe('LoanRowSchema', () => {

    const validLoan = {
        legacyId:        'LOAN-001',
        borrowerLegacyId:'CUST-001',
        accountNumber:   'ACC123456',
        productType:     'CONSUMER_DURABLE',
        principalAmount: 50000,
        interestRate:    13.5,
        tenureMonths:    24,
        monthlyEmi:      2366,
        outstandingBalance: 45000,
        disbursedAt:     '2023-06-01',
        status:          'ACTIVE',
    };

    test('accepts a valid loan row', () => {
        const result = LoanRowSchema.safeParse(validLoan);
        expect(result.success).toBe(true);
    });

    test('coerces tenureMonths from string', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, tenureMonths: '24' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.tenureMonths).toBe(24);
    });

    test('rejects invalid productType', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, productType: 'PERSONAL_LOAN' });
        expect(result.success).toBe(false);
    });

    test('rejects invalid status', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, status: 'PENDING' });
        expect(result.success).toBe(false);
    });

    test('coerces principalAmount from Indian comma-formatted string', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, principalAmount: '50,000' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.principalAmount).toBe(50000);
    });

    test('razorpayMandateId is optional — omitting it is valid', () => {
        const result = LoanRowSchema.safeParse(validLoan);
        expect(result.success).toBe(true);
    });

    test('coerces disbursedAt from Excel date serial', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, disbursedAt: 45078 });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.disbursedAt).toBeInstanceOf(Date);
    });

    test('rejects null disbursedAt', () => {
        const result = LoanRowSchema.safeParse({ ...validLoan, disbursedAt: null });
        expect(result.success).toBe(false);
    });
});