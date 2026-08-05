// src/modules/approvals/approvals.types.ts
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequestRecord {
    id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    entity_ref: string | null;
    payload: unknown;
    amount: number | null;
    maker_id: string;
    maker_role: string;
    maker_remarks: string | null;
    status: ApprovalStatus;
    checker_id: string | null;
    checker_role: string | null;
    checker_remarks: string | null;
    decided_at: Date | null;
    execution_error: string | null;
    created_at: Date;
}

export interface CreateApprovalRequestInput {
    actionType: string;
    entityType: string;
    entityId: string;
    entityRef?: string;
    payload: unknown;
    amount?: number;
    makerId: string;
    makerRole: string;
    makerRemarks?: string;
}