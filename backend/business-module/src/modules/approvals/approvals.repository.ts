// src/modules/approvals/approvals.repository.ts
//
// Returns raw snake_case rows deliberately, matching the frontend's expected
// shape (approvals.api.ts on the admin web app reads action_type, entity_id,
// maker_id, etc. directly) — same convention already used by the
// reconciliation module for the same reason: a BFF-style endpoint the
// frontend consumes directly, not one of the camelCase-mapped modules.

import { prisma } from '@/config/database';
import type { ApprovalRequestRecord, CreateApprovalRequestInput } from './approvals.types';

export const approvalsRepository = {

    async list(status?: string): Promise<ApprovalRequestRecord[]> {
        const rows = await prisma.approval_requests.findMany({
            where: status ? { status } : {},
            orderBy: { created_at: 'desc' },
        });
        return rows as unknown as ApprovalRequestRecord[];
    },

    async findById(id: string): Promise<ApprovalRequestRecord | null> {
        const row = await prisma.approval_requests.findUnique({ where: { id } });
        return row as unknown as ApprovalRequestRecord | null;
    },

    async create(input: CreateApprovalRequestInput): Promise<ApprovalRequestRecord> {
        const row = await prisma.approval_requests.create({
            data: {
                action_type: input.actionType,
                entity_type: input.entityType,
                entity_id: input.entityId,
                entity_ref: input.entityRef ?? null,
                payload: input.payload as object,
                amount: input.amount ?? null,
                maker_id: input.makerId,
                maker_role: input.makerRole,
                maker_remarks: input.makerRemarks ?? null,
                status: 'PENDING',
            },
        });
        return row as unknown as ApprovalRequestRecord;
    },

    async decide(
        id: string,
        status: 'APPROVED' | 'REJECTED',
        checkerId: string,
        checkerRole: string,
        checkerRemarks: string | null,
    ): Promise<ApprovalRequestRecord> {
        const row = await prisma.approval_requests.update({
            where: { id },
            data: {
                status,
                checker_id: checkerId,
                checker_role: checkerRole,
                checker_remarks: checkerRemarks,
                decided_at: new Date(),
            },
        });
        return row as unknown as ApprovalRequestRecord;
    },
};