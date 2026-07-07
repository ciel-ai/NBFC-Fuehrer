// Seeds one sales agent per product for local testing.
// Run with: node scripts/seed.js
//
// Sales agents are normally created by admin; this script gives the mobile
// app real agent phones to log in with during development.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const agents = [
  { phone: '9000000001', role: 'SALES_CDL', name: 'Ravi Kumar', product: 'cdl', branch: 'Chennai Central', fdoCode: 'FSA-001' },
  { phone: '9000000002', role: 'SALES_GOLD', name: 'Meena Devi', product: 'gold', branch: 'Chennai North', fdoCode: 'FSA-002' },
  { phone: '9000000003', role: 'SALES_HOUSING', name: 'Arjun Nair', product: 'housing', branch: 'Chennai South', fdoCode: 'FSA-003' },
];

async function main() {
  for (const a of agents) {
    const user = await prisma.user.upsert({
      where: { phone: a.phone },
      update: { role: a.role, name: a.name, kycStatus: 'verified' },
      create: { phone: a.phone, role: a.role, name: a.name, kycStatus: 'verified' },
    });

    await prisma.salesAgent.upsert({
      where: { userId: user.id },
      update: { product: a.product, branch: a.branch, fdoCode: a.fdoCode, name: a.name },
      create: { userId: user.id, product: a.product, branch: a.branch, fdoCode: a.fdoCode, name: a.name },
    });

    console.log(`Seeded agent: ${a.name} (${a.phone}) — ${a.role}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
