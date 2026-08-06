import { describe, expect, it } from 'vitest';
import { buildSummarySections, buildSummaryHtml, type SummaryData } from '../applicationSummaryHtml';
import { emptyOrnament, type OrnamentEntry } from '@/src/features/sales/config/ornaments';

const ornament = (): OrnamentEntry => ({
  ...emptyOrnament(),
  ornamentType: 'chain',
  itemCount: '2',
  purity: '22',
  grossWeight: '50',
  stoneWeight: '',
  impurityPct: '',
  photoUri: 'file:///o.jpg',
});

const goldData = (over: Record<string, string> = {}): SummaryData => ({
  flow: 'gold',
  ornaments: [ornament()],
  params: {
    fullName: 'Imran Khan',
    fatherName: 'Yusuf Khan',
    motherMaidenName: 'Fatima',
    dob: '15/06/1990',
    gender: 'male',
    maritalStatus: 'Married',
    customerType: 'Salaried',
    pan: 'ABCDE1234F',
    aadhaar: '123456789012',
    phone: '9876543210',
    addrLine1: '4B MG Road',
    addrCity: 'Bengaluru',
    addrState: 'Karnataka',
    addrPin: '560001',
    permSame: 'yes',
    companyType: 'Private Ltd',
    industry: 'IT',
    employer: 'Infosys',
    monthlyIncome: '80000',
    yearsInJob: '5',
    bankName: 'HDFC',
    accountNumber: '123456789012',
    ifsc: 'HDFC0001234',
    accountType: 'Savings',
    loanAmount: '150000',
    tenure: '6',
    nomineeName: 'Fatima Khan',
    nomineeRelation: 'Spouse',
    ...over,
  },
});

describe('buildSummarySections — CAM structure', () => {
  it('produces the 11-module CAM structure in order (gold)', () => {
    const titles = buildSummarySections(goldData()).map((s) => s.title);
    expect(titles).toEqual([
      '1. Customer Information',
      '2. Address',
      '3. Co-Applicant',
      '4. Employment',
      '5. Banking',
      '6. Gold Ornaments',
      '7. Gold Valuation',
      '8. Loan Details',
      '9. Nominee & Documents',
      '10. Credit Approval',
    ]);
  });

  it('omits gold-only modules for CDL', () => {
    const titles = buildSummarySections({ ...goldData(), flow: 'cdl' }).map((s) => s.title);
    expect(titles).not.toContain('6. Gold Ornaments');
    expect(titles).not.toContain('7. Gold Valuation');
    expect(titles).toContain('8. Loan Details');
  });

  it('derives age and masks Aadhaar / account number', () => {
    const rows = Object.fromEntries(
      buildSummarySections(goldData()).flatMap((s) => s.rows),
    );
    expect(rows['Age']).toMatch(/^\d+ yrs$/);
    expect(rows['Aadhaar']).toBe('XXXX XXXX 9012');
    expect(rows['Account Number']).toBe('•••• 9012');
    expect(rows['PAN']).toBe('ABCDE1234F');
  });

  it('shows co-applicant rows only when present', () => {
    const without = buildSummarySections(goldData()).find((s) => s.title === '3. Co-Applicant');
    expect(without?.rows.length).toBe(0);
    expect(without?.note).toBeTruthy();

    const withCo = buildSummarySections(
      goldData({ hasCoApplicant: 'yes', coName: 'Sara', coRelation: 'Spouse', coMobile: '9000000000' }),
    ).find((s) => s.title === '3. Co-Applicant');
    expect(withCo?.rows.find(([l]) => l === 'Co-Borrower')?.[1]).toBe('Sara');
  });

  it('marks branch/credit modules as pending with a note', () => {
    const sections = buildSummarySections(goldData());
    expect(sections.find((s) => s.title === '7. Gold Valuation')?.note).toMatch(/branch appraiser/i);
    expect(sections.find((s) => s.title === '10. Credit Approval')?.note).toMatch(/TVR|CPV|credit team/i);
  });

  it('renders valid HTML including the CAM heading', () => {
    const html = buildSummaryHtml(goldData());
    expect(html).toContain('Credit Approval Memo');
    expect(html).toContain('1. Customer Information');
    expect(html).toContain('Imran Khan');
  });
});
