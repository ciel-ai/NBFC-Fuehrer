// src/hooks/useApplications.ts
//
// Live applications pipeline — same live-first / labelled-fallback
// convention as useLms / useDashboard / useStaffUsers.
//
// The backend speaks its own status vocabulary (KYC_PENDING, UNDERWRITING,
// PENDING_APPROVAL, …); rows are mapped onto the frontend AppStatus values
// so the existing preset tabs, filters and CSV export work unchanged.

import { useEffect, useState } from 'react';
import { applicationsApi } from '../api/applications.api';
import { useAppStore } from '../store/appStore';
import type { AppStatus, LoanApplication } from '../types';

// ─── Backend wire shape (web BFF GET /applications) ───────────────────────────

interface BackendAppRow {
  id: string;
  referenceNumber: string | null;
  status: string;
  amountRequested: number;   // paise (moneyConverter middleware)
  approvedAmount: number | null;
  tenureMonths: number;
  interestRate: number | null;
  productType: string;
  purpose: string;
  storeName: string;
  storeCity: string;
  appliedAt: string;
  updatedAt: string;
  customer: { name?: string; phone?: string } | null;
}

// Backend → frontend pipeline stage
const STATUS_MAP: Record<string, AppStatus> = {
  DRAFT: 'SUBMITTED',
  KYC_PENDING: 'SUBMITTED',
  UNDERWRITING: 'CREDIT_PENDING',
  PENDING_APPROVAL: 'CREDIT_PENDING',
  APPROVED: 'CREDIT_APPROVED',
  ESIGN_PENDING: 'EMANDATE_PENDING',
  KYC_REJECTED: 'CREDIT_REJECTED',
  REJECTED: 'CREDIT_REJECTED',
  DISBURSED: 'DISBURSED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
};

const rupees = (paise: number | null): number => (paise ? Math.round(paise) / 100 : 0);

function mapApp(r: BackendAppRow): LoanApplication {
  const year = new Date(r.appliedAt).getFullYear();
  const appNumber = r.referenceNumber
    ?? `FHR-${year}-${r.id.replace(/-/g, '').slice(-5).toUpperCase()}`;

  return {
    id: r.id,
    appNumber,
    loanType: 'CDL', // web BFF currently surfaces CDL applications only
    status: STATUS_MAP[r.status] ?? 'SUBMITTED',
    customer: {
      name: r.customer?.name ?? '—',
      mobile: (r.customer?.phone ?? '').replace(/^\+?91/, ''),
    },
    loan: {
      amount: rupees(r.approvedAmount ?? r.amountRequested),
      tenureMonths: r.tenureMonths,
      interestRate: r.interestRate ?? 0,
      purpose: r.purpose,
      emi: 0,
      scheme: 'Standard',
    },
    source: 'Mobile App',
    createdBy: r.storeName,
    createdByCode: r.storeCity,
    branch: r.storeCity,
    createdAt: r.appliedAt,
    updatedAt: r.updatedAt,
    // Detail-tab aggregates (KYC, bureau, documents, timeline) are not part
    // of the list payload — the detail screen loads its own data.
    kyc: undefined,
    documents: [],
    bureau: undefined,
    timeline: [],
  } as unknown as LoanApplication;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApplications(): {
  applications: LoanApplication[];
  live: boolean;
  loading: boolean;
  reload: () => void;
} {
  const mockApps = useAppStore((s) => s.applications);
  const [data, setData] = useState<LoanApplication[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    applicationsApi.list({ limit: 100 })
      .then((res: { data: BackendAppRow[] }) => {
        if (alive) { setData(res.data.map(mapApp)); setLoading(false); }
      })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [nonce]);

  return {
    applications: data ?? mockApps,
    live: data !== null,
    loading,
    reload: () => setNonce((n) => n + 1),
  };
}
