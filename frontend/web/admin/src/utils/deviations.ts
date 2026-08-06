import { roleFamily } from '../auth/rbac';
import type { Deviation, DeviationSeverity, LoanApplication, Role } from '../types';

// ─── Policy caps / floors (mock — a real build reads these from ProductConfig) ─
const LTV_CAP_GOLD = 75; // %
const LTV_CAP_HOUSING = 90; // %
const LTV_NEAR_BAND = 3; // pts below cap that still trips an L1 warning
const BUREAU_FLOOR = 650;
const PAN_MATCH_MIN = 90; // %

/**
 * Auto-derives the policy deviations for an application, mirroring the backend
 * derivation on appraisal-save / credit-decision-submit (see
 * docs/GOLD_LOAN_S4_API_CONTRACTS.md §2). Deterministic and idempotent: ids are
 * keyed by application + code so re-deriving never duplicates.
 */
export function deriveDeviations(app: LoanApplication): Deviation[] {
  const out: Deviation[] = [];
  const createdAt = app.updatedAt || app.createdAt || new Date().toISOString();

  const mk = (
    code: string,
    category: Deviation['category'],
    severity: DeviationSeverity,
    description: string,
  ): Deviation => ({
    id: `dev_${app.id}_${code}`,
    code,
    category,
    severity,
    description,
    raisedBy: 'SYSTEM',
    status: 'OPEN',
    createdAt,
  });

  // LTV vs product cap
  const gold = app.collateral?.gold;
  const property = app.collateral?.property;
  const ltv = gold?.ltv ?? property?.ltv;
  const cap = gold ? LTV_CAP_GOLD : property ? LTV_CAP_HOUSING : undefined;
  if (ltv != null && cap != null) {
    if (ltv > cap) {
      out.push(mk('LTV_ABOVE_CAP', 'LTV', 'L2', `LTV ${ltv}% exceeds the ${cap}% policy cap`));
    } else if (ltv >= cap - LTV_NEAR_BAND) {
      out.push(mk('LTV_NEAR_CAP', 'LTV', 'L1', `LTV ${ltv}% is within ${LTV_NEAR_BAND} pts of the ${cap}% cap`));
    }
  }

  // PAN name-match
  const panMatch = app.kyc.panNameMatch;
  if (panMatch != null && panMatch < PAN_MATCH_MIN) {
    out.push(mk('PAN_NAME_MISMATCH', 'KYC', 'L1', `PAN name match ${panMatch}% is below the ${PAN_MATCH_MIN}% threshold`));
  }

  // Bureau below floor
  if (app.bureau.score < BUREAU_FLOOR) {
    out.push(mk('BUREAU_BELOW_FLOOR', 'BUREAU', 'L2', `Bureau score ${app.bureau.score} is below the ${BUREAU_FLOOR} policy floor`));
  }

  // Unverified documents at decision time
  const unverified = app.documents.filter((d) => d.status !== 'VERIFIED');
  if (unverified.length > 0) {
    out.push(mk('DOC_UNVERIFIED_AT_DECISION', 'DOCUMENT', 'L1', `${unverified.length} document(s) not VERIFIED at decision time`));
  }

  return out;
}

/** OPEN deviations block an APPROVED credit decision (the 409 gate). */
export function openDeviations(deviations: Deviation[] | undefined): Deviation[] {
  return (deviations ?? []).filter((d) => d.status === 'OPEN');
}

/**
 * True when an APPROVED decision must be refused because policy exceptions are
 * still open. Mirrors the guard in CreditDecisionDrawer.tsx (and the server's
 * 409 OPEN_DEVIATIONS) — REJECTED and RETURNED are never blocked, because
 * declining an out-of-policy case needs no exception approval.
 */
export function isApprovalBlocked(
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED',
  deviations: Deviation[] | undefined,
): boolean {
  return decision === 'APPROVED' && openDeviations(deviations).length > 0;
}

/**
 * The L1 deviation auto-raised when a verification (TVR or CPV) is waived, so
 * the four-eyes gate still forces an explicit credit decision on the step that
 * was skipped. `id` and `createdAt` are injected to keep this pure.
 *
 * Extracted verbatim from the identical inline blocks in appStore.waiveTvr /
 * waiveCpv — behaviour unchanged, but now assertable.
 */
export function buildWaiverDeviation(
  kind: 'TVR' | 'CPV',
  remarks: string,
  raisedBy: string,
  id: string,
  createdAt: string,
): Deviation {
  return {
    id,
    code: `${kind}_WAIVED`,
    category: 'OTHER',
    severity: 'L1',
    description: `${kind} waived — ${remarks}`,
    raisedBy,
    status: 'OPEN',
    createdAt,
  };
}

/**
 * Who may decide a deviation (Sprint-4 §2): L1 → Branch Manager and above;
 * L2 → Credit Manager / Admin only. Branch Manager sits inside the CREDIT
 * family but is capped at L1.
 */
export function canDecideDeviation(role: Role, severity: DeviationSeverity): boolean {
  const family = roleFamily(role);
  if (family === 'ADMIN') return true;
  if (family !== 'CREDIT') return false;
  // Within credit: BM handles L1 only; credit managers/officers handle both.
  if (severity === 'L2') return role !== 'BRANCH_MANAGER';
  return true;
}
