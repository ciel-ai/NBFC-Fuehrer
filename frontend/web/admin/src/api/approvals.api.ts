// src/api/approvals.api.ts
//
// Maker-checker queue (web BFF /approvals). Money `amount` arrives in
// paise via the moneyConverter middleware — converted on ingest.

import { apiClient } from './client';

export interface ApprovalRequest {
  id: string;
  action_type: string;      // LOAN_APPROVAL | LOAN_SANCTION_BM | ...
  /** Checker role a request is routed to (Sprint-4 §5) — queue tabs filter on it. */
  required_role: string | null;
  entity_type: string;
  entity_id: string;
  entity_ref: string | null;
  payload: Record<string, unknown>;
  amount: number | null;    // rupees after mapping
  maker_id: string;
  maker_role: string;
  maker_remarks: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  checker_id: string | null;
  checker_role: string | null;
  checker_remarks: string | null;
  decided_at: string | null;
  execution_error: string | null;
  created_at: string;
}

const mapRow = (r: ApprovalRequest): ApprovalRequest => ({
  ...r,
  amount: r.amount === null ? null : Math.round(Number(r.amount)) / 100,
  required_role: r.required_role ?? null,
});

export const approvalsApi = {
  list: async (status?: string): Promise<ApprovalRequest[]> => {
    const res = await apiClient.get('/approvals', { params: status ? { status } : {} });
    return (res.data.data as ApprovalRequest[]).map(mapRow);
  },

  approve: async (id: string, remarks?: string) => {
    const res = await apiClient.post(`/approvals/${id}/approve`, { remarks });
    return res.data.data;
  },

  reject: async (id: string, remarks: string) => {
    const res = await apiClient.post(`/approvals/${id}/reject`, { remarks });
    return res.data.data;
  },
};
