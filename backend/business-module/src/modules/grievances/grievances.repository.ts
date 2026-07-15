// src/modules/grievances/grievances.repository.ts

import { prisma } from '@/config/database';
import { NotFoundError } from '@/errors';
import {
    PaginatedResult,
    PaginationParams,
    buildPaginationMeta,
    toPrismaPage,
} from '@/types/common.types';
import { generateGrievanceReferenceNumber } from '@/utils/referenceNumber.util';
import { GRIEVANCE_SLA_DAYS } from '@/config/nbfc.constants';

export interface Grievance {
    id: string;
    userId: string;
    loanAccountId: string | null;
    referenceNumber: string;
    category: string;
    description: string;
    status: string;
    priority: string;
    assignedTo: string | null;
    resolutionNotes: string | null;
    raisedAt: Date;
    slaDueAt: Date;
    resolvedAt: Date | null;
    closedAt: Date | null;
    escalatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

function mapGrievance(row: any): Grievance {
    return {
        id: row.id,
        userId: row.user_id,
        loanAccountId: row.loan_account_id,
        referenceNumber: row.reference_number,
        category: row.category,
        description: row.description,
        status: row.status,
        priority: row.priority,
        assignedTo: row.assigned_to,
        resolutionNotes: row.resolution_notes,
        raisedAt: row.raised_at,
        slaDueAt: row.sla_due_at,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        escalatedAt: row.escalated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export const grievancesRepository = {
    async create(input: {
        userId: string;
        loanAccountId?: string | null;
        category: string;
        description: string;
        priority: string;
    }): Promise<Grievance> {
        const referenceNumber = await generateGrievanceReferenceNumber();
        const slaDueAt = new Date();
        slaDueAt.setDate(slaDueAt.getDate() + GRIEVANCE_SLA_DAYS);

        const row = await prisma.grievances.create({
            data: {
                user_id: input.userId,
                loan_account_id: input.loanAccountId ?? null,
                reference_number: referenceNumber,
                category: input.category,
                description: input.description,
                priority: input.priority,
                sla_due_at: slaDueAt,
            },
        });

        return mapGrievance(row);
    },

    async findById(id: string): Promise<Grievance | null> {
        const row = await prisma.grievances.findUnique({ where: { id } });
        return row ? mapGrievance(row) : null;
    },

    async findByIdOrThrow(id: string): Promise<Grievance> {
        const row = await this.findById(id);
        if (!row) throw new NotFoundError('Grievance', id);
        return row;
    },

    async findByReferenceNumber(referenceNumber: string): Promise<Grievance | null> {
        const row = await prisma.grievances.findUnique({ where: { reference_number: referenceNumber } });
        return row ? mapGrievance(row) : null;
    },

    async listByUser(userId: string, params: PaginationParams): Promise<PaginatedResult<Grievance>> {
        const { skip, take } = toPrismaPage(params);

        const [rows, total] = await Promise.all([
            prisma.grievances.findMany({
                where: { user_id: userId },
                orderBy: { raised_at: 'desc' },
                skip,
                take,
            }),
            prisma.grievances.count({ where: { user_id: userId } }),
        ]);

        return {
            data: rows.map(mapGrievance),
            pagination: buildPaginationMeta(params.page, params.limit, total),
        };
    },

    async listAll(filters: {
        status?: string;
        category?: string;
        priority?: string;
    }, params: PaginationParams): Promise<PaginatedResult<Grievance>> {
        const { skip, take } = toPrismaPage(params);

        const where: Record<string, unknown> = {};
        if (filters.status) where.status = filters.status;
        if (filters.category) where.category = filters.category;
        if (filters.priority) where.priority = filters.priority;

        const [rows, total] = await Promise.all([
            prisma.grievances.findMany({
                where,
                orderBy: { raised_at: 'desc' },
                skip,
                take,
            }),
            prisma.grievances.count({ where }),
        ]);

        return {
            data: rows.map(mapGrievance),
            pagination: buildPaginationMeta(params.page, params.limit, total),
        };
    },

    async updateStatus(id: string, input: {
        status: string;
        assignedTo?: string;
        resolutionNotes?: string;
        resolvedAt?: Date;
        closedAt?: Date;
        escalatedAt?: Date;
    }): Promise<Grievance> {
        const row = await prisma.grievances.update({
            where: { id },
            data: {
                status: input.status,
                assigned_to: input.assignedTo,
                resolution_notes: input.resolutionNotes,
                resolved_at: input.resolvedAt,
                closed_at: input.closedAt,
                escalated_at: input.escalatedAt,
            },
        });

        return mapGrievance(row);
    },
};