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
import type { SalesProductConfig } from '@/src/features/sales/config/types';
import { STATE_OPTIONS, TILE_PRESETS } from '@/src/features/sales/config/shared';

// Consumer Durable Loan — 15-step LOS journey.
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
        { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: 'Select date of birth' },
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
        dob: requiredDate('date of birth'),
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
        { name: 'employmentType', label: 'Employment Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Salaried', value: 'salaried' }, { label: 'Self-Employed', value: 'self_employed' }, { label: 'Business Owner', value: 'business' },
        ] },
        { name: 'employerName', label: 'Employer / Business Name', type: 'text', placeholder: 'Company name' },
        { name: 'monthlyIncome', label: 'Monthly Income', type: 'currency', prefix: '₹', placeholder: '45000' },
        { name: 'workExperienceYears', label: 'Work Experience (years)', type: 'number', placeholder: '3' },
      ],
      schema: z.object({
        employmentType: requiredSelect('employment type'),
        employerName: requiredText('Employer name'),
        monthlyIncome: amountSchema(5000, 'Enter a valid monthly income'),
        workExperienceYears: positiveNumberSchema('Enter work experience'),
      }),
    },
    {
      id: 'product',
      title: 'Product Details',
      subtitle: 'Item being financed',
      icon: 'pricetags-outline',
      fields: [
        { name: 'productCategory', label: 'Product Category', type: 'select', placeholder: 'Select', options: [
          { label: 'Mobile Phone', value: 'mobile' }, { label: 'Home Appliance', value: 'appliance' },
          { label: 'Laptop / Computer', value: 'laptop' }, { label: 'Television', value: 'tv' },
        ] },
        { name: 'productName', label: 'Product Name / Model', type: 'text', placeholder: 'e.g. iPhone 15' },
        { name: 'productPrice', label: 'Product Price', type: 'currency', prefix: '₹', placeholder: '79999' },
        { name: 'merchantName', label: 'Merchant Name', type: 'text', placeholder: 'Sunrise Electronics' },
      ],
      schema: z.object({
        productCategory: requiredSelect('a category'),
        productName: requiredText('Product name'),
        productPrice: amountSchema(1000, 'Enter a valid price'),
        merchantName: requiredText('Merchant name'),
      }),
    },
    {
      id: 'bank-statement',
      title: 'Bank Statement Analyser',
      subtitle: 'Income verification',
      icon: 'analytics-outline',
      note: 'Upload the last 3 months of bank statements for automated income analysis.',
      fields: [
        { name: 'bankStatement', label: 'Bank Statement', type: 'document', capture: 'library', placeholder: 'Upload statement' },
        { name: 'avgMonthlyCredit', label: 'Avg. Monthly Credit', type: 'currency', prefix: '₹', placeholder: '50000' },
      ],
      schema: z.object({
        bankStatement: requiredAsset('the bank statement'),
        avgMonthlyCredit: amountSchema(1, 'Enter the average monthly credit'),
      }),
    },
    {
      id: 'loan-details',
      title: 'Expected Loan Details',
      subtitle: 'Amount & tenure',
      icon: 'cash-outline',
      fields: [
        { name: 'loanAmount', label: 'Loan Amount', type: 'currency', prefix: '₹', placeholder: '70000' },
        { name: 'tenure', label: 'Tenure', type: 'select', placeholder: 'Select tenure', options: [
          { label: '3 months', value: '3' }, { label: '6 months', value: '6' }, { label: '9 months', value: '9' },
          { label: '12 months', value: '12' }, { label: '18 months', value: '18' },
        ] },
        { name: 'downPayment', label: 'Down Payment (optional)', type: 'currency', prefix: '₹', placeholder: '10000', optional: true },
      ],
      schema: z.object({
        loanAmount: amountSchema(5000, 'Enter a valid loan amount'),
        tenure: requiredSelect('a tenure'),
        downPayment: z.union([amountSchema(0), z.literal('')]).optional(),
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
        { name: 'debitDate', label: 'EMI Debit Date', type: 'select', placeholder: 'Select date', options: [
          { label: '1st of month', value: '1' }, { label: '5th of month', value: '5' }, { label: '10th of month', value: '10' },
        ] },
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
