// src/api/lms.api.ts
//
// Live LMS (loan servicing) API — staff loan book + EMI schedules.
// Maps backend shapes (loans.repository StaffLoanAccountListItem,
// emi.types EmiScheduleEntry) onto the frontend LoanAccount/EmiRow types
// so the existing LMS screens render live data unchanged.

import dayjs from 'dayjs';
import { apiClient } from './client';
import type { EmiRow, EmiStatus, LoanAccount, LoanStatus, Repayment } from '../types';

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

// The backend's moneyConverter middleware serialises money fields in PAISE
// (mobile-app convention). The web UI works in rupees — convert on ingest.
// NOTE: outstandingAfter carries none of the money words the middleware
// detects ('amount', 'fee', 'emi', 'balance', 'income', 'interest',
// 'principal'), so it is not converted and arrives in rupees already.
const rupees = (paise: number): number => Math.round(paise) / 100;

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
    principal: rupees(e.principalComponent),
    interest: rupees(e.interestComponent),
    emi: rupees(e.emiAmount),
    balance: e.outstandingAfter, // already rupees — not converted by the middleware
    status: mapEmiStatus(e.status, e.dueDate),
    paidOn: e.paidAt ? day(e.paidAt) : undefined,
    paidAmount: e.paidAt ? rupees(e.emiAmount) : undefined,
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
    principal: rupees(row.principalAmount),
    interestRate: row.interestRate,
    tenureMonths: row.tenureMonths,
    emi: rupees(row.monthlyEmi),
    disbursedOn: row.disbursedAt ?? '',
    firstEmiDate: day(row.firstEmiDate),
    nextDueDate: row.nextDueDate ? day(row.nextDueDate) : undefined,
    paidCount: row.paidCount,
    outstandingPrincipal: rupees(row.outstandingBalance),
    overdueAmount: rupees(row.overdueAmount),
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

interface BackendPaymentRow {
  id: string;
  emiId: string | null;
  paymentType: string;      // EMI | PARTIAL | FORECLOSURE | ...
  amount: number;           // paise (converted by middleware)
  penaltyAmount: number;    // paise
  channel: string;          // ENACH | UPI | BANK_TRANSFER | PAYMENT_LINK | CASH
  gatewayTxnId: string | null;
  utrNumber: string | null;
  status: string;           // INITIATED | SUCCESS | FAILED | REFUNDED | PENDING
  completedAt?: string | null;
  initiatedAt?: string | null;
  createdAt?: string | null;
}

const CHANNEL_TO_MODE: Record<string, Repayment['mode']> = {
  ENACH: 'E-MANDATE', UPI: 'UPI', BANK_TRANSFER: 'NEFT', PAYMENT_LINK: 'UPI', CASH: 'CASH',
};

function mapPayment(pmt: BackendPaymentRow, loan: { loanNumber: string; customerName: string; loanType: LoanAccount['loanType'] }): Repayment {
  const status: Repayment['status'] =
    pmt.status === 'SUCCESS' ? 'SUCCESS'
    : pmt.status === 'FAILED' ? 'BOUNCED'
    : 'PENDING';
  return {
    id: pmt.id,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName,
    loanType: loan.loanType,
    date: pmt.completedAt ?? pmt.initiatedAt ?? pmt.createdAt ?? '',
    // amount + penalty arrive in paise; recompute the total in rupees
    amount: rupees(pmt.amount) + rupees(pmt.penaltyAmount),
    mode: CHANNEL_TO_MODE[pmt.channel] ?? 'NEFT',
    reference: pmt.utrNumber ?? pmt.gatewayTxnId ?? pmt.id.slice(0, 12).toUpperCase(),
    emiSeq: undefined,
    status,
    type: pmt.paymentType === 'FORECLOSURE' ? 'FORECLOSURE'
      : pmt.paymentType === 'PARTIAL' ? 'PART_PAYMENT' : 'EMI',
  };
}

export const lmsApi = {
  /** Staff loan book — GET /loans/accounts */
  listAccounts: async (params: ListAccountsParams = {}): Promise<LiveLoanAccount[]> => {
    const res = await apiClient.get('/loans/accounts', { params });
    return (res.data.data as BackendAccountRow[]).map(mapAccount);
  },

  /** Per-loan payment ledger — GET /lms/loans/:id/payments (unwrapped {data,pagination}) */
  getPayments: async (
    loanAccountId: string,
    loan: { loanNumber: string; customerName: string; loanType: LoanAccount['loanType'] },
  ): Promise<Repayment[]> => {
    const res = await apiClient.get(`/lms/loans/${loanAccountId}/payments`, { params: { limit: 50 } });
    const rows = (res.data.data ?? res.data) as BackendPaymentRow[];
    return rows.map((r) => mapPayment(r, loan));
  },

  /** Full amortization schedule — GET /emi/:loanAccountId/schedule */
  getSchedule: async (loanAccountId: string): Promise<EmiRow[]> => {
    const res = await apiClient.get(`/emi/${loanAccountId}/schedule`);
    return (res.data.data as BackendEmiRow[]).map(mapEmi);
  },
};
