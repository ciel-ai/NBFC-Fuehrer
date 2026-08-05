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
  color: string;
  modules: ModuleKey[];
}

const CREDIT_MODULES: ModuleKey[] = ['dashboard', 'applications', 'customers', 'appraisals', 'credit', 'approvals', 'reports'];
const FINANCE_MODULES: ModuleKey[] = ['dashboard', 'applications', 'customers', 'finance', 'lms', 'reports'];
const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'applications', 'customers', 'appraisals', 'credit', 'finance', 'lms',
  'collections', 'reports', 'agents', 'branches', 'users', 'approvals', 'permissions', 'audit', 'settings',
];

export const ROLE_META: Record<Role, RoleMeta> = {
  ADMIN: { label: 'Administrator', short: 'Admin', family: 'ADMIN', color: '#0f2c4f', modules: ALL_MODULES },
  CREDIT_CDL: { label: 'Credit · Consumer Durable', short: 'Credit CDL', family: 'CREDIT', loanType: 'CDL', color: '#b26a00', modules: CREDIT_MODULES },
  CREDIT_GOLD: { label: 'Credit · Gold Loans', short: 'Credit Gold', family: 'CREDIT', loanType: 'GOLD', color: '#b26a00', modules: CREDIT_MODULES },
  CREDIT_HOUSING: { label: 'Credit · Affordable Housing', short: 'Credit Housing', family: 'CREDIT', loanType: 'HOUSING', color: '#b26a00', modules: CREDIT_MODULES },
  FINANCE_CDL: { label: 'Finance · Consumer Durable', short: 'Finance CDL', family: 'FINANCE', loanType: 'CDL', color: '#1d7a46', modules: FINANCE_MODULES },
  FINANCE_GOLD: { label: 'Finance · Gold Loans', short: 'Finance Gold', family: 'FINANCE', loanType: 'GOLD', color: '#1d7a46', modules: FINANCE_MODULES },
  FINANCE_HOUSING: { label: 'Finance · Affordable Housing', short: 'Finance Housing', family: 'FINANCE', loanType: 'HOUSING', color: '#1d7a46', modules: FINANCE_MODULES },
  // Mobile-app-only roles: zero web modules, credentials managed by Admin.
  SALES_CDL: { label: 'Sales · Consumer Durable', short: 'Sales CDL', family: 'SALES', loanType: 'CDL', color: '#0e7490', modules: [] },
  SALES_GOLD: { label: 'Sales · Gold Loans', short: 'Sales Gold', family: 'SALES', loanType: 'GOLD', color: '#0e7490', modules: [] },
  SALES_HOUSING: { label: 'Sales · Affordable Housing', short: 'Sales Housing', family: 'SALES', loanType: 'HOUSING', color: '#0e7490', modules: [] },
  // ── Backend role aliases (returned by the API). Not loan-type scoped → see all products.
  //    Review the module/family mapping to match your backend's intended permissions. ──
  SUPER_ADMIN: { label: 'Super Admin', short: 'Super Admin', family: 'ADMIN', color: '#0f2c4f', modules: ALL_MODULES },
  CREDIT_MANAGER: { label: 'Credit Manager', short: 'Credit Mgr', family: 'CREDIT', color: '#b26a00', modules: CREDIT_MODULES },
  OPS_EXECUTIVE: { label: 'Ops Executive', short: 'Ops', family: 'CREDIT', color: '#0e7490', modules: ['dashboard', 'applications', 'customers', 'appraisals', 'reports'] },
  FINANCE: { label: 'Finance', short: 'Finance', family: 'FINANCE', color: '#1d7a46', modules: FINANCE_MODULES },
  COLLECTION_AGENT: { label: 'Collections Agent', short: 'Collections', family: 'FINANCE', color: '#c0392b', modules: ['dashboard', 'collections', 'lms', 'reports'] },
  AGENT: { label: 'Field Agent', short: 'Agent', family: 'SALES', color: '#0e7490', modules: [] },
};

export const canAccess = (role: Role, module: ModuleKey): boolean =>
  ROLE_META[role].modules.includes(module);

/** Loan-type scope for the role; undefined = sees all types (admin). */
export const scopedLoanType = (role: Role): LoanType | undefined => ROLE_META[role].loanType;

export const roleFamily = (role: Role): RoleFamily => ROLE_META[role].family;

export const LOAN_TYPE_META: Record<LoanType, { label: string; short: string; color: string; bg: string }> = {
  CDL: { label: 'Consumer Durable Loan', short: 'CDL', color: '#0284c7', bg: '#eef3f9' },
  GOLD: { label: 'Gold Loan', short: 'Gold', color: '#b26a00', bg: '#fdf6ea' },
  HOUSING: { label: 'Affordable Housing', short: 'Housing', color: '#6d4ea8', bg: '#f3effa' },
};
