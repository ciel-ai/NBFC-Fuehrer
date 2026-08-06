import { describe, expect, it } from 'vitest';
import {
  aadhaarSchema,
  accountNumberSchema,
  dobAdultSchema,
  ifscSchema,
  panSchema,
  phoneSchema,
  pincodeSchema,
  validateIdNumber,
} from '../salesSchemas';

const isoYearsAgo = (years: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
};

describe('panSchema', () => {
  it('accepts a valid PAN and uppercases it', () => {
    const r = panSchema.safeParse('abcde1234f');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('ABCDE1234F');
  });
  it('rejects malformed PANs', () => {
    expect(panSchema.safeParse('ABC1234567').success).toBe(false);
    expect(panSchema.safeParse('ABCDE12345').success).toBe(false);
  });
});

describe('aadhaarSchema', () => {
  it('requires exactly 12 digits', () => {
    expect(aadhaarSchema.safeParse('123456789012').success).toBe(true);
    expect(aadhaarSchema.safeParse('12345678901').success).toBe(false);
    expect(aadhaarSchema.safeParse('12345678901a').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts Indian mobiles starting 6-9', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true);
    expect(phoneSchema.safeParse('5876543210').success).toBe(false);
    expect(phoneSchema.safeParse('98765').success).toBe(false);
  });
});

describe('ifscSchema / accountNumberSchema / pincodeSchema', () => {
  it('validates formats', () => {
    expect(ifscSchema.safeParse('HDFC0001234').success).toBe(true);
    expect(ifscSchema.safeParse('HDFC1001234').success).toBe(false); // 5th char must be 0
    expect(accountNumberSchema.safeParse('123456789').success).toBe(true);
    expect(accountNumberSchema.safeParse('12345678').success).toBe(false);
    expect(pincodeSchema.safeParse('560001').success).toBe(true);
    expect(pincodeSchema.safeParse('5600').success).toBe(false);
  });
});

describe('dobAdultSchema', () => {
  it('accepts adults 18–100', () => {
    expect(dobAdultSchema.safeParse(isoYearsAgo(30)).success).toBe(true);
    expect(dobAdultSchema.safeParse(isoYearsAgo(18)).success).toBe(true);
  });
  it('rejects minors', () => {
    expect(dobAdultSchema.safeParse(isoYearsAgo(17)).success).toBe(false);
  });
  it('rejects >100 and empty', () => {
    expect(dobAdultSchema.safeParse(isoYearsAgo(101)).success).toBe(false);
    expect(dobAdultSchema.safeParse('').success).toBe(false);
  });
});

describe('validateIdNumber', () => {
  it('applies the format of the selected ID type', () => {
    expect(validateIdNumber('pan', 'ABCDE1234F')).toBeNull();
    expect(validateIdNumber('pan', '123456789012')).toMatch(/PAN/);
    expect(validateIdNumber('aadhaar', '123456789012')).toBeNull();
    expect(validateIdNumber('aadhaar', 'ABCDE1234F')).toMatch(/12 digits/);
    expect(validateIdNumber('passport', 'A1234567')).toBeNull();
    expect(validateIdNumber('voter', 'ABC1234567')).toBeNull();
  });
  it('is lenient for unknown types and case', () => {
    expect(validateIdNumber('other-id', 'anything')).toBeNull();
    expect(validateIdNumber('pan', 'abcde1234f')).toBeNull();
  });
});
