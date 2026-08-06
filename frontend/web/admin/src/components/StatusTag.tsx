import React from 'react';
import { LOAN_TYPE_META, ROLE_META } from '../auth/rbac';
import type { RoleFamily } from '../auth/rbac';
import { status as statusTokens } from '../theme/tokens';
import type { StatusTone } from '../theme/tokens';
import type { LoanType, RiskGrade, Role } from '../types';
import './StatusTag.css';

/* ============================================================================
 * Status signalling.
 *
 * The full status vocabulary of the platform maps onto SEVEN semantic tones.
 * Previously each of the 33 statuses carried its own hand-picked fg/bg hex pair
 * — 66 literals, several of which failed contrast. Now a status declares what
 * it MEANS, and the tone supplies the colour from tokens.
 *
 * Adding a status = one line. Restyling every status = one token.
 * ==========================================================================*/

interface StatusDef {
  label: string;
  tone: StatusTone;
}

const STATUS: Record<string, StatusDef> = {
  /* application pipeline */
  SUBMITTED: { label: 'Submitted', tone: 'info' },
  CREDIT_PENDING: { label: 'Credit Pending', tone: 'warning' },
  CREDIT_APPROVED: { label: 'Credit Approved', tone: 'success' },
  CREDIT_REJECTED: { label: 'Credit Rejected', tone: 'danger' },
  CREDIT_RETURNED: { label: 'Returned', tone: 'violet' },
  FINANCE_PENDING: { label: 'Finance Pending', tone: 'warning' },
  EMANDATE_PENDING: { label: 'E-Mandate Pending', tone: 'warning' },
  DISBURSED: { label: 'Disbursed', tone: 'success' },
  ACTIVE: { label: 'Active', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },

  /* loan account health */
  OVERDUE: { label: 'Overdue', tone: 'overdue' },
  NPA: { label: 'NPA', tone: 'danger' },

  /* documents */
  VERIFIED: { label: 'Verified', tone: 'success' },
  PENDING: { label: 'Pending', tone: 'warning' },
  REJECTED: { label: 'Rejected', tone: 'danger' },

  /* payments */
  SUCCESS: { label: 'Success', tone: 'success' },
  BOUNCED: { label: 'Bounced', tone: 'overdue' },

  /* e-mandate */
  NOT_SETUP: { label: 'Not Setup', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'danger' },

  /* recurring-debit batches and their line items */
  RUNNING: { label: 'Running', tone: 'info' },
  PARTIAL: { label: 'Partial', tone: 'warning' },
  SCHEDULED: { label: 'Scheduled', tone: 'neutral' },
  /* Not a failure yet — a bounce inside its retry window. Distinct on purpose. */
  RETRYING: { label: 'Retrying', tone: 'warning' },

  /* reconciliation breaks */
  MATCHED: { label: 'Matched', tone: 'success' },
  UNMATCHED_IN_BOOK: { label: 'Book only', tone: 'overdue' },
  UNMATCHED_IN_BANK: { label: 'Bank only', tone: 'violet' },
  AMOUNT_MISMATCH: { label: 'Amount mismatch', tone: 'danger' },

  /* EMI */
  PAID: { label: 'Paid', tone: 'success' },
  DUE: { label: 'Due', tone: 'info' },
  UPCOMING: { label: 'Upcoming', tone: 'neutral' },

  /* charges */
  UNPAID: { label: 'Unpaid', tone: 'overdue' },
  WAIVED: { label: 'Waived', tone: 'violet' },

  /* users */
  INACTIVE: { label: 'Inactive', tone: 'neutral' },

  /* collections */
  NORMAL: { label: 'Normal', tone: 'neutral' },
  FOLLOW_UP: { label: 'Follow-up', tone: 'warning' },
  PTP: { label: 'PTP', tone: 'info' },
  FIELD_VISIT: { label: 'Field Visit', tone: 'info' },
  LEGAL: { label: 'Legal', tone: 'danger' },

  /* decisions */
  APPROVED: { label: 'Approved', tone: 'success' },
  RETURNED: { label: 'Returned', tone: 'violet' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  NOT_REQUIRED: { label: 'Not Required', tone: 'neutral' },
};

const FALLBACK: StatusDef = { label: '', tone: 'neutral' };

export const statusMeta = (key: string): StatusDef =>
  STATUS[key] ?? { ...FALLBACK, label: key.replace(/_/g, ' ') };

export const statusTone = (key: string): StatusTone => statusMeta(key).tone;

/**
 * Status pill. A tinted rectangle with a tone dot — not a rounded-full badge.
 * The dot survives greyscale printing and colour-blindness; the fill alone does not.
 */
export const StatusTag: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const m = statusMeta(status);
  return (
    <span className={`status-tag status-tag--${m.tone} status-tag--${size}`}>
      <span className="status-tag__dot" aria-hidden="true" />
      {m.label}
    </span>
  );
};

/** Loan product marker. Reads as a category label, not a decorative chip. */
export const LoanTypeTag: React.FC<{ type: LoanType; full?: boolean }> = ({ type, full }) => {
  const m = LOAN_TYPE_META[type];
  return (
    <span className={`type-tag type-tag--${type.toLowerCase()}`}>{full ? m.label : m.short}</span>
  );
};

/* ── Risk grade ───────────────────────────────────────────────────────────── */

const GRADE_TONE: Record<RiskGrade, StatusTone> = {
  A: 'success',
  B: 'success',
  C: 'warning',
  D: 'danger',
};

export const RiskGradeTag: React.FC<{ grade: RiskGrade }> = ({ grade }) => (
  <span
    className={`grade-tag grade-tag--${GRADE_TONE[grade]}`}
    title={`Risk grade ${grade}`}
    aria-label={`Risk grade ${grade}`}
  >
    {grade}
  </span>
);

/* ── Numeric band colours ─────────────────────────────────────────────────────
 * Bureau score and DPD both map onto the same semantic tones, so a red DPD and
 * a red score are literally the same red. */

export const scoreTone = (score: number): StatusTone =>
  score >= 750 ? 'success' : score >= 700 ? 'info' : score >= 650 ? 'warning' : 'danger';

export const dpdTone = (dpd: number): StatusTone =>
  dpd <= 0 ? 'success' : dpd <= 30 ? 'warning' : dpd <= 90 ? 'overdue' : 'danger';

/* ── Role ────────────────────────────────────────────────────────────────────
 * A role's colour is a function of its FAMILY, nothing more. Four families,
 * four tones — which is why ROLE_META no longer carries a hex per role. */

const FAMILY_TONE: Record<RoleFamily, StatusTone> = {
  ADMIN: 'neutral',
  CREDIT: 'warning',
  FINANCE: 'success',
  SALES: 'info',
};

export const roleTone = (role: Role): StatusTone => FAMILY_TONE[ROLE_META[role].family];

export const RoleTag: React.FC<{ role: Role; short?: boolean }> = ({ role, short }) => (
  <span className={`status-tag status-tag--${roleTone(role)} status-tag--sm`}>
    {short ? ROLE_META[role].short : ROLE_META[role].label}
  </span>
);

/** Resolve a tone to its foreground colour — for charts and inline text. */
export const toneColor = (tone: StatusTone): string => statusTokens[tone].fg;
export const toneTint = (tone: StatusTone): string => statusTokens[tone].tint;

export const scoreColor = (score: number): string => toneColor(scoreTone(score));
export const dpdColor = (dpd: number): string => toneColor(dpdTone(dpd));
