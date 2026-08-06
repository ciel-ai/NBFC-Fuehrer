// src/api/nach.api.ts
//
// Live e-NACH API — mandate health on a servicing loan, the daily recurring-debit
// batches, and the book-vs-bank reconciliation report.
//
// These endpoints do not exist on the backend yet. The contracts below are the
// ones we build against; they are written up in docs/NACH_RECON_API_CONTRACTS.md
// so the backend has one place to implement from. Until they land, the screens
// fall back to the sample store (data/nach.ts) through hooks/useNach.ts, and say
// so via <DataSourceNotice />.

import { apiClient } from './client';
import type {
  LoanMandate,
  MandateStatus,
  NachBatch,
  NachDebitItem,
  NachItemStatus,
  ReconciliationRow,
  ReconStatus,
  Repayment,
} from '../types';

// The moneyConverter middleware serialises money fields in PAISE on the wire.
// Everything the web UI renders is in rupees — convert on ingest, once, here.
const rupees = (paise: number | null | undefined): number => Math.round(paise ?? 0) / 100;

// ─── Wire shapes ─────────────────────────────────────────────────────────────

interface BackendMandate {
  umrn: string | null;
  status: string;
  bankName: string;
  accountNumber: string; // full or already masked — masked again below either way
  ifsc: string | null;
  maxAmount: number; // paise
  debitDay: number | null;
  registeredAt: string | null;
  validTill: string | null;
  lastDebitAt: string | null;
  lastDebitStatus: string | null;
  failureReason: string | null;
  consecutiveFailures: number | null;
}

interface BackendNachItem {
  id: string;
  batchId: string;
  loanAccountNumber: string;
  customerName: string;
  productType: string;
  umrn: string | null;
  bankName: string | null;
  emiNumber: number | null;
  amount: number; // paise
  status: string;
  returnCode: string | null;
  returnReason: string | null;
  attempt: number | null;
  utrNumber: string | null;
  nextRetryDate: string | null;
  presentedAt: string;
}

interface BackendNachBatch {
  id: string;
  presentationDate: string;
  cycle: string;
  status: string;
  sponsorBank: string | null;
  fileReference: string | null;
  totalCount: number;
  totalAmount: number; // paise
  successCount: number;
  successAmount: number; // paise
  failedCount: number;
  failedAmount: number; // paise
  retryingCount: number;
  pendingCount: number;
  startedAt: string;
  completedAt: string | null;
}

interface BackendReconRow {
  id: string;
  transactionDate: string;
  loanAccountNumber: string | null;
  customerName: string | null;
  channel: string;
  reference: string;
  bookAmount: number; // paise
  bankAmount: number; // paise
  status: string;
  remarks: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

const MANDATE_STATUS: Record<string, MandateStatus> = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  INITIATED: 'PENDING',
  PAUSED: 'PAUSED',
  SUSPENDED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'CANCELLED',
  FAILED: 'FAILED',
  REJECTED: 'FAILED',
  EXPIRED: 'EXPIRED',
};

const ITEM_STATUS: Record<string, NachItemStatus> = {
  SUCCESS: 'SUCCESS',
  SETTLED: 'SUCCESS',
  FAILED: 'FAILED',
  RETURNED: 'FAILED',
  RETRYING: 'RETRYING',
  RETRY_SCHEDULED: 'RETRYING',
  PENDING: 'PENDING',
  PRESENTED: 'PENDING',
};

const RECON_STATUS: Record<string, ReconStatus> = {
  MATCHED: 'MATCHED',
  UNMATCHED_IN_BOOK: 'UNMATCHED_IN_BOOK',
  BOOK_ONLY: 'UNMATCHED_IN_BOOK',
  UNMATCHED_IN_BANK: 'UNMATCHED_IN_BANK',
  BANK_ONLY: 'UNMATCHED_IN_BANK',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
};

const CHANNEL_TO_MODE: Record<string, Repayment['mode']> = {
  ENACH: 'E-MANDATE',
  NACH: 'E-MANDATE',
  UPI: 'UPI',
  BANK_TRANSFER: 'NEFT',
  NEFT: 'NEFT',
  PAYMENT_LINK: 'UPI',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
};

/** Never render a full account number in the back-office. */
const mask = (acct: string): string => {
  const digits = acct.replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX${digits.slice(-4)}` : acct || '—';
};

export function mapMandate(m: BackendMandate): LoanMandate {
  return {
    umrn: m.umrn ?? undefined,
    // An unrecognised backend status must not silently read as healthy.
    status: MANDATE_STATUS[m.status] ?? 'NOT_SETUP',
    bankName: m.bankName || '—',
    accountMasked: mask(m.accountNumber ?? ''),
    ifsc: m.ifsc ?? undefined,
    maxAmount: rupees(m.maxAmount),
    debitDay: m.debitDay ?? undefined,
    registeredOn: m.registeredAt ?? undefined,
    validTill: m.validTill ?? undefined,
    lastDebitOn: m.lastDebitAt ?? undefined,
    lastDebitStatus:
      m.lastDebitStatus === 'SUCCESS'
        ? 'SUCCESS'
        : m.lastDebitStatus === 'PENDING'
          ? 'PENDING'
          : m.lastDebitStatus
            ? 'FAILED'
            : undefined,
    failureReason: m.failureReason ?? undefined,
    consecutiveFailures: m.consecutiveFailures ?? 0,
  };
}

function mapItem(r: BackendNachItem): NachDebitItem {
  return {
    id: r.id,
    batchId: r.batchId,
    loanNumber: r.loanAccountNumber,
    customerName: r.customerName,
    loanType: (['CDL', 'GOLD', 'HOUSING'].includes(r.productType)
      ? r.productType
      : 'CDL') as NachDebitItem['loanType'],
    umrn: r.umrn ?? undefined,
    bankName: r.bankName ?? '—',
    emiSeq: r.emiNumber ?? undefined,
    amount: rupees(r.amount),
    status: ITEM_STATUS[r.status] ?? 'PENDING',
    returnCode: r.returnCode ?? undefined,
    returnReason: r.returnReason ?? undefined,
    attempt: r.attempt ?? 1,
    utr: r.utrNumber ?? undefined,
    nextRetryOn: r.nextRetryDate ?? undefined,
    presentedAt: r.presentedAt,
  };
}

function mapBatch(b: BackendNachBatch): NachBatch {
  const cycle: NachBatch['cycle'] = b.cycle === 'RETRY' ? 'RETRY' : 'PRESENTATION';
  const status: NachBatch['status'] = ['COMPLETED', 'RUNNING', 'PARTIAL', 'SCHEDULED'].includes(
    b.status,
  )
    ? (b.status as NachBatch['status'])
    : 'COMPLETED';
  return {
    id: b.id,
    presentationDate: b.presentationDate,
    cycle,
    status,
    sponsorBank: b.sponsorBank ?? '—',
    fileRef: b.fileReference ?? '—',
    totalCount: b.totalCount,
    totalAmount: rupees(b.totalAmount),
    successCount: b.successCount,
    successAmount: rupees(b.successAmount),
    failedCount: b.failedCount,
    failedAmount: rupees(b.failedAmount),
    retryingCount: b.retryingCount,
    pendingCount: b.pendingCount,
    startedAt: b.startedAt,
    completedAt: b.completedAt ?? undefined,
  };
}

function mapRecon(r: BackendReconRow): ReconciliationRow {
  return {
    id: r.id,
    date: r.transactionDate,
    loanNumber: r.loanAccountNumber ?? undefined,
    customerName: r.customerName ?? undefined,
    channel: CHANNEL_TO_MODE[r.channel] ?? 'NEFT',
    reference: r.reference,
    bookAmount: rupees(r.bookAmount),
    bankAmount: rupees(r.bankAmount),
    status: RECON_STATUS[r.status] ?? 'MATCHED',
    note: r.remarks ?? undefined,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface NachBatchParams {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ReconParams {
  fromDate?: string;
  toDate?: string;
  status?: ReconStatus;
  limit?: number;
}

export const nachApi = {
  /** Mandate on one servicing loan — GET /mandates/loan/:loanAccountId */
  getLoanMandate: async (loanAccountId: string): Promise<LoanMandate | null> => {
    const res = await apiClient.get(`/mandates/loan/${loanAccountId}`);
    const row = (res.data.data ?? res.data) as BackendMandate | null;
    return row ? mapMandate(row) : null;
  },

  /** Recurring-debit batch runs — GET /nach/batches */
  listBatches: async (params: NachBatchParams = {}): Promise<NachBatch[]> => {
    const res = await apiClient.get('/nach/batches', { params });
    return ((res.data.data ?? res.data) as BackendNachBatch[]).map(mapBatch);
  },

  /** Line items in one batch — GET /nach/batches/:batchId/items */
  listBatchItems: async (batchId: string): Promise<NachDebitItem[]> => {
    const res = await apiClient.get(`/nach/batches/${batchId}/items`, { params: { limit: 500 } });
    return ((res.data.data ?? res.data) as BackendNachItem[]).map(mapItem);
  },

  /** Book-vs-bank reconciliation — GET /reports/reconciliation */
  getReconciliation: async (params: ReconParams = {}): Promise<ReconciliationRow[]> => {
    const res = await apiClient.get('/reports/reconciliation', { params });
    return ((res.data.data ?? res.data) as BackendReconRow[]).map(mapRecon);
  },
};
