// src/constants/staffRoles.constants.ts
//
// Staff (web dashboard) roles — SEPARATE from the customer/agent ROLE enum in
// config/constants.ts. These power the admin web dashboard and the loan-type
// scoping rules. Sales staff are provisioned here but sign in only on the
// React Native mobile app — the web dashboard rejects their login.
//
// This mirrors the frontend contract in webdash/src/auth/rbac.ts exactly.
// Keep the two in sync — they are the same RBAC model on both sides.

// ─── Staff roles ────────────────────────────────────────────────────────────

export const STAFF_ROLE = {
    ADMIN: 'ADMIN',
    CREDIT_CDL: 'CREDIT_CDL',
    CREDIT_GOLD: 'CREDIT_GOLD',
    CREDIT_HOUSING: 'CREDIT_HOUSING',
    FINANCE_CDL: 'FINANCE_CDL',
    FINANCE_GOLD: 'FINANCE_GOLD',
    FINANCE_HOUSING: 'FINANCE_HOUSING',
    SALES_CDL: 'SALES_CDL',
    SALES_GOLD: 'SALES_GOLD',
    SALES_HOUSING: 'SALES_HOUSING',
} as const;

export type StaffRole = (typeof STAFF_ROLE)[keyof typeof STAFF_ROLE];

export const ALL_STAFF_ROLES: StaffRole[] = Object.values(STAFF_ROLE);

// ─── Families & loan-type scope ───────────────────────────────────────────────

export type RoleFamily = 'ADMIN' | 'CREDIT' | 'FINANCE' | 'SALES';
export type LoanTypeScope = 'CDL' | 'GOLD' | 'HOUSING';

// ─── Web dashboard module keys ─────────────────────────────────────────────────

export type ModuleKey =
    | 'dashboard'
    | 'applications'
    | 'credit'
    | 'finance'
    | 'lms'
    | 'collections'
    | 'reports'
    | 'users'
    | 'audit'
    | 'settings';

interface StaffRoleMeta {
    label: string;
    family: RoleFamily;
    loanType?: LoanTypeScope;   // undefined for ADMIN (sees all loan types)
    modules: ModuleKey[];       // web modules this role may access
    webLogin: boolean;          // false for SALES_* — they use the mobile app only
}

const CREDIT_MODULES: ModuleKey[] = ['dashboard', 'applications', 'credit', 'reports'];
const FINANCE_MODULES: ModuleKey[] = ['dashboard', 'applications', 'finance', 'lms', 'reports'];
const ALL_MODULES: ModuleKey[] = [
    'dashboard', 'applications', 'credit', 'finance', 'lms',
    'collections', 'reports', 'users', 'audit', 'settings',
];

export const STAFF_ROLE_META: Record<StaffRole, StaffRoleMeta> = {
    ADMIN:          { label: 'Administrator',                family: 'ADMIN',   modules: ALL_MODULES,     webLogin: true },
    CREDIT_CDL:     { label: 'Credit · Consumer Durable',    family: 'CREDIT',  loanType: 'CDL',     modules: CREDIT_MODULES,  webLogin: true },
    CREDIT_GOLD:    { label: 'Credit · Gold Loans',          family: 'CREDIT',  loanType: 'GOLD',    modules: CREDIT_MODULES,  webLogin: true },
    CREDIT_HOUSING: { label: 'Credit · Affordable Housing',  family: 'CREDIT',  loanType: 'HOUSING', modules: CREDIT_MODULES,  webLogin: true },
    FINANCE_CDL:    { label: 'Finance · Consumer Durable',   family: 'FINANCE', loanType: 'CDL',     modules: FINANCE_MODULES, webLogin: true },
    FINANCE_GOLD:   { label: 'Finance · Gold Loans',         family: 'FINANCE', loanType: 'GOLD',    modules: FINANCE_MODULES, webLogin: true },
    FINANCE_HOUSING:{ label: 'Finance · Affordable Housing', family: 'FINANCE', loanType: 'HOUSING', modules: FINANCE_MODULES, webLogin: true },
    SALES_CDL:      { label: 'Sales · Consumer Durable',     family: 'SALES',   loanType: 'CDL',     modules: [],              webLogin: false },
    SALES_GOLD:     { label: 'Sales · Gold Loans',           family: 'SALES',   loanType: 'GOLD',    modules: [],              webLogin: false },
    SALES_HOUSING:  { label: 'Sales · Affordable Housing',   family: 'SALES',   loanType: 'HOUSING', modules: [],              webLogin: false },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function isStaffRole(value: string): value is StaffRole {
    return (ALL_STAFF_ROLES as string[]).includes(value);
}

export function roleFamily(role: StaffRole): RoleFamily {
    return STAFF_ROLE_META[role].family;
}

/** Loan-type the role is scoped to; undefined = sees all types (ADMIN). */
export function scopedLoanType(role: StaffRole): LoanTypeScope | undefined {
    return STAFF_ROLE_META[role].loanType;
}

export function canAccess(role: StaffRole, module: ModuleKey): boolean {
    return STAFF_ROLE_META[role].modules.includes(module);
}

/** True if the role is allowed to sign in on the web dashboard. */
export function canWebLogin(role: StaffRole): boolean {
    return STAFF_ROLE_META[role].webLogin;
}
