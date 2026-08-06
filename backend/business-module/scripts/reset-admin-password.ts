// scripts/reset-admin-password.ts — one-off, delete after use
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';

const NEW_PASSWORD = 'TestAdmin@123';

async function main() {
    const hash = await bcrypt.hash(NEW_PASSWORD, 10);
    const result = await prisma.admin_users.updateMany({
        where: { username: 'admin' },
        data: { password_hash: hash, role: 'SUPER_ADMIN', status: 'ACTIVE' },
    });
    console.log(`Updated ${result.count} row(s). Login with username "admin" / password "${NEW_PASSWORD}"`);
}

main().finally(() => prisma.$disconnect());