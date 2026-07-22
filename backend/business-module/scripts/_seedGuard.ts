// scripts/_seedGuard.ts
//
// Shared production guard for all seed scripts. Previously none of the 4
// seed scripts (seed-staff, seed-dev, seed-demo-data, seed-permissions) had
// any NODE_ENV or confirmation guard at all, unlike migrate-prod.sh which
// requires both an explicit --confirm-prod flag AND NODE_ENV=production
// before touching a real database. Seed scripts insert known, low-entropy
// demo credentials (a seeded admin password, demo phone numbers, etc.) —
// running one against a real production DATABASE_URL by accident would be
// a real credential-exposure incident, not just messy test data.

export function assertNotProduction(scriptName: string): void {
    const confirmFlag = process.argv.includes('--confirm-prod');
    const isProdEnv = process.env.NODE_ENV === 'production';

    if (isProdEnv && !confirmFlag) {
        console.error('');
        console.error(`  ⚠️  ${scriptName} refused to run — NODE_ENV is 'production'.`);
        console.error('');
        console.error('  Seed scripts insert known, low-entropy demo credentials.');
        console.error('  Running this against a real production database would be');
        console.error('  a credential-exposure incident, not just messy test data.');
        console.error('');
        console.error(`  If you genuinely intend to run this against production,`);
        console.error(`  re-run with the explicit flag: --confirm-prod`);
        console.error('');
        process.exit(1);
    }
}