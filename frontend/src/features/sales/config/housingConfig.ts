import { z } from 'zod';
import { Colors } from '@/src/core/theme/colors';
import {
  accountNumberSchema,
  aadhaarSchema,
  amountSchema,
  consentSchema,
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

const optionalCurrency = z.union([amountSchema(0), z.literal('')]).optional();
const optionalAsset = z.string().optional();
const optionalText = z.string().optional();

// Affordable Housing Loan — 17-step LOS journey.
export const housingConfig: SalesProductConfig = {
  product: 'housing',
  title: 'Affordable Housing Loan',
  shortTitle: 'AHL',
  description: 'Home loans for first-time buyers, with PMAY subsidy support.',
  icon: 'home-outline',
  accent: Colors.purple,
  accentBg: Colors.purpleLight,
  newLabel: 'New Lead',
  tiles: [
    TILE_PRESETS.new('New Lead'),
    TILE_PRESETS.draft('Draft Leads'),
    TILE_PRESETS.siteVisit('Site Visit Pending'),
    TILE_PRESETS.inReview('Credit Review'),
    TILE_PRESETS.approved('Approved'),
    TILE_PRESETS.rejected('Rejected'),
    TILE_PRESETS.disbursed('Disbursed'),
  ],
  steps: [
    {
      id: 'lead',
      title: 'Lead Creation',
      subtitle: 'Capture the enquiry',
      icon: 'person-add-outline',
      fields: [
        { name: 'leadSource', label: 'Lead Source', type: 'select', placeholder: 'Select source', options: [
          { label: 'Walk-in', value: 'walk_in' }, { label: 'Referral', value: 'referral' },
          { label: 'Builder Tie-up', value: 'builder' }, { label: 'Digital', value: 'digital' },
        ] },
        { name: 'customerName', label: 'Customer Name', type: 'text', placeholder: 'Sunita Rao' },
        { name: 'mobile', label: 'Mobile Number', type: 'phone', prefix: '+91', placeholder: '10-digit number' },
        { name: 'leadCity', label: 'City', type: 'text', placeholder: 'Pune' },
        { name: 'requestedAmount', label: 'Requested Amount', type: 'currency', prefix: '₹', placeholder: '2500000' },
      ],
      schema: z.object({
        leadSource: requiredSelect('a lead source'),
        customerName: nameSchema,
        mobile: phoneSchema,
        leadCity: requiredText('City'),
        requestedAmount: amountSchema(100000, 'Enter a valid amount'),
      }),
    },
    {
      id: 'applicant',
      title: 'Applicant Details',
      subtitle: 'Primary borrower',
      icon: 'person-outline',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Sunita' },
        { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Rao' },
        { name: 'dob', label: 'Date of Birth', type: 'date', placeholder: 'Select date of birth' },
        { name: 'gender', label: 'Gender', type: 'select', placeholder: 'Select gender', options: [
          { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' },
        ] },
        { name: 'maritalStatus', label: 'Marital Status', type: 'select', placeholder: 'Select', options: [
          { label: 'Single', value: 'single' }, { label: 'Married', value: 'married' },
        ] },
        { name: 'pan', label: 'PAN', type: 'pan', placeholder: 'ABCDE1234F' },
      ],
      schema: z.object({
        firstName: nameSchema,
        lastName: nameSchema,
        dob: requiredDate('date of birth'),
        gender: requiredSelect('gender'),
        maritalStatus: requiredSelect('marital status'),
        pan: panSchema,
      }),
    },
    {
      id: 'co-applicant',
      title: 'Co-Applicant',
      subtitle: 'Optional joint borrower',
      icon: 'people-outline',
      note: 'Add a co-applicant to strengthen eligibility, or continue if there is none.',
      fields: [
        { name: 'coApplicantName', label: 'Co-Applicant Name (optional)', type: 'text', placeholder: 'Full name', optional: true },
        { name: 'coApplicantRelation', label: 'Relationship (optional)', type: 'select', placeholder: 'Select', optional: true, options: [
          { label: 'Spouse', value: 'spouse' }, { label: 'Parent', value: 'parent' },
          { label: 'Sibling', value: 'sibling' }, { label: 'Child', value: 'child' },
        ] },
        { name: 'coApplicantPan', label: 'Co-Applicant PAN (optional)', type: 'text', placeholder: 'ABCDE1234F', autoCapitalize: 'characters', optional: true },
      ],
      schema: z.object({
        coApplicantName: optionalText,
        coApplicantRelation: optionalText,
        coApplicantPan: optionalText,
      }),
    },
    {
      id: 'kyc',
      title: 'KYC',
      subtitle: 'Identity verification',
      icon: 'finger-print-outline',
      fields: [
        { name: 'aadhaar', label: 'Aadhaar Number', type: 'aadhaar', placeholder: '12-digit number' },
        { name: 'kycDocument', label: 'KYC Document', type: 'document', capture: 'library', placeholder: 'Upload Aadhaar / PAN' },
      ],
      schema: z.object({
        aadhaar: aadhaarSchema,
        kycDocument: requiredAsset('the KYC document'),
      }),
    },
    {
      id: 'employment',
      title: 'Employment',
      subtitle: 'Work profile',
      icon: 'business-outline',
      fields: [
        { name: 'employmentType', label: 'Employment Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Salaried', value: 'salaried' }, { label: 'Self-Employed', value: 'self_employed' }, { label: 'Business Owner', value: 'business' },
        ] },
        { name: 'employerName', label: 'Employer / Business Name', type: 'text', placeholder: 'Company name' },
        { name: 'designation', label: 'Designation', type: 'text', placeholder: 'Role' },
        { name: 'workExperienceYears', label: 'Total Experience (years)', type: 'number', placeholder: '6' },
      ],
      schema: z.object({
        employmentType: requiredSelect('employment type'),
        employerName: requiredText('Employer name'),
        designation: requiredText('Designation'),
        workExperienceYears: positiveNumberSchema('Enter total experience'),
      }),
    },
    {
      id: 'income',
      title: 'Income Assessment',
      subtitle: 'Repayment capacity',
      icon: 'trending-up-outline',
      fields: [
        { name: 'monthlyIncome', label: 'Monthly Income', type: 'currency', prefix: '₹', placeholder: '60000' },
        { name: 'otherIncome', label: 'Other Income (optional)', type: 'currency', prefix: '₹', placeholder: '10000', optional: true },
        { name: 'existingEmis', label: 'Existing EMIs (optional)', type: 'currency', prefix: '₹', placeholder: '8000', optional: true },
        { name: 'incomeProof', label: 'Income Proof', type: 'document', capture: 'library', placeholder: 'Upload salary slips / ITR' },
      ],
      schema: z.object({
        monthlyIncome: amountSchema(10000, 'Enter a valid monthly income'),
        otherIncome: optionalCurrency,
        existingEmis: optionalCurrency,
        incomeProof: requiredAsset('income proof'),
      }),
    },
    {
      id: 'property',
      title: 'Property Details',
      subtitle: 'Collateral information',
      icon: 'home-outline',
      fields: [
        { name: 'propertyType', label: 'Property Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Apartment', value: 'apartment' }, { label: 'Independent House', value: 'house' },
          { label: 'Plot + Construction', value: 'plot' }, { label: 'Resale', value: 'resale' },
        ] },
        { name: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: 'Project / street / area' },
        { name: 'propertyCity', label: 'City', type: 'text', placeholder: 'Pune' },
        { name: 'propertyState', label: 'State', type: 'select', placeholder: 'Select state', options: STATE_OPTIONS },
        { name: 'propertyPincode', label: 'PIN Code', type: 'pincode', placeholder: '6-digit PIN' },
        { name: 'propertyValue', label: 'Property Value', type: 'currency', prefix: '₹', placeholder: '3500000' },
      ],
      schema: z.object({
        propertyType: requiredSelect('a property type'),
        propertyAddress: requiredText('Property address'),
        propertyCity: requiredText('City'),
        propertyState: requiredSelect('state'),
        propertyPincode: pincodeSchema,
        propertyValue: amountSchema(100000, 'Enter a valid property value'),
      }),
    },
    {
      id: 'property-documents',
      title: 'Property Documents',
      subtitle: 'Title & approvals',
      icon: 'documents-outline',
      fields: [
        { name: 'saleDeed', label: 'Sale Deed / Agreement', type: 'document', capture: 'library', placeholder: 'Upload sale deed' },
        { name: 'approvedPlan', label: 'Approved Building Plan', type: 'document', capture: 'library', placeholder: 'Upload approved plan' },
        { name: 'taxReceipt', label: 'Property Tax Receipt', type: 'document', capture: 'library', placeholder: 'Upload tax receipt' },
      ],
      schema: z.object({
        saleDeed: requiredAsset('the sale deed'),
        approvedPlan: requiredAsset('the approved plan'),
        taxReceipt: requiredAsset('the tax receipt'),
      }),
    },
    {
      id: 'legal',
      title: 'Legal Verification',
      subtitle: 'Title clearance',
      icon: 'shield-checkmark-outline',
      note: 'Outcome of the legal opinion on the property title and chain of documents.',
      fields: [
        { name: 'legalStatus', label: 'Legal Status', type: 'select', placeholder: 'Select', options: [
          { label: 'Clear', value: 'clear' }, { label: 'Pending', value: 'pending' }, { label: 'Query Raised', value: 'query' },
        ] },
        { name: 'legalRemarks', label: 'Remarks (optional)', type: 'text', placeholder: 'Legal remarks', optional: true },
        { name: 'legalReport', label: 'Legal Report (optional)', type: 'document', capture: 'library', placeholder: 'Upload report', optional: true },
      ],
      schema: z.object({
        legalStatus: requiredSelect('the legal status'),
        legalRemarks: optionalText,
        legalReport: optionalAsset,
      }),
    },
    {
      id: 'technical',
      title: 'Technical Evaluation',
      subtitle: 'Valuation & stage',
      icon: 'construct-outline',
      fields: [
        { name: 'constructionStage', label: 'Construction Stage', type: 'select', placeholder: 'Select', options: [
          { label: 'Ready to Move', value: 'ready' }, { label: 'Under Construction', value: 'under_construction' },
          { label: 'New Launch', value: 'new_launch' },
        ] },
        { name: 'technicalValue', label: 'Technical Valuation', type: 'currency', prefix: '₹', placeholder: '3400000' },
        { name: 'technicalReport', label: 'Technical Report (optional)', type: 'document', capture: 'library', placeholder: 'Upload report', optional: true },
      ],
      schema: z.object({
        constructionStage: requiredSelect('the construction stage'),
        technicalValue: amountSchema(100000, 'Enter the technical valuation'),
        technicalReport: optionalAsset,
      }),
    },
    {
      id: 'credit',
      title: 'Credit Assessment',
      subtitle: 'Bureau & eligibility',
      icon: 'speedometer-outline',
      fields: [
        { name: 'cibilScore', label: 'CIBIL Score', type: 'number', placeholder: '760', maxLength: 3 },
        { name: 'foir', label: 'FOIR (%)', type: 'number', placeholder: '45', maxLength: 3, optional: true },
      ],
      schema: z.object({
        cibilScore: positiveNumberSchema('Enter the CIBIL score'),
        foir: z.union([positiveNumberSchema(), z.literal('')]).optional(),
      }),
    },
    {
      id: 'structuring',
      title: 'Loan Structuring',
      subtitle: 'Amount, tenure & ROI',
      icon: 'options-outline',
      fields: [
        { name: 'loanAmount', label: 'Loan Amount', type: 'currency', prefix: '₹', placeholder: '2800000' },
        { name: 'tenureYears', label: 'Tenure', type: 'select', placeholder: 'Select tenure', options: [
          { label: '10 years', value: '10' }, { label: '15 years', value: '15' },
          { label: '20 years', value: '20' }, { label: '30 years', value: '30' },
        ] },
        { name: 'roiType', label: 'Interest Type', type: 'select', placeholder: 'Select', options: [
          { label: 'Fixed', value: 'fixed' }, { label: 'Floating', value: 'floating' },
        ] },
      ],
      schema: z.object({
        loanAmount: amountSchema(100000, 'Enter a valid loan amount'),
        tenureYears: requiredSelect('a tenure'),
        roiType: requiredSelect('an interest type'),
      }),
    },
    {
      id: 'sanction',
      title: 'Sanction Offer',
      subtitle: 'Offer acceptance',
      icon: 'gift-outline',
      note: 'Present the sanction terms and PMAY subsidy eligibility, then confirm acceptance.',
      fields: [
        { name: 'sanctionAccepted', label: 'Sanction Acceptance', type: 'checkbox', placeholder: 'Customer accepts the sanction offer and terms' },
      ],
      schema: z.object({ sanctionAccepted: consentSchema }),
    },
    {
      id: 'bank-details',
      title: 'Bank Details',
      subtitle: 'Disbursal account',
      icon: 'wallet-outline',
      fields: [
        { name: 'accountHolderName', label: 'Account Holder Name', type: 'text', placeholder: 'Sunita Rao' },
        { name: 'accountNumber', label: 'Account Number', type: 'number', placeholder: 'Account number' },
        { name: 'ifsc', label: 'IFSC Code', type: 'text', placeholder: 'ICIC0001234', autoCapitalize: 'characters' },
        { name: 'bankName', label: 'Bank Name', type: 'text', placeholder: 'ICICI Bank' },
      ],
      schema: z.object({
        accountHolderName: nameSchema,
        accountNumber: accountNumberSchema,
        ifsc: ifscSchema,
        bankName: requiredText('Bank name'),
      }),
    },
    {
      id: 'esign',
      title: 'E-Sign',
      subtitle: 'Digital signature',
      icon: 'create-outline',
      note: 'The applicant (and co-applicant, if any) e-sign the loan agreement via Aadhaar OTP.',
      fields: [
        { name: 'esignConsent', label: 'E-Sign Consent', type: 'checkbox', placeholder: 'Applicant consents to electronically signing the agreement' },
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
        { name: 'declaration', label: 'Declaration', type: 'checkbox', placeholder: 'I confirm all details and documents were collected with the customer’s consent' },
      ],
      schema: z.object({ declaration: consentSchema }),
    },
  ],
};
