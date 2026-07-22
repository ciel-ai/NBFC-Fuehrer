// scripts/seed-permissions.ts
//
// Seeds the RBAC permission model (roles + role_permissions) introduced in
// 04b6702. Idempotent — safe to re-run on any dev machine; mirrors the
// module access map the web portal enforces (auth/rbac.ts) so the stored
// rulebook and the UI agree.
//
// Run: DATABASE_URL=... npx tsx scripts/seed-permissions.ts

import { PrismaClient } from '@prisma/client';
import { assertNotProduction } from './_seedGuard';

assertNotProduction('seed-permissions.ts');

const prisma = new PrismaClient();

// module → [actions] granted per role. READ = see the module,
// WRITE = perform its state-changing actions.
type Grant = Record<string, string[]>;

const RW = ['READ', 'WRITE'];
const R = ['READ'];

const CREDIT_GRANTS: Grant = {
  dashboard: R, applications: RW, customers: R, appraisals: RW, credit: RW, reports: R,
};
const FINANCE_GRANTS: Grant = {
  dashboard: R, applications: R, customers: R, finance: RW, lms: RW, reports: R,
};
const SALES_GRANTS: Grant = {
  sales: RW, kyc: RW,
};
const ALL_MODULES = [
  'dashboard', 'applications', 'customers', 'appraisals', 'credit', 'finance',
  'lms', 'collections', 'reports', 'agents', 'branches', 'users', 'audit',
  'settings', 'permissions',
];
const ADMIN_GRANTS: Grant = Object.fromEntries(ALL_MODULES.map((m) => [m, RW]));

const ROLES: Array<{ name: string; label: string; description: string; grants: Grant }> = [
  { name: 'SUPER_ADMIN', label: 'Super Admin', description: 'Unrestricted platform administrator', grants: ADMIN_GRANTS },
  { name: 'ADMIN', label: 'Administrator', description: 'Web portal administrator (all modules)', grants: ADMIN_GRANTS },
  { name: 'CREDIT_MANAGER', label: 'Credit Manager', description: 'Credit decisioning across products', grants: CREDIT_GRANTS },
  { name: 'CREDIT_CDL', label: 'Credit · Consumer Durable', description: 'Credit team, CDL portfolio', grants: CREDIT_GRANTS },
  { name: 'CREDIT_GOLD', label: 'Credit · Gold Loans', description: 'Credit team, gold portfolio', grants: CREDIT_GRANTS },
  { name: 'CREDIT_HOUSING', label: 'Credit · Affordable Housing', description: 'Credit team, housing portfolio', grants: CREDIT_GRANTS },
  { name: 'FINANCE', label: 'Finance', description: 'Disbursement and servicing across products', grants: FINANCE_GRANTS },
  { name: 'FINANCE_CDL', label: 'Finance · Consumer Durable', description: 'Finance team, CDL portfolio', grants: FINANCE_GRANTS },
  { name: 'FINANCE_GOLD', label: 'Finance · Gold Loans', description: 'Finance team, gold portfolio', grants: FINANCE_GRANTS },
  { name: 'FINANCE_HOUSING', label: 'Finance · Affordable Housing', description: 'Finance team, housing portfolio', grants: FINANCE_GRANTS },
  { name: 'OPS_EXECUTIVE', label: 'Ops Executive', description: 'Operations: applications, customers, appraisals', grants: { dashboard: R, applications: RW, customers: RW, appraisals: RW, reports: R } },
  { name: 'COLLECTION_AGENT', label: 'Collections Agent', description: 'Collections queue and recovery', grants: { dashboard: R, collections: RW, lms: R, reports: R } },
  { name: 'SALES_CDL', label: 'Sales · Consumer Durable', description: 'Field sales, mobile app only', grants: SALES_GRANTS },
  { name: 'SALES_GOLD', label: 'Sales · Gold Loans', description: 'Field sales, mobile app only', grants: SALES_GRANTS },
  { name: 'SALES_HOUSING', label: 'Sales · Affordable Housing', description: 'Field sales, mobile app only', grants: SALES_GRANTS },
  { name: 'CUSTOMER', label: 'Customer', description: 'End borrower, mobile app', grants: { loans: RW, kyc: RW, payments: RW } },
  { name: 'AGENT', label: 'Field Agent', description: 'Store agent sourcing applications', grants: { loans: RW, kyc: RW } },
];

async function main(): Promise<void> {
  let grants = 0;
  for (const r of ROLES) {
    await prisma.roles.upsert({
      where: { name: r.name },
      update: { label: r.label, description: r.description },
      create: { name: r.name, label: r.label, description: r.description },
    });
    for (const [module, actions] of Object.entries(r.grants)) {
      for (const action of actions) {
        await prisma.role_permissions.upsert({
          where: { role_name_module_action: { role_name: r.name, module, action } },
          update: { is_active: true },
          create: { role_name: r.name, module, action },
        });
        grants += 1;
      }
    }
  }
  const [roles, perms] = await Promise.all([
    prisma.roles.count(), prisma.role_permissions.count(),
  ]);
  console.log(`Seeded: ${roles} roles, ${perms} permission grants (${grants} touched)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
