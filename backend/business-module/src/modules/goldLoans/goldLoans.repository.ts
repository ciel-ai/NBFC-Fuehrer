// src/modules/goldLoans/goldLoans.repository.ts
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import type { GoldLoanBranch, AppointmentStatus } from './goldLoans.types';

const log = createModuleLogger('goldLoans.repository');

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapBranch(row: Record<string, unknown>): GoldLoanBranch {
    return {
        id:             row.id as string,
        name:           row.name as string,
        address:        row.address as string,
        city:           row.city as string,
        state:          row.state as string,
        pincode:        row.pincode as string,
        phone:          (row.phone as string) ?? '',
        lat:            row.lat ? Number(row.lat) : 0,
        lng:            row.lng ? Number(row.lng) : 0,
        workingHours:   (row.working_hours as string) ?? 'Mon-Sat 9:00 AM - 5:00 PM',
        availableSlots: [
            '9:30 AM - 11:30 AM',
            '11:30 AM - 1:30 PM',
            '2:00 PM - 4:00 PM',
        ],
        distanceKm: 0,
    };
}

function mapAppointment(row: Record<string, unknown>) {
    return {
        id:            row.id as string,
        loanId:        row.loan_id as string,
        branchId:      row.branch_id as string,
        customerId:    row.customer_id as string,
        preferredDate: row.preferred_date as string,
        preferredSlot: row.preferred_slot as string,
        status:        row.status as AppointmentStatus,
        visitNotes:    row.visit_notes as string | null,
        arrivedAt:     row.arrived_at as Date | null,
        createdAt:     row.created_at as Date,
        updatedAt:     row.updated_at as Date,
    };
}

// ─── Repository ────────────────────────────────────────────────────────────────

export const goldLoansRepository = {

    async findAllBranches(): Promise<GoldLoanBranch[]> {
        const rows = await prisma.branches.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
        });
        return rows.map(r => mapBranch(r as unknown as Record<string, unknown>));
    },

    async findBranchById(id: string): Promise<GoldLoanBranch | null> {
        const row = await prisma.branches.findUnique({ where: { id } });
        return row ? mapBranch(row as unknown as Record<string, unknown>) : null;
    },

    async createAppointment(data: {
        loanId:        string;
        branchId:      string;
        customerId:    string;
        preferredDate: string;
        preferredSlot: string;
    }) {
        const row = await prisma.appointments.create({
            data: {
                loan_id:        data.loanId,
                branch_id:      data.branchId,
                customer_id:    data.customerId,
                preferred_date: new Date(data.preferredDate),
                preferred_slot: data.preferredSlot,
                status:         'BOOKED',
                created_at:     new Date(),
                updated_at:     new Date(),
            },
        });
        return mapAppointment(row as unknown as Record<string, unknown>);
    },

    async findAppointmentByLoanId(loanId: string) {
        const row = await prisma.appointments.findFirst({
            where: { loan_id: loanId },
            orderBy: { created_at: 'desc' },
        });
        return row ? mapAppointment(row as unknown as Record<string, unknown>) : null;
    },

    async findAppointmentById(id: string) {
        const row = await prisma.appointments.findUnique({ where: { id } });
        return row ? mapAppointment(row as unknown as Record<string, unknown>) : null;
    },

    async updateAppointmentStatus(
        id: string,
        status: AppointmentStatus,
        extra?: { visit_notes?: string; arrived_at?: Date },
    ) {
        const row = await prisma.appointments.update({
            where: { id },
            data: {
                status,
                ...extra,
                updated_at: new Date(),
            },
        });
        return mapAppointment(row as unknown as Record<string, unknown>);
    },

    async createCollateralGold(data: {
        loanId:           string;
        netWeightGrams:   number;
        grossWeightGrams: number;
        purityKarat:      number;
        ratePerGram:      number;
        valuation:        number;
        ltvPct:           number;
        items:            object;
        valuedBy:         string;
    }) {
        const row = await prisma.collateral_gold.create({
            data: {
                loan_id:            data.loanId,
                net_weight_grams:   data.netWeightGrams,
                gross_weight_grams: data.grossWeightGrams,
                purity_karat:       data.purityKarat,
                rate_per_gram:      data.ratePerGram,
                valuation:          data.valuation,
                ltv_pct:            data.ltvPct,
                items:              data.items,
                valued_by:          data.valuedBy,
                valued_at:          new Date(),
                created_at:         new Date(),
            },
        });
        return row;
    },

    async findCollateralByLoanId(loanId: string) {
        return prisma.collateral_gold.findUnique({
            where: { loan_id: loanId },
        });
    },
};