import { roleFamily } from '../auth/rbac';
import type {
  CpvVerificationStatus,
  LoanApplication,
  Role,
  TvrChecklistItem,
  VerificationStatus,
} from '../types';

/**
 * Fixed, versioned TVR question set (Sprint-4 §3). New records start from this
 * template; the officer records an answer per line during the call.
 */
export const TVR_CHECKLIST: Omit<TvrChecklistItem, 'answer'>[] = [
  { key: 'identity_confirmed', label: 'Identity confirmed' },
  { key: 'loan_awareness', label: 'Aware of the loan & terms' },
  { key: 'gold_ownership', label: 'Confirms ownership of the collateral' },
  { key: 'employment_confirmed', label: 'Employment / income confirmed' },
];

/** Roll-up shown on the application: waiver wins, else the latest attempt. */
export function tvrStatus(app: LoanApplication): VerificationStatus {
  if (app.tvrWaiver) return 'WAIVED';
  const latest = app.tvr?.[0];
  if (!latest) return 'PENDING';
  return latest.outcome; // POSITIVE | NEGATIVE | INCONCLUSIVE
}

export function cpvStatus(app: LoanApplication): CpvVerificationStatus {
  if (app.cpvWaiver) return 'WAIVED';
  const latest = app.cpv?.[0];
  if (!latest) return 'PENDING';
  // CPV outcomes fold onto the shared status vocabulary.
  return latest.outcome === 'POSITIVE'
    ? 'POSITIVE'
    : latest.outcome === 'NEGATIVE'
      ? 'NEGATIVE'
      : 'INCONCLUSIVE';
}

/** Waiving a verification is a Credit-Manager / Admin call (Sprint-4 §3/§4). */
export function canWaiveVerification(role: Role): boolean {
  const family = roleFamily(role);
  return family === 'CREDIT' || family === 'ADMIN';
}
