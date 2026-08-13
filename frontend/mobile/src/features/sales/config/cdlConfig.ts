import { z } from 'zod';
import { Colors } from '@/src/core/theme/colors';
import {
  accountNumberSchema,
  aadhaarSchema,
  amountSchema,
  consentSchema,
  emailSchema,
  ifscSchema,
  nameSchema,
  panSchema,
  phoneSchema,
  pincodeSchema,
  positiveNumberSchema,
  requiredAsset,
  requiredDate,
  requiredSelect,
  requiredText,
} from '@/src/features/sales/resolvers/salesSchemas';
import type {
  SalesFieldOption,
  SalesFormValues,
  SalesProductConfig,
} from '@/src/features/sales/config/types';
import { STATE_OPTIONS, TILE_PRESETS } from '@/src/features/sales/config/shared';
import { calculateEMI } from '@/src/core/utils/formatters';
import {
  ageFromDob,
  cdlAutoDebitLabel,
  cdlInterestRatesFor,
  cdlProcessingFee,
  cdlRateLabel,
  isCdlRateAllowed,
  CDL_AUTO_DEBIT_DATES,
  CDL_MAX_AGE,
  CDL_MAX_LOAN_AMOUNT,
  CDL_MIN_AGE,
  CDL_MIN_BANK_STATEMENT_MONTHS,
  CDL_MIN_LOAN_AMOUNT,
  CDL_MIN_MONTHLY_INCOME,
  CDL_TENURE_OPTIONS,
} from '@/src/entities/cdlPolicy';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const TENURE_OPTIONS: SalesFieldOption[] = CDL_TENURE_OPTIONS.map((m) => ({
  label: `${m} months`,
  value: String(m),
}));

const AUTO_DEBIT_OPTIONS: SalesFieldOption[] = CDL_AUTO_DEBIT_DATES.map((d) => ({
  label: cdlAutoDebitLabel(d),
  value: String(d),
}));

/** Permitted rates depend on the employment type chosen on the occupation step. */
const rateOptionsFor = (values: SalesFormValues): SalesFieldOption[] =>
  cdlInterestRatesFor(values.employmentType as string).map((r) => ({
    label: cdlRateLabel(r),
    value: String(r),
  }));

const emiFor = (values: SalesFormValues): number => {
  const amount = Number(values.loanAmount);
  const tenure = Number(values.tenureMonths);
  const rate = Number(values.interestRate);
  if (!amount || !tenure || Number.isNaN(rate)) return 0;
  return calculateEMI(amount, rate, tenure);
};

// Consumer Durable Loan — 15-step LOS journey.
// Product rules come from src/entities/cdlPolicy.ts (client spec §1, §2, §4, §5).
export const cdlConfig: SalesProductConfig = {
  product: 'cdl',
  title: 'Consumer Durable Loan',
  shortTitle: 'CDL',
  description: 'No-cost EMI on electronics & appliances at partner stores.',
  icon: 'phone-portrait',
  accent: Colors.primary,
  accentBg: Colors.primaryLight,
  newLabel: 'New Application',
  tiles: [
    TILE_PRESETS.new('New Application'),
    TILE_PRESETS.draft('Draft Applications'),
    TILE_PRESETS.submitted('Submitted'),
    TILE_PRESETS.approved('Approved'),
    TILE_PRESETS.rejected('Rejected'),
    TILE_PRESETS.disbursed('Disbursed'),
  ],
  steps: [
    {
      id: 'fdo',
      title: 'FDO Details',
      subtitle: 'Field officer & retail partner',
      icon: 'briefcase-outline',
      fields: [
        { name: 'fdoCode', label: 'FDO Code', type: 'text', placeholder: 'FDO0001', autoCapitalize: 'characters', helper: 'Your assigned field-disbursal officer code' },
        { name: 'retailShopCode', label: 'Retail Shop Code', type: 'text', placeholder: 'RS1001', autoCapitalize: 'characters' },
        { name: 'retailShopName', label: 'Retail Shop Name', type: 'text', placeholder: 'Sunrise Electronics' },
        { name: 'branch', label: 'Branch', type: 'text', placeholder: 'Bengaluru - Koramangala' },
      ],
      schema: z.object({
        fdoCode: requiredText('FDO Code'),
        retailShopCode: requiredText('Retail Shop Code'),
        retailShopName: requiredText('Retail Shop Name'),
        branch: requiredText('Branch'),
      }),
    },
    {
      id: 'personal',
      title: 'Personal Details',
      subtitle: 'Applicant information',
      icon: 'person-outline',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Priya' },
        { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Nair' },
        {
          name: 'dob',
          label: 'Date of Birth',
          type: 'date',
          placeholder: 'Select date of birth',
          helper: `Applicant must be ${CDL_MIN_AGE}–${CDL_MAX_AGE} years old`,
          helperFrom: (v) =>
            v.dob
              ? `Age ${ageFromDob(v.dob as string)} · eligible band ${CDL_MIN_AGE}–${CDL_MAX_AGE}`
              : `Applicant must be ${CDL_MIN_AGE}–${CDL_MAX_AGE} years old`,
        },
        { name: 'gender', label: 'Gender', type: 'select', placeholder: 'Select gender', options: [
          { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' },
        ] },
        { name: 'mobile', label: 'Mobile Number', type: 'phone', prefix: '+91', placeholder: '10-digit number' },
        { name: 'email', label: 'Email (optional)', type: 'email', placeholder: 'name@email.com', optional: true },
        { name: 'maritalStatus', label: 'Marital Status', type: 'select', placeholder: 'Select', options: [
          { label: 'Single', value: 'single' }, { label: 'Married', value: 'married' },
        ] },
      ],
      schema: z.object({
        firstName: nameSchema,
        lastName: nameSchema,
        // 4.1 — age must be 21–55 on the date of application.
        dob: requiredDate('date of birth').refine(
          (d) => {
            const age = ageFromDob(d as unknown as string);
            return age >= CDL_MIN_AGE && age <= CDL_MAX_AGE;
          },
          { message: `Applicant must be between ${CDL_MIN_AGE} and ${CDL_MAX_AGE} years old` },
        ),
        gender: requiredSelect('gender'),
        mobile: phoneSchema,
        email: emailSchema.optional().or(z.literal('')),
        maritalStatus: requiredSelect('marital status'),
      }),
    },
    {
      id: 'pan',
      title: 'PAN Details',
      subtitle: 'Income-tax identity',
      icon: 'card-outline',
      fields: [
        { name: 'pan', label: 'PAN', type: 'pan', placeholder: 'ABCDE1234F', helper: '10-character permanent account number' },
        { name: 'nameOnPan', label: 'Name as on PAN', type: 'text', placeholder: 'Priya Nair' },
      ],
      schema: z.object({ pan: panSchema, nameOnPan: nameSchema }),
    },
    {
      id: 'aadhaar',
      title: 'Aadhaar Details',
      subtitle: 'Address & identity',
      icon: 'finger-print-outline',
      fields: [
        { name: 'aadhaar', label: 'Aadhaar Number', type: 'aadhaar', placeholder: '12-digit number' },
        { name: 'addressLine1', label: 'Address', type: 'text', placeholder: 'House / street / area' },
        { name: 'city', label: 'City', type: 'text', placeholder: 'Bengaluru' },
        { name: 'state', label: 'State', type: 'select', placeholder: 'Select state', options: STATE_OPTIONS },
        { name: 'pincode', label: 'PIN Code', type: 'pincode', placeholder: '6-digit PIN' },
      ],
      schema: z.object({
        aadhaar: aadhaarSchema,
        addressLine1: requiredText('Address'),
        city: requiredText('City'),
        state: requiredSelect('state'),
        pincode: pincodeSchema,
      }),
    },
    {
      id: 'face-match',
      title: 'Face Match',
      subtitle: 'Live selfie verification',
      icon: 'camera-outline',
      note: 'Capture a clear, well-lit selfie of the applicant for biometric match against Aadhaar.',
      fields: [
        { name: 'selfie', label: 'Applicant Selfie', type: 'photo', capture: 'camera', placeholder: 'Capture selfie' },
      ],
      schema: z.object({ selfie: requiredAsset('a selfie') }),
    },
    {
      id: 'occupation',
      title: 'Occupation Details',
      subtitle: 'Employment & income',
      icon: 'business-outline',
      fields: [
        // 4.1 — employment must be Salaried or Self-employed. The rate set and
        // the income basis both key off this.
        { name: 'employmentType', label: 'Employment Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Salaried', value: 'salaried' }, { label: 'Self-Employed', value: 'self_employed' },
        ], helper: 'Determines the permitted interest rates and the income basis' },
        { name: 'employerName', label: 'Employer / Business Name', type: 'text', placeholder: 'Company name' },
        {
          name: 'monthlyIncome',
          label: 'Net Monthly Income',
          type: 'currency',
          prefix: '₹',
          placeholder: '45000',
          helperFrom: (v) =>
            v.employmentType === 'self_employed'
              ? `Average monthly income from bank statements · minimum ${inr(CDL_MIN_MONTHLY_INCOME)}`
              : `Net salary after deductions · minimum ${inr(CDL_MIN_MONTHLY_INCOME)}`,
        },
        // 5. Existing EMIs feed the FOIR calculation.
        { name: 'existingEmis', label: 'Existing EMIs (monthly)', type: 'currency', prefix: '₹', placeholder: '5000', helper: 'Total EMI on all current obligations. Enter 0 if none.' },
        { name: 'workExperienceYears', label: 'Work Experience (years)', type: 'number', placeholder: '3' },
      ],
      schema: z.object({
        employmentType: requiredSelect('employment type'),
        employerName: requiredText('Employer name'),
        monthlyIncome: amountSchema(
          CDL_MIN_MONTHLY_INCOME,
          `Minimum monthly income is ${inr(CDL_MIN_MONTHLY_INCOME)}`,
        ),
        existingEmis: amountSchema(0, 'Enter existing EMIs (0 if none)'),
        workExperienceYears: positiveNumberSchema('Enter work experience'),
      }),
    },
    {
      id: 'product',
      title: 'Product Details',
      subtitle: 'Item being financed',
      icon: 'pricetags-outline',
      // 2(a) — no CDL product pop-up list. Name and value are keyed in by hand.
      note: 'Enter the product name and value manually as printed on the invoice.',
      fields: [
        { name: 'productName', label: 'Product Name', type: 'text', placeholder: 'e.g. Samsung 55" QLED TV' },
        { name: 'productValue', label: 'Product Value', type: 'currency', prefix: '₹', placeholder: '79999', helper: 'Invoice value of the item' },
        { name: 'merchantName', label: 'Merchant Name', type: 'text', placeholder: 'Sunrise Electronics' },
      ],
      schema: z.object({
        productName: requiredText('Product name'),
        productValue: amountSchema(1, 'Enter the product value'),
        merchantName: requiredText('Merchant name'),
      }),
    },
    {
      id: 'bank-statement',
      title: 'Bank Statement Analyser',
      subtitle: 'Income verification',
      icon: 'analytics-outline',
      note: `Upload at least ${CDL_MIN_BANK_STATEMENT_MONTHS} months of bank statements for automated income analysis.`,
      fields: [
        { name: 'bankStatement', label: 'Bank Statement', type: 'document', capture: 'library', placeholder: 'Upload statement' },
        { name: 'bankStatementMonths', label: 'Months Covered', type: 'number', placeholder: '3', helper: `Minimum ${CDL_MIN_BANK_STATEMENT_MONTHS} months required` },
        { name: 'avgMonthlyCredit', label: 'Avg. Monthly Credit', type: 'currency', prefix: '₹', placeholder: '50000', helper: 'Used to verify regular salary credits and ABB' },
      ],
      schema: z.object({
        bankStatement: requiredAsset('the bank statement'),
        bankStatementMonths: amountSchema(
          CDL_MIN_BANK_STATEMENT_MONTHS,
          `At least ${CDL_MIN_BANK_STATEMENT_MONTHS} months of statements are required`,
        ),
        avgMonthlyCredit: amountSchema(1, 'Enter the average monthly credit'),
      }),
    },
    {
      id: 'loan-details',
      title: 'Expected Loan Details',
      subtitle: 'Amount, tenure & rate',
      icon: 'cash-outline',
      fields: [
        {
          name: 'loanAmount',
          label: 'Loan Amount',
          type: 'currency',
          prefix: '₹',
          placeholder: '70000',
          helper: `${inr(CDL_MIN_LOAN_AMOUNT)} – ${inr(CDL_MAX_LOAN_AMOUNT)}`,
        },
        {
          name: 'tenureMonths',
          label: 'Tenure',
          type: 'select',
          placeholder: 'Select tenure',
          options: TENURE_OPTIONS,
        },
        // 1(b) / 2(b) — the permitted set depends on the employment type.
        {
          name: 'interestRate',
          label: 'Interest Rate',
          type: 'select',
          placeholder: 'Select rate',
          optionsFrom: rateOptionsFor,
          helperFrom: (v) =>
            v.employmentType
              ? `Permitted for ${v.employmentType === 'self_employed' ? 'self-employed' : 'salaried'}: ${cdlInterestRatesFor(
                  v.employmentType as string,
                )
                  .map((r) => `${r}%`)
                  .join(' / ')}`
              : 'Select an employment type first',
        },
        { name: 'downPayment', label: 'Down Payment (optional)', type: 'currency', prefix: '₹', placeholder: '10000', optional: true },
        // 2(c) — slab-based, derived from the loan amount.
        {
          name: 'processingFeeDisplay',
          label: 'Processing Fee',
          type: 'derived',
          compute: (v) => {
            const fee = cdlProcessingFee(Number(v.loanAmount));
            return fee > 0 ? inr(fee) : '—';
          },
          helper: `${inr(7000)}–${inr(25000)}: ${inr(1463)} · ${inr(25001)}–${inr(50000)}: ${inr(1817)} · ${inr(50001)}–${inr(100000)}: ${inr(2466)}`,
        },
        {
          name: 'emiDisplay',
          label: 'Monthly EMI',
          type: 'derived',
          compute: (v) => {
            const emi = emiFor(v);
            return emi > 0 ? inr(emi) : '—';
          },
          helperFrom: (v) => {
            const emi = emiFor(v);
            const tenure = Number(v.tenureMonths);
            if (!emi || !tenure) return 'Set amount, tenure and rate to see the EMI';
            return Number(v.interestRate) === 0
              ? `No-cost EMI · ${inr(emi)} × ${tenure} months`
              : `${inr(emi)} × ${tenure} months · reducing balance`;
          },
        },
        {
          name: 'foirDisplay',
          label: 'FOIR (indicative)',
          type: 'derived',
          compute: (v) => {
            const income = Number(v.monthlyIncome);
            const emi = emiFor(v);
            if (!income || !emi) return '—';
            const foir = ((Number(v.existingEmis) || 0) + emi) / income * 100;
            return `${Math.round(foir * 10) / 10}%`;
          },
          helper: '(Existing EMIs + Proposed EMI) ÷ Net Monthly Income × 100 · limit 60%',
        },
      ],
      schema: z
        .object({
          loanAmount: amountSchema(
            CDL_MIN_LOAN_AMOUNT,
            `Loan amount must be at least ${inr(CDL_MIN_LOAN_AMOUNT)}`,
          ).max(
            CDL_MAX_LOAN_AMOUNT,
            `Loan amount cannot exceed ${inr(CDL_MAX_LOAN_AMOUNT)}`,
          ),
          tenureMonths: requiredSelect('a tenure'),
          interestRate: requiredSelect('an interest rate'),
          downPayment: z.union([amountSchema(0), z.literal('')]).optional(),
          // Carried in from earlier steps so we can cross-validate.
          employmentType: z.string().optional(),
          productValue: z.coerce.number().optional(),
        })
        .superRefine((v, ctx) => {
          if (!isCdlRateAllowed(v.employmentType, Number(v.interestRate))) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['interestRate'],
              message: 'That rate is not permitted for this employment type',
            });
          }
          if (v.productValue && v.loanAmount > v.productValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['loanAmount'],
              message: 'Loan amount cannot exceed the product value',
            });
          }
        }),
    },
    {
      id: 'offer',
      title: 'Product Offer',
      subtitle: 'Sanctioned terms',
      icon: 'gift-outline',
      note: 'Review the indicative offer with the customer and confirm acceptance to proceed.',
      fields: [
        { name: 'offerAccepted', label: 'Offer Acceptance', type: 'checkbox', placeholder: 'Customer accepts the indicative loan offer and EMI terms' },
      ],
      schema: z.object({ offerAccepted: consentSchema }),
    },
    {
      id: 'post-sanction',
      title: 'Post-Sanction Documents',
      subtitle: 'Supporting proofs',
      icon: 'documents-outline',
      fields: [
        { name: 'incomeProof', label: 'Income Proof', type: 'document', capture: 'library', placeholder: 'Upload income proof' },
        { name: 'addressProof', label: 'Address Proof', type: 'document', capture: 'library', placeholder: 'Upload address proof' },
        { name: 'applicantPhoto', label: 'Applicant Photograph', type: 'photo', capture: 'camera', placeholder: 'Capture photo' },
      ],
      schema: z.object({
        incomeProof: requiredAsset('income proof'),
        addressProof: requiredAsset('address proof'),
        applicantPhoto: requiredAsset('a photograph'),
      }),
    },
    {
      id: 'bank-details',
      title: 'Bank Details',
      subtitle: 'Disbursal account',
      icon: 'wallet-outline',
      fields: [
        { name: 'accountHolderName', label: 'Account Holder Name', type: 'text', placeholder: 'Priya Nair' },
        { name: 'accountNumber', label: 'Account Number', type: 'number', placeholder: 'Account number' },
        { name: 'ifsc', label: 'IFSC Code', type: 'text', placeholder: 'HDFC0001234', autoCapitalize: 'characters' },
        { name: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'HDFC Bank' },
      ],
      schema: z.object({
        accountHolderName: nameSchema,
        accountNumber: accountNumberSchema,
        ifsc: ifscSchema,
        bankName: requiredText('Bank name'),
      }),
    },
    {
      id: 'emandate',
      title: 'E-Mandate Registration',
      subtitle: 'Auto-debit setup',
      icon: 'repeat-outline',
      fields: [
        { name: 'mandateType', label: 'Mandate Type', type: 'select', placeholder: 'Select', options: [
          { label: 'NACH', value: 'nach' }, { label: 'UPI Autopay', value: 'upi' },
        ] },
        // 1(d) — auto-debit is restricted to the 4th, 7th or 12th.
        {
          name: 'debitDate',
          label: 'Auto-Debit Date',
          type: 'select',
          placeholder: 'Select date',
          options: AUTO_DEBIT_OPTIONS,
          helper: 'EMIs are debited on this date every month',
        },
        { name: 'mandateConsent', label: 'Mandate Consent', type: 'checkbox', placeholder: 'Customer authorises auto-debit of EMIs' },
      ],
      schema: z.object({
        mandateType: requiredSelect('a mandate type'),
        debitDate: requiredSelect('a debit date'),
        mandateConsent: consentSchema,
      }),
    },
    {
      id: 'summary',
      title: 'Loan Summary',
      subtitle: 'Review all details',
      icon: 'reader-outline',
      kind: 'review',
    },
    {
      id: 'submit',
      title: 'Submit Application',
      subtitle: 'Final declaration',
      icon: 'checkmark-done-outline',
      kind: 'submit',
      fields: [
        { name: 'declaration', label: 'Declaration', type: 'checkbox', placeholder: 'I confirm all details are accurate and collected with the customer’s consent' },
      ],
      schema: z.object({ declaration: consentSchema }),
    },
  ],
};
