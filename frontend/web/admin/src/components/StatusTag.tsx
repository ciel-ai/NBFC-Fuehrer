import React from 'react';
import type { RiskGrade } from '../types';
import { LOAN_TYPE_META } from '../auth/rbac';
import type { LoanType } from '../types';

interface Meta { label: string; color: string; bg: string }

const META: Record<string, Meta> = {
  // application statuses
  SUBMITTED: { label: 'Submitted', color: '#0284c7', bg: '#eef3f9' },
  CREDIT_PENDING: { label: 'Credit Pending', color: '#b26a00', bg: '#fdf6ea' },
  CREDIT_APPROVED: { label: 'Credit Approved', color: '#1d7a46', bg: '#eef7f1' },
  CREDIT_REJECTED: { label: 'Credit Rejected', color: '#c0392b', bg: '#fbeeec' },
  CREDIT_RETURNED: { label: 'Returned', color: '#6d4ea8', bg: '#f3effa' },
  FINANCE_PENDING: { label: 'Finance Pending', color: '#3949ab', bg: '#eef0fa' },
  EMANDATE_PENDING: { label: 'E-Mandate Pending', color: '#0e7490', bg: '#e9f5f7' },
  DISBURSED: { label: 'Disbursed', color: '#0f766e', bg: '#e9f5f4' },
  ACTIVE: { label: 'Active', color: '#1d7a46', bg: '#eef7f1' },
  CLOSED: { label: 'Closed', color: '#5a6675', bg: '#eef1f5' },
  // loan account
  OVERDUE: { label: 'Overdue', color: '#c2410c', bg: '#fbf0e9' },
  NPA: { label: 'NPA', color: '#a32219', bg: '#fbeeec' },
  // docs
  VERIFIED: { label: 'Verified', color: '#1d7a46', bg: '#eef7f1' },
  PENDING: { label: 'Pending', color: '#b26a00', bg: '#fdf6ea' },
  REJECTED: { label: 'Rejected', color: '#c0392b', bg: '#fbeeec' },
  // payments
  SUCCESS: { label: 'Success', color: '#1d7a46', bg: '#eef7f1' },
  BOUNCED: { label: 'Bounced', color: '#c0392b', bg: '#fbeeec' },
  // emandate
  NOT_SETUP: { label: 'Not Setup', color: '#5a6675', bg: '#eef1f5' },
  FAILED: { label: 'Failed', color: '#c0392b', bg: '#fbeeec' },
  // emi
  PAID: { label: 'Paid', color: '#1d7a46', bg: '#eef7f1' },
  DUE: { label: 'Due', color: '#0284c7', bg: '#eef3f9' },
  UPCOMING: { label: 'Upcoming', color: '#5a6675', bg: '#f4f6f9' },
  // charges
  UNPAID: { label: 'Unpaid', color: '#c2410c', bg: '#fbf0e9' },
  WAIVED: { label: 'Waived', color: '#6d4ea8', bg: '#f3effa' },
  // users
  INACTIVE: { label: 'Inactive', color: '#5a6675', bg: '#eef1f5' },
  // collections
  NORMAL: { label: 'Normal', color: '#5a6675', bg: '#eef1f5' },
  FOLLOW_UP: { label: 'Follow-up', color: '#b26a00', bg: '#fdf6ea' },
  PTP: { label: 'PTP', color: '#0284c7', bg: '#eef3f9' },
  FIELD_VISIT: { label: 'Field Visit', color: '#0e7490', bg: '#e9f5f7' },
  LEGAL: { label: 'Legal', color: '#a32219', bg: '#fbeeec' },
  // decisions
  APPROVED: { label: 'Approved', color: '#1d7a46', bg: '#eef7f1' },
  RETURNED: { label: 'Returned', color: '#6d4ea8', bg: '#f3effa' },
  COMPLETED: { label: 'Completed', color: '#1d7a46', bg: '#eef7f1' },
  NOT_REQUIRED: { label: 'Not Required', color: '#5a6675', bg: '#eef1f5' },
};

export const statusMeta = (status: string): Meta =>
  META[status] ?? { label: status.replace(/_/g, ' '), color: '#5a6675', bg: '#eef1f5' };

export const StatusTag: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const m = statusMeta(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: size === 'sm' ? '3px 10px' : '4px 13px',
        borderRadius: 999,
        fontSize: size === 'sm' ? 11 : 12.5,
        fontWeight: 600,
        letterSpacing: 0.1,
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

export const LoanTypeTag: React.FC<{ type: LoanType; full?: boolean }> = ({ type, full }) => {
  const m = LOAN_TYPE_META[type];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 11px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {full ? m.label : m.short}
    </span>
  );
};

const GRADE_COLORS: Record<RiskGrade, { color: string; bg: string }> = {
  A: { color: '#047857', bg: '#ecfdf5' },
  B: { color: '#4d7c0f', bg: '#f7fee7' },
  C: { color: '#b45309', bg: '#fffbeb' },
  D: { color: '#b91c1c', bg: '#fef2f2' },
};

export const RiskGradeTag: React.FC<{ grade: RiskGrade }> = ({ grade }) => {
  const c = GRADE_COLORS[grade];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.color}33`,
      }}
    >
      {grade}
    </span>
  );
};

/** Bureau score → band color */
export const scoreColor = (score: number): string =>
  score >= 750 ? '#16a34a' : score >= 700 ? '#65a30d' : score >= 650 ? '#d97706' : '#dc2626';

export const dpdColor = (dpd: number): string =>
  dpd <= 0 ? '#16a34a' : dpd <= 30 ? '#d97706' : dpd <= 90 ? '#ea580c' : '#dc2626';
