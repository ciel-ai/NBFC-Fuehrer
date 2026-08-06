import type { LoanType, Role } from '../types';

export type ModuleKey =
  | 'dashboard'
  | 'applications'
  | 'customers'
  | 'appraisals'
  | 'credit'
  | 'finance'
  | 'lms'
  | 'collections'
  | 'reports'
  | 'agents'
  | 'branches'
  | 'users'
  | 'approvals'
  | 'permissions'
  | 'audit'
  | 'settings';

export type RoleFamily = 'ADMIN' | 'CREDIT' | 'FINANCE' | 'SALES';

interface RoleMeta {
  label: string;
  short: string;
  family: RoleFamily;
  loanType?: LoanType;
  modules: ModuleKey[];
}

const CREDIT_MODULES: ModuleKey[] = [
  'dashboard',
  'applications',
  'customers',
  'appraisals',
  'credit',
  'approvals',
  'reports',
];
const FINANCE_MODULES: ModuleKey[] = [
  'dashboard',
  'applications',
  'customers',
  'finance',
  'lms',
  'reports',
];
const ALL_MODULES: ModuleKey[] = [
  'dashboard',
  'applications',
  'customers',
  'appraisals',
  'credit',
  'finance',
  'lms',
  'collections',
  'reports',
  'agents',
  'branches',
  'users',
  'approvals',
  'permissions',
  'audit',
  'settings',
];

export const ROLE_META: Record<Role, RoleMeta> = {
  ADMIN: { label: 'Administrator', short: 'Admin', family: 'ADMIN', modules: ALL_MODULES },
  CREDIT_CDL: {
    label: 'Credit · Consumer Durable',
    short: 'Credit CDL',
    family: 'CREDIT',
    loanType: 'CDL',
    modules: CREDIT_MODULES,
  },
  CREDIT_GOLD: {
    label: 'Credit · Gold Loans',
    short: 'Credit Gold',
    family: 'CREDIT',
    loanType: 'GOLD',
    modules: CREDIT_MODULES,
  },
  CREDIT_HOUSING: {
    label: 'Credit · Affordable Housing',
    short: 'Credit Housing',
    family: 'CREDIT',
    loanType: 'HOUSING',
    modules: CREDIT_MODULES,
  },
  FINANCE_CDL: {
    label: 'Finance · Consumer Durable',
    short: 'Finance CDL',
    family: 'FINANCE',
    loanType: 'CDL',
    modules: FINANCE_MODULES,
  },
  FINANCE_GOLD: {
    label: 'Finance · Gold Loans',
    short: 'Finance Gold',
    family: 'FINANCE',
    loanType: 'GOLD',
    modules: FINANCE_MODULES,
  },
  FINANCE_HOUSING: {
    label: 'Finance · Affordable Housing',
    short: 'Finance Housing',
    family: 'FINANCE',
    loanType: 'HOUSING',
    modules: FINANCE_MODULES,
  },
  // Mobile-app-only roles: zero web modules, credentials managed by Admin.
  SALES_CDL: {
    label: 'Sales · Consumer Durable',
    short: 'Sales CDL',
    family: 'SALES',
    loanType: 'CDL',
    modules: [],
  },
  SALES_GOLD: {
    label: 'Sales · Gold Loans',
    short: 'Sales Gold',
    family: 'SALES',
    loanType: 'GOLD',
    modules: [],
  },
  SALES_HOUSING: {
    label: 'Sales · Affordable Housing',
    short: 'Sales Housing',
    family: 'SALES',
    loanType: 'HOUSING',
    modules: [],
  },
  // ── Backend role aliases (returned by the API). Not loan-type scoped → see all products.
  //    Review the module/family mapping to match your backend's intended permissions. ──
  SUPER_ADMIN: {
    label: 'Super Admin',
    short: 'Super Admin',
    family: 'ADMIN',
    modules: ALL_MODULES,
  },
  CREDIT_MANAGER: {
    label: 'Credit Manager',
    short: 'Credit Mgr',
    family: 'CREDIT',
    modules: CREDIT_MODULES,
  },
  // Branch-scoped (backend honours a `branch_id` claim on queue endpoints).
  // Decides L1 deviations and is the checker for BM sanctions. Sees all
  // products within its own branch.
  BRANCH_MANAGER: {
    label: 'Branch Manager',
    short: 'Branch Mgr',
    family: 'CREDIT',
    modules: CREDIT_MODULES,
  },
  OPS_EXECUTIVE: {
    label: 'Ops Executive',
    short: 'Ops',
    family: 'CREDIT',
    modules: ['dashboard', 'applications', 'customers', 'appraisals', 'reports'],
  },
  FINANCE: { label: 'Finance', short: 'Finance', family: 'FINANCE', modules: FINANCE_MODULES },
  COLLECTION_AGENT: {
    label: 'Collections Agent',
    short: 'Collections',
    family: 'FINANCE',
    modules: ['dashboard', 'collections', 'lms', 'reports'],
  },
  AGENT: { label: 'Field Agent', short: 'Agent', family: 'SALES', modules: [] },
};

export const canAccess = (role: Role, module: ModuleKey): boolean =>
  ROLE_META[role].modules.includes(module);

/** Loan-type scope for the role; undefined = sees all types (admin). */
export const scopedLoanType = (role: Role): LoanType | undefined => ROLE_META[role].loanType;

export const roleFamily = (role: Role): RoleFamily => ROLE_META[role].family;

/**
 * Is this an administrator?
 *
 * ALWAYS use this instead of `role === 'ADMIN'`. The API issues SUPER_ADMIN as
 * well, which is an admin in every respect — comparing against the literal string
 * silently excluded them, and did so in four separate places: it crashed the
 * dashboard, hid every report from the sidebar, and hid the entire finance panel
 * on an application they were supposed to be able to action.
 */
export const isAdmin = (role: Role): boolean => ROLE_META[role].family === 'ADMIN';

/* Colour for a loan type is NOT declared here — it is a presentation concern and
   lives with the tokens (see theme/tokens.ts `chart`, and StatusTag.css
   `.type-tag--*`). This map holds copy only. */
export const LOAN_TYPE_META: Record<LoanType, { label: string; short: string }> = {
  CDL: { label: 'Consumer Durable Loan', short: 'CDL' },
  GOLD: { label: 'Gold Loan', short: 'Gold' },
  HOUSING: { label: 'Affordable Housing', short: 'Housing' },
};
