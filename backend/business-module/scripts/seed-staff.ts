// scripts/seed-staff.ts
//
// Seeds the staff (admin_users) + branches for the web dashboard.
// Idempotent — safe to run repeatedly (upserts by email).
//
// Demo accounts mirror webdash/src/data/mock.ts so the existing login UI works:
//   Admin           → username "admin"      / password "admin@123"
//   Credit  CDL     → phone 9810012001  (OTP login)
//   Credit  Gold    → phone 9810012002  (OTP login)
//   Credit  Housing → phone 9810012003  (OTP login)
//   Finance CDL     → phone 9820013001  (OTP login)
//   Finance Gold    → phone 9820013002  (OTP login)
//   Finance Housing → phone 9820013003  (OTP login)
//
// Run: npx ts-node -r tsconfig-paths/register scripts/seed-staff.ts

import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { STAFF_ROLE, type StaffRole } from '@/constants/staffRoles.constants';

const ADMIN_PASSWORD = 'admin@123'; // demo only — change in production

interface SeedStaff {
    full_name: string;
    phone: string;
    email: string;
    role: StaffRole;
}

const OTP_STAFF: SeedStaff[] = [
    { full_name: 'Credit Officer — Consumer Durable', phone: '9810012001', email: 'credit.cdl@fuehrernbfc.in',     role: STAFF_ROLE.CREDIT_CDL },
    { full_name: 'Credit Officer — Gold',             phone: '9810012002', email: 'credit.gold@fuehrernbfc.in',    role: STAFF_ROLE.CREDIT_GOLD },
    { full_name: 'Credit Officer — Housing',          phone: '9810012003', email: 'credit.housing@fuehrernbfc.in', role: STAFF_ROLE.CREDIT_HOUSING },
    { full_name: 'Finance Officer — Consumer Durable',phone: '9820013001', email: 'finance.cdl@fuehrernbfc.in',    role: STAFF_ROLE.FINANCE_CDL },
    { full_name: 'Finance Officer — Gold',            phone: '9820013002', email: 'finance.gold@fuehrernbfc.in',   role: STAFF_ROLE.FINANCE_GOLD },
    { full_name: 'Finance Officer — Housing',         phone: '9820013003', email: 'finance.housing@fuehrernbfc.in',role: STAFF_ROLE.FINANCE_HOUSING },
];

async function main(): Promise<void> {
    // ── 1. Branch ────────────────────────────────────────────────────────────
    const branch = await prisma.branches.upsert({
        where: { name: 'Head Office — Mumbai' },
        update: {},
        create: { name: 'Head Office — Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    });
    console.log(`Branch ready: ${branch.name} (${branch.id})`);

    // ── 2. Admin (username + password) ────────────────────────────────────────
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await prisma.admin_users.upsert({
        where: { email: 'admin@fuehrernbfc.in' },
        update: {
            username: 'admin',
            password_hash: passwordHash,
            role: STAFF_ROLE.ADMIN,
            status: 'ACTIVE',
            branch_id: branch.id,
        },
        create: {
            full_name: 'System Administrator',
            username: 'admin',
            email: 'admin@fuehrernbfc.in',
            phone: '9999900000',
            role: STAFF_ROLE.ADMIN,
            status: 'ACTIVE',
            password_hash: passwordHash,
            branch_id: branch.id,
        },
    });
    console.log(`Admin ready: username "admin" / password "${ADMIN_PASSWORD}" (${admin.id})`);

    // ── 3. Credit + Finance demo staff (OTP-only, no password) ─────────────────
    for (const s of OTP_STAFF) {
        await prisma.admin_users.upsert({
            where: { email: s.email },
            update: { full_name: s.full_name, phone: s.phone, role: s.role, status: 'ACTIVE', branch_id: branch.id },
            create: {
                full_name: s.full_name,
                email: s.email,
                phone: s.phone,
                role: s.role,
                status: 'ACTIVE',
                branch_id: branch.id,
            },
        });
        console.log(`Staff ready: ${s.role} → ${s.phone}`);
    }

    console.log('\n✅ Staff seed complete.');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
        console.error('❌ Staff seed failed:', err);
        await prisma.$disconnect();
        process.exit(1);
    });
