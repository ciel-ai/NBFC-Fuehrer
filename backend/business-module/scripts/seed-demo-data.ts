// scripts/seed-demo-data.ts
//
// Demo/dev data for the web portal: customers, a pipeline of loan
// applications in every stage, and disbursed loan accounts with full EMI
// schedules (one current, one overdue, one NPA) so the LMS screens,
// dashboard and queues show realistic figures.
//
// Idempotent: keyed on customer phone numbers — re-running updates in place.
//
// Run: DATABASE_URL=... npx tsx scripts/seed-demo-data.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Inline reducing-balance amortization (demo only — the app itself uses
//    the invariant-checked calculator in modules/emi) ──────────────────────────

interface EmiRow {
    n: number; due: Date; emi: number; principal: number; interest: number; after: number;
}

function amortize(principal: number, annualPct: number, months: number, firstDue: Date): EmiRow[] {
    const r = annualPct / 12 / 100;
    const pow = Math.pow(1 + r, months);
    const emi = Math.ceil(((principal * r * pow) / (pow - 1)) * 100) / 100;
    let bal = principal;
    const rows: EmiRow[] = [];
    for (let i = 1; i <= months; i++) {
        const interest = Math.round(bal * r * 100) / 100;
        let prin = Math.round((emi - interest) * 100) / 100;
        let pay = emi;
        if (i === months) { prin = bal; pay = Math.round((prin + interest) * 100) / 100; }
        bal = Math.max(0, Math.round((bal - prin) * 100) / 100);
        const due = new Date(firstDue);
        due.setMonth(due.getMonth() + (i - 1));
        rows.push({ n: i, due, emi: pay, principal: prin, interest, after: bal });
    }
    return rows;
}

const monthsAgo = (m: number): Date => {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    return d;
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CUSTOMERS = [
    { phone: '+919876500001', name: 'Rohan Verma',    email: 'rohan.verma@example.in' },
    { phone: '+919876500002', name: 'Priya Nair',     email: 'priya.nair@example.in' },
    { phone: '+919876500003', name: 'Amit Kulkarni',  email: 'amit.kulkarni@example.in' },
    { phone: '+919876500004', name: 'Sneha Reddy',    email: 'sneha.reddy@example.in' },
    { phone: '+919876500005', name: 'Vikram Singh',   email: 'vikram.singh@example.in' },
    { phone: '+919876500006', name: 'Kavya Iyer',     email: 'kavya.iyer@example.in' },
];

// status, requested, tenure, product, [disbursed config]
const APPS: Array<{
    cust: number; status: string; amount: number; tenure: number; purpose: string;
    approved?: { amount: number; rate: number };
    account?: { paid: number; overdueFrom?: number; npa?: boolean; monthsBack: number };
}> = [
    { cust: 0, status: 'KYC_PENDING',      amount: 45000,  tenure: 12, purpose: 'Refrigerator + washing machine' },
    { cust: 1, status: 'UNDERWRITING',     amount: 80000,  tenure: 18, purpose: 'Laptop for freelance work' },
    { cust: 2, status: 'PENDING_APPROVAL', amount: 65000,  tenure: 12, purpose: 'Smart TV and sound system' },
    { cust: 3, status: 'APPROVED',         amount: 120000, tenure: 24, purpose: 'Modular kitchen appliances',
      approved: { amount: 100000, rate: 18 } },
    { cust: 3, status: 'DISBURSED',        amount: 55000,  tenure: 12, purpose: 'Air conditioner - 2 units',
      approved: { amount: 55000, rate: 17.5 }, account: { paid: 4, monthsBack: 5 } },
    { cust: 4, status: 'DISBURSED',        amount: 90000,  tenure: 18, purpose: 'Home furniture set',
      approved: { amount: 90000, rate: 19 }, account: { paid: 3, overdueFrom: 4, monthsBack: 6 } },
    { cust: 5, status: 'DISBURSED',        amount: 70000,  tenure: 12, purpose: 'Two-wheeler down payment',
      approved: { amount: 70000, rate: 21 }, account: { paid: 2, overdueFrom: 3, npa: true, monthsBack: 9 } },
];

async function main(): Promise<void> {
    console.log('Seeding demo portfolio…');

    // 1. Customers
    const userIds: string[] = [];
    for (const c of CUSTOMERS) {
        const u = await prisma.users.upsert({
            where: { phone: c.phone },
            update: { full_name: c.name },
            create: { phone: c.phone, full_name: c.name, email: c.email, is_active: true },
        });
        userIds.push(u.id);
    }

    // 2. Applications + accounts
    let accSeq = 900;
    for (const [i, a] of APPS.entries()) {
        const userId = userIds[a.cust]!;
        const appliedAt = monthsAgo(a.account?.monthsBack ?? 1);

        // find-or-create keyed on (user, purpose) — purpose is unique per fixture
        let app = await prisma.loan_applications.findFirst({
            where: { user_id: userId, purpose: a.purpose },
        });
        const base = {
            status: a.status,
            amount_requested: a.amount,
            tenure_months: a.tenure,
            product_type: 'CONSUMER_DURABLE',
            purpose: a.purpose,
            store_name: ['Croma', 'Reliance Digital', 'Vijay Sales'][i % 3]!,
            store_city: ['Mumbai', 'Pune', 'Nagpur'][i % 3]!,
            approved_amount: a.approved?.amount ?? null,
            interest_rate: a.approved?.rate ?? null,
            applied_at: appliedAt,
        };
        app = app
            ? await prisma.loan_applications.update({ where: { id: app.id }, data: base })
            : await prisma.loan_applications.create({ data: { user_id: userId, ...base } });

        // 3. Loan account + EMI schedule for disbursed fixtures
        if (a.status === 'DISBURSED' && a.account && a.approved) {
            const disbursedAt = appliedAt;
            const firstDue = new Date(disbursedAt);
            firstDue.setMonth(firstDue.getMonth() + 1);
            firstDue.setDate(5);

            const rows = amortize(a.approved.amount, a.approved.rate, a.tenure, firstDue);
            const emi = rows[0]!.emi;
            const totalInterest = Math.round(rows.reduce((s, r) => s + r.interest, 0) * 100) / 100;

            const existing = await prisma.loan_accounts.findFirst({ where: { application_id: app.id } });
            const accountNumber = existing?.account_number ?? `FHR-2026-${String(++accSeq).padStart(6, '0')}`;

            const paidRows = rows.slice(0, a.account.paid);
            const outstanding = a.account.paid > 0
                ? rows[a.account.paid - 1]!.after
                : a.approved.amount;

            const accData = {
                user_id: userId,
                account_number: accountNumber,
                principal_amount: a.approved.amount,
                interest_rate: a.approved.rate,
                tenure_months: a.tenure,
                monthly_emi: emi,
                outstanding_balance: outstanding,
                total_interest: totalInterest,
                status: a.account.npa ? 'NPA' : 'ACTIVE',
                disbursed_at: disbursedAt,
            };
            const account = existing
                ? await prisma.loan_accounts.update({ where: { id: existing.id }, data: accData })
                : await prisma.loan_accounts.create({ data: { application_id: app.id, ...accData } });

            // Rebuild the schedule idempotently
            await prisma.emi_schedule.deleteMany({ where: { loan_account_id: account.id } });
            const now = new Date();
            await prisma.emi_schedule.createMany({
                data: rows.map((r) => {
                    const isPaid = r.n <= a.account!.paid;
                    const isOverdue = !isPaid && a.account!.overdueFrom !== undefined
                        && r.n >= a.account!.overdueFrom && r.due < now;
                    return {
                        loan_account_id: account.id,
                        emi_number: r.n,
                        due_date: r.due,
                        emi_amount: r.emi,
                        principal_component: r.principal,
                        interest_component: r.interest,
                        outstanding_after: r.after,
                        status: isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING',
                        penalty_amount: isOverdue ? Math.round(r.emi * 0.02 * 100) / 100 : 0,
                        bounce_count: isOverdue ? 1 : 0,
                        paid_at: isPaid ? new Date(r.due.getTime() - 36e5 * 30) : null,
                    };
                }),
            });
            console.log(`  ${accountNumber} — ${paidRows.length}/${a.tenure} paid, status ${accData.status}`);
        }
    }

    const [apps, accounts, emis] = await Promise.all([
        prisma.loan_applications.count(),
        prisma.loan_accounts.count(),
        prisma.emi_schedule.count(),
    ]);
    console.log(`Done. applications=${apps} accounts=${accounts} emis=${emis}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
