// src/modules/accounting/accounting.repository.ts
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import type {
    GlAccount,
    JournalEntry,
    CreateJournalEntryInput,
    LedgerQueryInput,
    AccountBalance,
} from './accounting.types';

const log = createModuleLogger('accounting.repository');

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapAccount(row: any): GlAccount {
    return {
        id:            row.id,
        code:          row.code,
        name:          row.name,
        type:          row.type,
        normalBalance: row.normal_balance,
        isActive:      row.is_active,
        createdAt:     row.created_at,
        updatedAt:     row.updated_at,
    };
}

function mapEntry(row: any): JournalEntry {
    return {
        id:            row.id,
        entryDate:     row.entry_date,
        referenceType: row.reference_type,
        referenceId:   row.reference_id,
        debitAccount:  row.debit_account,
        creditAccount: row.credit_account,
        amount:        Number(row.amount),
        narration:     row.narration,
        postedBy:      row.posted_by,
        createdAt:     row.created_at,
    };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const accountingRepository = {

    // ── GL Accounts ───────────────────────────────────────────────────────────

    async listAccounts(): Promise<GlAccount[]> {
        const rows = await prisma.gl_accounts.findMany({
            where: { is_active: true },
            orderBy: { code: 'asc' },
        });
        return rows.map(mapAccount);
    },

    async findAccountByCode(code: string): Promise<GlAccount | null> {
        const row = await prisma.gl_accounts.findUnique({ where: { code } });
        return row ? mapAccount(row) : null;
    },

    // ── Journal Entries ───────────────────────────────────────────────────────

    async createEntry(data: CreateJournalEntryInput): Promise<JournalEntry> {
        const row = await prisma.journal_entries.create({
            data: {
                entry_date:     data.entryDate,
                reference_type: data.referenceType,
                reference_id:   data.referenceId,
                debit_account:  data.debitAccount,
                credit_account: data.creditAccount,
                amount:         data.amount,
                narration:      data.narration,
                posted_by:      data.postedBy,
                created_at:     new Date(),
            },
        });

        log.info('Journal entry created', {
            referenceType: data.referenceType,
            referenceId:   data.referenceId,
            debit:         data.debitAccount,
            credit:        data.creditAccount,
            amount:        data.amount,
        });

        return mapEntry(row);
    },

    async listEntries(filters: LedgerQueryInput): Promise<{ data: JournalEntry[]; total: number }> {
        const where: any = {};

        if (filters.accountCode) {
            where.OR = [
                { debit_account:  filters.accountCode },
                { credit_account: filters.accountCode },
            ];
        }

        if (filters.referenceType) {
            where.reference_type = filters.referenceType;
        }

        if (filters.fromDate || filters.toDate) {
            where.entry_date = {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate   ? { lte: filters.toDate   } : {}),
            };
        }

        const skip = (filters.page - 1) * filters.limit;

        const [rows, total] = await prisma.$transaction([
            prisma.journal_entries.findMany({
                where,
                orderBy: [{ entry_date: 'desc' }, { created_at: 'desc' }],
                skip,
                take: filters.limit,
            }),
            prisma.journal_entries.count({ where }),
        ]);

        return {
            data:  rows.map(mapEntry),
            total,
        };
    },

    async findEntriesByReference(
        referenceType: string,
        referenceId: string,
    ): Promise<JournalEntry[]> {
        const rows = await prisma.journal_entries.findMany({
            where: { reference_type: referenceType, reference_id: referenceId },
            orderBy: { created_at: 'asc' },
        });
        return rows.map(mapEntry);
    },

    // ── Account balances ──────────────────────────────────────────────────────

    async getAccountBalances(
        fromDate?: Date,
        toDate?: Date,
    ): Promise<AccountBalance[]> {
        const dateFilter = (fromDate || toDate) ? `
            WHERE entry_date >= ${fromDate ? `'${fromDate.toISOString().split('T')[0]}'` : "'1900-01-01'"}
            AND   entry_date <= ${toDate   ? `'${toDate.toISOString().split('T')[0]}'`   : "'2099-12-31'"}
        ` : '';

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT
                g.code,
                g.name,
                g.type,
                g.normal_balance,
                COALESCE(SUM(CASE WHEN j.debit_account  = g.code THEN j.amount ELSE 0 END), 0) AS total_debits,
                COALESCE(SUM(CASE WHEN j.credit_account = g.code THEN j.amount ELSE 0 END), 0) AS total_credits
            FROM gl_accounts g
            LEFT JOIN journal_entries j ON (j.debit_account = g.code OR j.credit_account = g.code)
            ${dateFilter}
            WHERE g.is_active = true
            GROUP BY g.code, g.name, g.type, g.normal_balance
            ORDER BY g.code
        `);

        return rows.map((r) => {
            const debits  = Number(r.total_debits);
            const credits = Number(r.total_credits);
            const balance = r.normal_balance === 'DEBIT'
                ? debits - credits
                : credits - debits;

            return {
                code:         r.code,
                name:         r.name,
                type:         r.type,
                totalDebits:  debits,
                totalCredits: credits,
                balance,
            };
        });
    },
};