// src/modules/approvals/approvals.service.ts
import { approvalsRepository } from './approvals.repository';
import { NotFoundError, ConflictError } from '@/errors';
import type { ApprovalRequestRecord, CreateApprovalRequestInput } from './approvals.types';

export const approvalsService = {

    async list(status?: string): Promise<ApprovalRequestRecord[]> {
        return approvalsRepository.list(status);
    },

    // Not yet called from anywhere — the maker side (having sensitive admin
    // actions create a request here instead of executing directly) is a
    // separate, larger wiring effort across each individual action. This
    // exists so that work has somewhere to plug into once it happens.
    async create(input: CreateApprovalRequestInput): Promise<ApprovalRequestRecord> {
        return approvalsRepository.create(input);
    },

    // Maker-checker's core rule: whoever requested an action cannot also
    // be the one who approves it.
    async approve(
        id: string,
        checkerId: string,
        checkerRole: string,
        remarks?: string,
    ): Promise<ApprovalRequestRecord> {
        const existing = await approvalsRepository.findById(id);
        if (!existing) throw new NotFoundError('Approval request', id);
        if (existing.status !== 'PENDING') {
            throw new ConflictError(`Approval request is already ${existing.status}`);
        }
        if (existing.maker_id === checkerId) {
            throw new ConflictError('The maker of a request cannot also approve it');
        }

        return approvalsRepository.decide(id, 'APPROVED', checkerId, checkerRole, remarks ?? null);
    },

    async reject(
        id: string,
        checkerId: string,
        checkerRole: string,
        remarks: string,
    ): Promise<ApprovalRequestRecord> {
        const existing = await approvalsRepository.findById(id);
        if (!existing) throw new NotFoundError('Approval request', id);
        if (existing.status !== 'PENDING') {
            throw new ConflictError(`Approval request is already ${existing.status}`);
        }
        if (existing.maker_id === checkerId) {
            throw new ConflictError('The maker of a request cannot also reject it');
        }

        return approvalsRepository.decide(id, 'REJECTED', checkerId, checkerRole, remarks);
    },
};