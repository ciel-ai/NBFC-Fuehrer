// src/utils/statusMap.ts
//
// Maps backend LOAN_STATUS values to the Admin Panel's display statuses.
// Backend uses RBI-standard terminology; frontend uses workflow-oriented labels.

export type BackendLoanStatus =
  | 'DRAFT'
  | 'KYC_PENDING'
  | 'KYC_REJECTED'
  | 'UNDERWRITING'
  | 'APPOINTMENT_BOOKED'
  | 'APPRAISAL_PENDING'
  | 'PROPERTY_ASSESSMENT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESIGN_PENDING'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'CLOSED'
  | 'NPA'
  | 'WRITTEN_OFF';

export type FrontendAppStatus =
  | 'SUBMITTED'
  | 'CREDIT_PENDING'
  | 'CREDIT_APPROVED'
  | 'CREDIT_REJECTED'
  | 'CREDIT_RETURNED'
  | 'FINANCE_PENDING'
  | 'EMANDATE_PENDING'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'NPA'
  | 'CLOSED';

// Backend → Frontend display status
export const toDisplayStatus = (status: BackendLoanStatus): FrontendAppStatus => {
  const map: Record<BackendLoanStatus, FrontendAppStatus> = {
    DRAFT:               'SUBMITTED',
    KYC_PENDING:         'SUBMITTED',
    KYC_REJECTED:        'CREDIT_REJECTED',
    UNDERWRITING:        'CREDIT_PENDING',
    APPOINTMENT_BOOKED:  'CREDIT_PENDING',
    APPRAISAL_PENDING:   'CREDIT_PENDING',
    PROPERTY_ASSESSMENT: 'CREDIT_PENDING',
    PENDING_APPROVAL:    'CREDIT_PENDING',
    APPROVED:            'CREDIT_APPROVED',
    REJECTED:            'CREDIT_REJECTED',
    ESIGN_PENDING:       'FINANCE_PENDING',
    DISBURSED:           'DISBURSED',
    ACTIVE:              'ACTIVE',
    CLOSED:              'CLOSED',
    // NPA is a non-performing (defaulted) loan — a materially different, serious
    // state. It must never render as a healthy 'ACTIVE' loan; staff need to see
    // it apart in the list.
    NPA:                 'NPA',
    WRITTEN_OFF:         'CLOSED',
  };
  return map[status] ?? 'SUBMITTED';
};

// Frontend display status → backend status (for filtering API calls)
export const toBackendStatus = (status: FrontendAppStatus): BackendLoanStatus[] => {
  const map: Record<FrontendAppStatus, BackendLoanStatus[]> = {
    SUBMITTED:       ['DRAFT', 'KYC_PENDING'],
    CREDIT_PENDING:  ['UNDERWRITING', 'PENDING_APPROVAL', 'APPOINTMENT_BOOKED', 'APPRAISAL_PENDING', 'PROPERTY_ASSESSMENT'],
    CREDIT_APPROVED: ['APPROVED'],
    CREDIT_REJECTED: ['REJECTED', 'KYC_REJECTED'],
    CREDIT_RETURNED: ['PENDING_APPROVAL'],
    FINANCE_PENDING: ['ESIGN_PENDING'],
    EMANDATE_PENDING: ['ESIGN_PENDING'],
    DISBURSED:       ['DISBURSED'],
    ACTIVE:          ['ACTIVE'],
    NPA:             ['NPA'],
    CLOSED:          ['CLOSED', 'WRITTEN_OFF'],
  };
  return map[status] ?? [];
};

// Human-readable labels for backend statuses
export const statusLabel: Record<BackendLoanStatus, string> = {
  DRAFT:               'Draft',
  KYC_PENDING:         'KYC Pending',
  KYC_REJECTED:        'KYC Rejected',
  UNDERWRITING:        'Under Review',
  APPOINTMENT_BOOKED:  'Appointment Booked',
  APPRAISAL_PENDING:   'Appraisal Pending',
  PROPERTY_ASSESSMENT: 'Property Assessment',
  PENDING_APPROVAL:    'Pending Approval',
  APPROVED:            'Approved',
  REJECTED:            'Rejected',
  ESIGN_PENDING:       'eSign Pending',
  DISBURSED:           'Disbursed',
  ACTIVE:              'Active',
  CLOSED:              'Closed',
  NPA:                 'NPA',
  WRITTEN_OFF:         'Written Off',
};