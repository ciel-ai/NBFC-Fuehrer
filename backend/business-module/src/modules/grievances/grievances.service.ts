// src/modules/grievances/grievances.service.ts

import { grievancesRepository, Grievance } from './grievances.repository';
import { DomainError, NotFoundError } from '@/errors';
import {
    GRIEVANCE_CATEGORY,
    GRIEVANCE_STATUS,
    GRIEVANCE_PRIORITY,
} from '@/config/nbfc.constants';
import { PaginatedResult, PaginationParams } from '@/types/common.types';

// ─── Status transition rules ───────────────────────────────────────────────────
// A grievance may move forward through the normal flow, or be escalated at any
// point before closure. Once CLOSED, no further transitions are allowed.

const GRIEVANCE_TRANSITIONS: Record<string, string[]> = {
    [GRIEVANCE_STATUS.OPEN]: [GRIEVANCE_STATUS.IN_PROGRESS, GRIEVANCE_STATUS.ESCALATED],
    [GRIEVANCE_STATUS.IN_PROGRESS]: [GRIEVANCE_STATUS.RESOLVED, GRIEVANCE_STATUS.ESCALATED],
    [GRIEVANCE_STATUS.ESCALATED]: [GRIEVANCE_STATUS.IN_PROGRESS, GRIEVANCE_STATUS.RESOLVED],
    [GRIEVANCE_STATUS.RESOLVED]: [GRIEVANCE_STATUS.CLOSED, GRIEVANCE_STATUS.ESCALATED],
    [GRIEVANCE_STATUS.CLOSED]: [],
};

function assertValidCategory(category: string): void {
    if (!Object.values(GRIEVANCE_CATEGORY).includes(category as any)) {
        throw new DomainError(`Invalid grievance category: ${category}`, 'INVALID_CATEGORY');
    }
}

function assertValidPriority(priority: string): void {
    if (!Object.values(GRIEVANCE_PRIORITY).includes(priority as any)) {
        throw new DomainError(`Invalid grievance priority: ${priority}`, 'INVALID_PRIORITY');
    }
}

export const grievancesService = {
    async create(input: {
        userId: string;
        loanAccountId?: string;
        category: string;
        description: string;
        priority?: string;
    }): Promise<Grievance> {
        assertValidCategory(input.category);
        const priority = input.priority ?? GRIEVANCE_PRIORITY.NORMAL;
        assertValidPriority(priority);

        if (!input.description || input.description.trim().length < 10) {
            throw new DomainError(
                'Grievance description must be at least 10 characters',
                'DESCRIPTION_TOO_SHORT',
            );
        }

        return grievancesRepository.create({
            userId: input.userId,
            loanAccountId: input.loanAccountId ?? null,
            category: input.category,
            description: input.description.trim(),
            priority,
        });
    },

    async getById(id: string): Promise<Grievance> {
        return grievancesRepository.findByIdOrThrow(id);
    },

    async getByReferenceNumber(referenceNumber: string): Promise<Grievance> {
        const grievance = await grievancesRepository.findByReferenceNumber(referenceNumber);
        if (!grievance) throw new NotFoundError('Grievance', referenceNumber);
        return grievance;
    },

    async listForUser(userId: string, params: PaginationParams): Promise<PaginatedResult<Grievance>> {
        return grievancesRepository.listByUser(userId, params);
    },

    async listAll(
        filters: { status?: string; category?: string; priority?: string },
        params: PaginationParams,
    ): Promise<PaginatedResult<Grievance>> {
        return grievancesRepository.listAll(filters, params);
    },

    async assign(id: string, staffUserId: string): Promise<Grievance> {
        const grievance = await grievancesRepository.findByIdOrThrow(id);

        if (grievance.status === GRIEVANCE_STATUS.CLOSED) {
            throw new DomainError('Cannot assign a closed grievance', 'GRIEVANCE_CLOSED');
        }

        return grievancesRepository.updateStatus(id, {
            status: grievance.status === GRIEVANCE_STATUS.OPEN
                ? GRIEVANCE_STATUS.IN_PROGRESS
                : grievance.status,
            assignedTo: staffUserId,
        });
    },

    async transitionStatus(id: string, newStatus: string, notes?: string): Promise<Grievance> {
        const grievance = await grievancesRepository.findByIdOrThrow(id);

        const allowed = GRIEVANCE_TRANSITIONS[grievance.status] ?? [];
        if (!allowed.includes(newStatus)) {
            throw new DomainError(
                `Cannot transition grievance from ${grievance.status} to ${newStatus}`,
                'INVALID_STATUS_TRANSITION',
            );
        }

        const now = new Date();
        const update: Parameters<typeof grievancesRepository.updateStatus>[1] = {
            status: newStatus,
            resolutionNotes: notes,
        };

        if (newStatus === GRIEVANCE_STATUS.RESOLVED) update.resolvedAt = now;
        if (newStatus === GRIEVANCE_STATUS.CLOSED) update.closedAt = now;
        if (newStatus === GRIEVANCE_STATUS.ESCALATED) update.escalatedAt = now;

        return grievancesRepository.updateStatus(id, update);
    },
};