// src/jobs/bureauReporting.job.ts
//
// Monthly bureau reporting pipeline. Aggregates loan account performance
// (status, DPD, outstanding balance) into a canonical export file.
//
// ⚠️ FORMAT PENDING CLIENT CONFIRMATION — Consumer_Loan_Pending_Requirements_Document
// item #66 (Credit Bureau Reporting Format). This currently outputs a generic
// CSV with the data fields bureaus typically require. Once the client confirms
// the exact CIBIL / Experian / Equifax / CRIF format, swap the render step
// (renderBureauReportCsv) for the confirmed format — the data-aggregation step
// above it should not need to change.

import cron from 'node-cron';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { CRON_SCHEDULE } from '@/config/constants';
import { classifyDpd } from '@/constants/npa.constants';
import { getDocStorageProvider } from '@/providers/docStorage';
import { toNumber } from '@/types/common.types';

const log = createModuleLogger('job:bureauReporting');

interface BureauReportRow {
    accountNumber: string;
    borrowerName: string;
    phone: string;
    panMasked: string | null;
    aadhaarLast4: string | null;
    productType: string;
    sanctionedAmount: number;
    disbursedAt: string;
    outstandingBalance: number;
    overdueDays: number;
    dpdBucket: string;
    accountStatus: string;
    closedAt: string;
}

function csvEscape(value: string | number | null): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function renderBureauReportCsv(rows: BureauReportRow[]): string {
    const headers = [
        'account_number', 'borrower_name', 'phone', 'pan_masked', 'aadhaar_last4',
        'product_type', 'sanctioned_amount', 'disbursed_at', 'outstanding_balance',
        'overdue_days', 'dpd_bucket', 'account_status', 'closed_at',
    ];

    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push([
            csvEscape(row.accountNumber),
            csvEscape(row.borrowerName),
            csvEscape(row.phone),
            csvEscape(row.panMasked),
            csvEscape(row.aadhaarLast4),
            csvEscape(row.productType),
            csvEscape(row.sanctionedAmount),
            csvEscape(row.disbursedAt),
            csvEscape(row.outstandingBalance),
            csvEscape(row.overdueDays),
            csvEscape(row.dpdBucket),
            csvEscape(row.accountStatus),
            csvEscape(row.closedAt),
        ].join(','));
    }
    return lines.join('\n');
}

export async function runBureauReportingJob(): Promise<void> {
    const jobStart = Date.now();
    log.info('Bureau reporting job started');

    const stats = {
        accountsProcessed: 0,
        errors: 0,
    };

    try {
        const rawRows = await prisma.$queryRaw<Array<{
            account_number: string;
            borrower_name: string;
            phone: string;
            pan_masked: string | null;
            aadhaar_last4: string | null;
            product_type: string;
            sanctioned_amount: number;
            disbursed_at: Date | null;
            outstanding_balance: number;
            overdue_days: number;
            account_status: string;
            closed_at: Date | null;
        }>>`
            SELECT
                la.account_number,
                u.full_name AS borrower_name,
                u.phone,
                kd.pan_masked,
                kd.aadhaar_last4,
                app.product_type,
                la.principal_amount::numeric AS sanctioned_amount,
                la.disbursed_at,
                la.outstanding_balance::numeric AS outstanding_balance,
                COALESCE(
                    (SELECT MAX(EXTRACT(DAY FROM NOW() - es.due_date))::int
                     FROM emi_schedule es
                     WHERE es.loan_account_id = la.id
                       AND es.status IN ('OVERDUE', 'BOUNCED', 'PENDING', 'PARTIAL')
                       AND es.due_date < NOW()),
                    0
                ) AS overdue_days,
                la.status AS account_status,
                la.closed_at
            FROM loan_accounts la
            JOIN users u ON u.id = la.user_id
            LEFT JOIN kyc_documents kd ON kd.user_id = la.user_id
            JOIN loan_applications app ON app.id = la.application_id
            WHERE la.status IN ('ACTIVE', 'NPA', 'CLOSED', 'DISBURSED')
        `;

        log.info(`Bureau reporting: ${rawRows.length} loan accounts found`);

        const rows: BureauReportRow[] = rawRows.map((r) => ({
            accountNumber: r.account_number,
            borrowerName: r.borrower_name,
            phone: r.phone,
            panMasked: r.pan_masked,
            aadhaarLast4: r.aadhaar_last4,
            productType: r.product_type,
            sanctionedAmount: toNumber(r.sanctioned_amount),
            disbursedAt: r.disbursed_at ? r.disbursed_at.toISOString().slice(0, 10) : '',
            outstandingBalance: toNumber(r.outstanding_balance),
            overdueDays: r.overdue_days,
            dpdBucket: classifyDpd(r.overdue_days),
            accountStatus: r.account_status,
            closedAt: r.closed_at ? r.closed_at.toISOString().slice(0, 10) : '',
        }));

        stats.accountsProcessed = rows.length;

        const csv = renderBureauReportCsv(rows);
        const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `bureau-reports/${yearMonth}.csv`;

        const docStorage = getDocStorageProvider();
        await docStorage.upload({
            key,
            fileBuffer: Buffer.from(csv, 'utf-8'),
            contentType: 'text/csv',
            metadata: { generatedAt: new Date().toISOString() },
        });

        log.info('Bureau report uploaded', { key, accountCount: rows.length });

        const durationMs = Date.now() - jobStart;
        log.info('Bureau reporting job completed', { ...stats, durationMs });

    } catch (err) {
        stats.errors++;
        log.error('Bureau reporting job crashed', {
            error: (err as Error).message,
            stack: (err as Error).stack,
            stats,
            durationMs: Date.now() - jobStart,
        });
    }
}

export function scheduleBureauReportingJob(): cron.ScheduledTask {
    log.info('Bureau reporting job scheduled', {
        schedule: CRON_SCHEDULE.BUREAU_REPORTING,
    });
    return cron.schedule(CRON_SCHEDULE.BUREAU_REPORTING, runBureauReportingJob, {
        timezone: 'Asia/Kolkata',
    });
}