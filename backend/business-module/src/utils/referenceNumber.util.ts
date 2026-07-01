// src/utils/referenceNumber.util.ts
import { prisma } from '@/config/database';

export async function getNextSequenceValue(sequenceKey: string): Promise<number> {
    const rows = await prisma.$queryRaw<[{ current_value: number }]>`
        INSERT INTO number_sequences (sequence_key, current_value, updated_at)
        VALUES (${sequenceKey}, 1, NOW())
        ON CONFLICT (sequence_key)
        DO UPDATE SET
            current_value = number_sequences.current_value + 1,
            updated_at = NOW()
        RETURNING current_value
    `;
    return Number(rows[0]!.current_value);
}

export async function generateLoanAccountNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`LOAN_ACCOUNT_${year}`);
    return `FHR-${year}-${String(seq).padStart(6, '0')}`;
}

export async function generateLoanApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`LOAN_APP_${year}`);
    return `FHR-${year}-${String(seq).padStart(6, '0')}`;
}