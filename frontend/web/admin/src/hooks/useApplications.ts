// src/hooks/useApplications.ts
//
// Live applications pipeline — same live-first / labelled-fallback
// convention as useLms / useDashboard / useStaffUsers.
//
// The backend speaks its own status vocabulary (KYC_PENDING, UNDERWRITING,
// PENDING_APPROVAL, …); rows are mapped onto the frontend AppStatus values
// so the existing preset tabs, filters and CSV export work unchanged.

import { useEffect, useState } from 'react';
import { USE_MOCK } from '../config';
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
  customer: { name?: string; phone?: string; email?: string } | null;
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
      email: r.customer?.email ?? '—',
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
    if (USE_MOCK) { setData(null); setLoading(false); return; }
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

// ─── Single application detail (Task 2.3a) ────────────────────────────────────
// GET /applications/:id returns the application response UNWRAPPED (no
// {success,data} envelope) with money fields in paise. The detail tabs
// dereference deep aggregates (kyc, bureau, addresses, employment) that the
// backend does not provide yet — every structure below gets a safe default
// so the existing tabs render "—"/empty instead of crashing.

interface BackendAppDetail extends BackendAppRow {
  monthlyEmi: number | null;
  processingFee: number | null;
  monthlyIncome: number | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  customer: {
    name?: string; fullName?: string; phone?: string; mobile?: string;
    email?: string;
  } | null;
}

function mapAppDetail(r: BackendAppDetail): LoanApplication {
  const base = mapApp(r as BackendAppRow);
  const custName = r.customer?.name ?? r.customer?.fullName ?? '—';
  const custPhone = (r.customer?.phone ?? r.customer?.mobile ?? '').replace(/^\+?91/, '');

  const emptyAddress = {
    line1: '—', line2: '', city: r.storeCity ?? '—', state: '—', pincode: '—',
    residenceType: '—' as never, yearsAtAddress: 0,
  };

  return {
    ...base,
    loan: {
      ...((base as unknown as { loan: object }).loan as object),
      emi: rupees(r.monthlyEmi),
    },
    customer: {
      name: custName,
      dob: '—', age: 0, gender: '—' as never, maritalStatus: '—' as never,
      fatherOrSpouseName: '—',
      mobile: custPhone, email: r.customer?.email ?? '—', dependents: 0,
      currentAddress: emptyAddress, permanentAddress: emptyAddress,
      employment: {
        type: '—' as never, employer: '—', designation: '—', yearsInJob: 0,
      },
      income: {
        monthlyIncome: rupees(r.monthlyIncome), otherIncome: 0,
        existingObligations: 0, foir: 0,
      },
    },
    kyc: {
      aadhaarMasked: '— not captured —', aadhaarVerified: false,
      panNumber: '—', panVerified: false, videoKycStatus: 'PENDING',
    },
    bureau: {
      score: 0, reportDate: '', enquiries6m: 0, totalAccounts: 0,
      activeAccounts: 0, overdueAccounts: 0, oldestAccountYears: 0,
      paymentHistory: [], accounts: [],
    },
    documents: [],
    timeline: [],
  } as unknown as LoanApplication;
}

export function useApplicationDetail(id: string | undefined): {
  app: LoanApplication | undefined;
  live: boolean;
  loading: boolean;
} {
  const mockApp = useAppStore(
    (s) => s.applications.find((a) => a.id === id),
  );
  const [liveApp, setLiveApp] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sample rows resolve from the store; only fetch for unknown ids
    if (USE_MOCK || !id || mockApp) { setLiveApp(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    applicationsApi.get(id)
      .then((r: BackendAppDetail) => { if (alive) { setLiveApp(mapAppDetail(r)); setLoading(false); } })
      .catch(() => { if (alive) { setLiveApp(null); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mockApp === undefined]);

  return { app: liveApp ?? mockApp, live: liveApp !== null, loading };
}
