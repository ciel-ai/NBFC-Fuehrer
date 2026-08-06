import { z } from 'zod';
import { Colors } from '@/src/core/theme/colors';
import {
  accountNumberSchema,
  amountSchema,
  consentSchema,
  dobAdultSchema,
  ifscSchema,
  nameSchema,
  phoneSchema,
  requiredAsset,
  requiredSelect,
  requiredText,
  validateIdNumber,
} from '@/src/features/sales/resolvers/salesSchemas';
import type { SalesProductConfig } from '@/src/features/sales/config/types';
import { TILE_PRESETS } from '@/src/features/sales/config/shared';
import {
  ornamentTotals,
  ornamentsStepSchema,
  type OrnamentEntry,
} from '@/src/features/sales/config/ornaments';

const rows = (values: Record<string, unknown>): OrnamentEntry[] =>
  (values.ornaments as OrnamentEntry[]) ?? [];

// Gold Loan — 12-step LOS journey.
export const goldConfig: SalesProductConfig = {
  product: 'gold',
  title: 'Gold Loan',
  shortTitle: 'GL',
  description: 'Instant loan against gold ornaments, valued at the branch.',
  icon: 'diamond-outline',
  accent: Colors.goldDark,
  accentBg: Colors.goldLight,
  newLabel: 'New Gold Loan',
  tiles: [
    TILE_PRESETS.new('New Gold Loan'),
    TILE_PRESETS.draft('Drafts'),
    TILE_PRESETS.valuation('Valuation Pending'),
    TILE_PRESETS.approved('Approved'),
    TILE_PRESETS.rejected('Rejected'),
    TILE_PRESETS.disbursed('Disbursed'),
  ],
  steps: [
    {
      id: 'customer',
      title: 'Customer Details',
      subtitle: 'Applicant information',
      icon: 'person-outline',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Imran' },
        { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Khan' },
        { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: 'Select date of birth' },
        { name: 'gender', label: 'Gender', type: 'select', placeholder: 'Select gender', options: [
          { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' },
        ] },
        { name: 'mobile', label: 'Mobile Number', type: 'phone', prefix: '+91', placeholder: '10-digit number' },
      ],
      schema: z.object({
        firstName: nameSchema,
        lastName: nameSchema,
        dob: dobAdultSchema,
        gender: requiredSelect('gender'),
        mobile: phoneSchema,
      }),
    },
    {
      id: 'kyc',
      title: 'KYC Verification',
      subtitle: 'Identity proof',
      icon: 'finger-print-outline',
      fields: [
        { name: 'idType', label: 'ID Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Aadhaar', value: 'aadhaar' }, { label: 'PAN', value: 'pan' },
          { label: 'Passport', value: 'passport' }, { label: 'Voter ID', value: 'voter' },
        ] },
        { name: 'idNumber', label: 'ID Number', type: 'text', placeholder: 'Document number', autoCapitalize: 'characters' },
        { name: 'kycDocument', label: 'KYC Document', type: 'document', capture: 'library', placeholder: 'Upload document' },
      ],
      schema: z
        .object({
          idType: requiredSelect('an ID type'),
          idNumber: requiredText('ID number'),
          kycDocument: requiredAsset('the KYC document'),
        })
        .superRefine((v, ctx) => {
          const error = validateIdNumber(v.idType, v.idNumber);
          if (error) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['idNumber'], message: error });
          }
        }),
    },
    {
      id: 'gold-details',
      title: 'Ornament Schedule',
      subtitle: 'Each pledged ornament, itemised',
      icon: 'diamond-outline',
      kind: 'ornaments',
      note: 'Add every ornament separately — weight, purity, stone deduction and a photo per item. Net weight is derived automatically.',
      schema: ornamentsStepSchema,
    },
    {
      id: 'assessment',
      title: 'Gold Assessment',
      subtitle: 'Appraisal & valuation',
      icon: 'scale-outline',
      note: 'Weights are totalled from the ornament schedule. The certified branch appraiser records the appraised value after purity testing.',
      fields: [
        { name: 'totalItems', label: 'Total Items', type: 'derived', compute: (v) => `${ornamentTotals(rows(v)).items} pc` },
        { name: 'totalGrossWeight', label: 'Total Gross Weight', type: 'derived', compute: (v) => `${ornamentTotals(rows(v)).gross} g` },
        { name: 'totalNetWeight', label: 'Total Net Weight (derived)', type: 'derived', compute: (v) => `${ornamentTotals(rows(v)).net} g` },
        { name: 'appraisedValue', label: 'Appraised Value', type: 'currency', prefix: '₹', placeholder: '250000' },
        { name: 'appraiserName', label: 'Appraiser Name', type: 'text', placeholder: 'Branch appraiser' },
      ],
      schema: z.object({
        appraisedValue: amountSchema(1000, 'Enter the appraised value'),
        appraiserName: requiredText('Appraiser name'),
      }),
    },
    {
      id: 'gold-images',
      title: 'Weighing Evidence',
      subtitle: 'Photographic record',
      icon: 'camera-outline',
      note: 'Each ornament already has its own photo in the schedule. Capture the weighing-scale display showing the total weight.',
      fields: [
        { name: 'weighingPhoto', label: 'Weighing Photo', type: 'photo', capture: 'camera', placeholder: 'Capture weighing' },
      ],
      schema: z.object({
        weighingPhoto: requiredAsset('a weighing photo'),
      }),
    },
    {
      id: 'eligibility',
      title: 'Loan Eligibility',
      subtitle: 'LTV & eligible amount',
      icon: 'calculator-outline',
      fields: [
        { name: 'ltv', label: 'Loan-to-Value', type: 'select', placeholder: 'Select LTV', options: [
          { label: '60%', value: '60' }, { label: '70%', value: '70' }, { label: '75%', value: '75' },
        ] },
        { name: 'eligibleAmount', label: 'Eligible Amount', type: 'currency', prefix: '₹', placeholder: '187500' },
      ],
      schema: z.object({
        ltv: requiredSelect('an LTV'),
        eligibleAmount: amountSchema(1000, 'Enter the eligible amount'),
      }),
    },
    {
      id: 'loan-selection',
      title: 'Loan Selection',
      subtitle: 'Amount, tenure & scheme',
      icon: 'cash-outline',
      fields: [
        { name: 'loanAmount', label: 'Loan Amount', type: 'currency', prefix: '₹', placeholder: '150000' },
        { name: 'tenure', label: 'Tenure', type: 'select', placeholder: 'Select tenure', options: [
          { label: '3 months', value: '3' }, { label: '6 months', value: '6' },
          { label: '12 months', value: '12' }, { label: '24 months', value: '24' },
        ] },
        { name: 'interestScheme', label: 'Interest Scheme', type: 'select', placeholder: 'Select scheme', options: [
          { label: 'Monthly interest', value: 'monthly' }, { label: 'Bullet repayment', value: 'bullet' },
        ] },
      ],
      schema: z
        .object({
          loanAmount: amountSchema(5000, 'Enter a valid loan amount'),
          tenure: requiredSelect('a tenure'),
          interestScheme: requiredSelect('a scheme'),
          // carried from the eligibility step so the amount can be capped
          eligibleAmount: z.coerce.number().optional(),
        })
        .superRefine((v, ctx) => {
          if (v.eligibleAmount && v.loanAmount > v.eligibleAmount) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['loanAmount'],
              message: 'Loan amount cannot exceed the eligible amount',
            });
          }
        }),
    },
    {
      id: 'bank-details',
      title: 'Bank Details',
      subtitle: 'Disbursal account',
      icon: 'wallet-outline',
      fields: [
        { name: 'accountHolderName', label: 'Account Holder Name', type: 'text', placeholder: 'Imran Khan' },
        { name: 'accountNumber', label: 'Account Number', type: 'number', placeholder: 'Account number' },
        { name: 'ifsc', label: 'IFSC Code', type: 'text', placeholder: 'SBIN0001234', autoCapitalize: 'characters' },
        { name: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'State Bank of India' },
      ],
      schema: z.object({
        accountHolderName: nameSchema,
        accountNumber: accountNumberSchema,
        ifsc: ifscSchema,
        bankName: requiredText('Bank name'),
      }),
    },
    {
      id: 'agreement',
      title: 'Agreement',
      subtitle: 'Loan terms',
      icon: 'document-text-outline',
      note: 'Walk the customer through the pledge agreement, interest terms and storage policy.',
      fields: [
        { name: 'agreementConsent', label: 'Agreement Acceptance', type: 'checkbox', placeholder: 'Customer has read and accepts the gold-loan agreement' },
      ],
      schema: z.object({ agreementConsent: consentSchema }),
    },
    {
      id: 'esign',
      title: 'E-Sign',
      subtitle: 'OTP-based signature',
      icon: 'create-outline',
      note: 'The customer authenticates the agreement via Aadhaar OTP e-sign.',
      fields: [
        { name: 'esignConsent', label: 'E-Sign Consent', type: 'checkbox', placeholder: 'Customer consents to electronically signing the agreement' },
      ],
      schema: z.object({ esignConsent: consentSchema }),
    },
    {
      id: 'disbursement',
      title: 'Disbursement Summary',
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
        { name: 'declaration', label: 'Declaration', type: 'checkbox', placeholder: 'I confirm the gold was appraised and details captured with the customer’s consent' },
      ],
      schema: z.object({ declaration: consentSchema }),
    },
  ],
};
