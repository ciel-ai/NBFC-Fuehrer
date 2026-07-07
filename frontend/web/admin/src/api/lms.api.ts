// src/api/lms.api.ts
//
// Live LMS (loan servicing) API — staff loan book + EMI schedules.
// Maps backend shapes (loans.repository StaffLoanAccountListItem,
// emi.types EmiScheduleEntry) onto the frontend LoanAccount/EmiRow types
// so the existing LMS screens render live data unchanged.

import dayjs from 'dayjs';
import { apiClient } from './client';
import type { EmiRow, EmiStatus, LoanAccount, LoanStatus } from '../types';

// ─── Backend wire shapes ──────────────────────────────────────────────────────

interface BackendAccountRow {
  id: string;
  accountNumber: string;
  applicationId: string;
  customerName: string;
  customerPhone: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEmi: number;
  outstandingBalance: number;
  status: string;          // DISBURSED | ACTIVE | CLOSED | NPA | WRITTEN_OFF
  disbursedAt: string | null;
  firstEmiDate: string | null;
  nextDueDate: string | null;
  paidCount: number;
  totalEmis: number;
  overdueAmount: number;
  dpd: number;
}

interface BackendEmiRow {
  id: string;
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingAfter: number;
  status: string;          // PENDING | PAID | OVERDUE | WAIVED | BOUNCED | PARTIAL
  penaltyAmount: number;
  paidAt: string | null;
}

/** Frontend LoanAccount enriched with the backend account UUID. */
export type LiveLoanAccount = LoanAccount & { id: string };

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapAccountStatus(status: string, dpd: number): LoanStatus {
  switch (status) {
    case 'CLOSED': return 'CLOSED';
    case 'NPA':
    case 'WRITTEN_OFF': return 'NPA';
    default: return dpd > 0 ? 'OVERDUE' : 'ACTIVE'; // DISBURSED | ACTIVE
  }
}

function mapEmiStatus(status: string, dueDate: string): EmiStatus {
  switch (status) {
    case 'PAID':
    case 'WAIVED': return 'PAID';
    case 'OVERDUE':
    case 'BOUNCED': return 'OVERDUE';
    case 'PARTIAL': return 'DUE';
    default: // PENDING — due today/past → DUE, else UPCOMING
      return dayjs(dueDate).isAfter(dayjs(), 'day') ? 'UPCOMING' : 'DUE';
  }
}

const day = (iso: string | null): string =>
  iso ? dayjs(iso).format('YYYY-MM-DD') : '';

function mapEmi(e: BackendEmiRow): EmiRow {
  return {
    seq: e.emiNumber,
    dueDate: day(e.dueDate),
    principal: e.principalComponent,
    interest: e.interestComponent,
    emi: e.emiAmount,
    balance: e.outstandingAfter,
    status: mapEmiStatus(e.status, e.dueDate),
    paidOn: e.paidAt ? day(e.paidAt) : undefined,
    paidAmount: e.paidAt ? e.emiAmount : undefined,
  };
}

export function mapAccount(row: BackendAccountRow): LiveLoanAccount {
  // Display reference for the source application (matches the backend's
  // FHR-YYYY-XXXXX referenceNumber convention in loans.service).
  const year = row.disbursedAt ? new Date(row.disbursedAt).getFullYear() : new Date().getFullYear();
  const appRef = `FHR-${year}-${row.applicationId.replace(/-/g, '').slice(-5).toUpperCase()}`;

  return {
    id: row.id,
    loanNumber: row.accountNumber,
    applicationId: row.applicationId,
    appNumber: appRef,
    customerName: row.customerName,
    mobile: row.customerPhone.replace(/^\+?91/, ''),
    loanType: 'CDL', // current product line — revisit when GOLD/HOUSING go live
    principal: row.principalAmount,
    interestRate: row.interestRate,
    tenureMonths: row.tenureMonths,
    emi: row.monthlyEmi,
    disbursedOn: row.disbursedAt ?? '',
    firstEmiDate: day(row.firstEmiDate),
    nextDueDate: row.nextDueDate ? day(row.nextDueDate) : undefined,
    paidCount: row.paidCount,
    outstandingPrincipal: row.outstandingBalance,
    overdueAmount: row.overdueAmount,
    dpd: row.dpd,
    status: mapAccountStatus(row.status, row.dpd),
    collectionStatus: row.dpd > 0 ? 'FOLLOW_UP' : 'NORMAL',
    collectionNotes: [],
    branch: '—',
    schedule: [], // filled by getSchedule() on the detail screen
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ListAccountsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const lmsApi = {
  /** Staff loan book — GET /loans/accounts */
  listAccounts: async (params: ListAccountsParams = {}): Promise<LiveLoanAccount[]> => {
    const res = await apiClient.get('/loans/accounts', { params });
    return (res.data.data as BackendAccountRow[]).map(mapAccount);
  },

  /** Full amortization schedule — GET /emi/:loanAccountId/schedule */
  getSchedule: async (loanAccountId: string): Promise<EmiRow[]> => {
    const res = await apiClient.get(`/emi/${loanAccountId}/schedule`);
    return (res.data.data as BackendEmiRow[]).map(mapEmi);
  },
};
