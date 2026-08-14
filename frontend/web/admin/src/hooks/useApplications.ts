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
import { describeError, useLiveData } from './useLiveData';
import type { DataSource } from './useLiveData';
import type { AppStatus, LoanApplication } from '../types';

// ─── Backend wire shape (web BFF GET /applications) ───────────────────────────

interface BackendAppRow {
  id: string;
  referenceNumber: string | null;
  status: string;
  amountRequested: number; // paise (moneyConverter middleware)
  approvedAmount: number | null; // paise
  tenureMonths: number;
  interestRate: number | null;
  productType: string;
  purpose: string;
  // CDL only. Null on gold/housing rows, and on CDL rows created before the
  // product_name column existed — hence the `?? purpose` fallback below.
  productName?: string | null;
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
  const appNumber =
    r.referenceNumber ?? `FHR-${year}-${r.id.replace(/-/g, '').slice(-5).toUpperCase()}`;

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
      // Legacy CDL rows kept the product name in `purpose`; new ones keep the
      // loan's real purpose there and the item in productName.
      purpose: r.purpose,
      ...(r.productName ? { productName: r.productName } : {}),
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
  source: DataSource;
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const mockApps = useAppStore((s) => s.applications);

  const { data, source, loading, error, reload } = useLiveData<LoanApplication[]>(
    () =>
      applicationsApi
        .list({ limit: 100 })
        .then((res: { data: BackendAppRow[] }) => res.data.map(mapApp)),
    mockApps,
  );

  return {
    applications: data,
    source,
    live: source === 'live',
    loading,
    error,
    reload,
  };
}

// ─── Single application detail (Task 2.3a) ────────────────────────────────────
// GET /applications/:id returns the application response UNWRAPPED (no
// {success,data} envelope) with money fields in paise. The detail tabs
// dereference deep aggregates (kyc, bureau, addresses, employment) that the
// backend does not provide yet — every structure below gets a safe default
// so the existing tabs render "—"/empty instead of crashing.

interface BackendAppDetail extends BackendAppRow {
  monthlyEmi: number | null; // paise
  processingFee: number | null; // paise
  monthlyIncome: number | null; // paise
  // CDL product details — null for gold/housing, which finance no product.
  //
  // These two arrive in RUPEES, not paise. The moneyConverter middleware
  // detects money by the words in the key ('amount', 'fee', 'emi', 'balance',
  // 'income', 'interest', 'principal'); neither "productValue" nor
  // "downPayment" contains one, so neither is converted. Dividing them by 100
  // would show an ₹80,000 product as ₹800.
  productName: string | null;
  productValue: number | null; // rupees
  downPayment: number | null; // rupees
  // CDL only — null for gold/housing, and for CDL applications submitted
  // before loan_applications.employment_type existed.
  employmentType: 'SALARIED' | 'SELF_EMPLOYED' | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  customer: {
    name?: string;
    fullName?: string;
    phone?: string;
    mobile?: string;
    email?: string;
  } | null;
}

function mapAppDetail(r: BackendAppDetail): LoanApplication {
  const base = mapApp(r as BackendAppRow);
  const custName = r.customer?.name ?? r.customer?.fullName ?? '—';
  const custPhone = (r.customer?.phone ?? r.customer?.mobile ?? '').replace(/^\+?91/, '');

  const emptyAddress = {
    line1: '—',
    line2: '',
    city: r.storeCity ?? '—',
    state: '—',
    pincode: '—',
    residenceType: '—' as never,
    yearsAtAddress: 0,
  };

  return {
    ...base,
    loan: {
      ...((base as unknown as { loan: object }).loan as object),
      emi: rupees(r.monthlyEmi),
      // The financed item, from its own columns rather than the generic
      // `purpose` field CDL used to overload.
      ...(r.productName ? { productName: r.productName } : {}),
      // Already rupees — see the note on BackendAppDetail.
      ...(r.productValue != null ? { productValue: r.productValue } : {}),
      ...(r.downPayment != null ? { downPayment: r.downPayment } : {}),
      ...(r.employmentType ? { employmentType: r.employmentType } : {}),
    },
    customer: {
      name: custName,
      dob: '—',
      age: 0,
      gender: '—' as never,
      maritalStatus: '—' as never,
      fatherOrSpouseName: '—',
      mobile: custPhone,
      email: r.customer?.email ?? '—',
      dependents: 0,
      currentAddress: emptyAddress,
      permanentAddress: emptyAddress,
      employment: {
        type: '—' as never,
        employer: '—',
        designation: '—',
        yearsInJob: 0,
      },
      income: {
        monthlyIncome: rupees(r.monthlyIncome),
        otherIncome: 0,
        existingObligations: 0,
        foir: 0,
      },
    },
    kyc: {
      aadhaarMasked: '— not captured —',
      aadhaarVerified: false,
      panNumber: '—',
      panVerified: false,
      videoKycStatus: 'PENDING',
    },
    bureau: {
      score: 0,
      reportDate: '',
      enquiries6m: 0,
      totalAccounts: 0,
      activeAccounts: 0,
      overdueAccounts: 0,
      oldestAccountYears: 0,
      paymentHistory: [],
      accounts: [],
    },
    documents: [],
    timeline: [],
  } as unknown as LoanApplication;
}

export function useApplicationDetail(id: string | undefined): {
  app: LoanApplication | undefined;
  live: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const mockApp = useAppStore((s) => s.applications.find((a) => a.id === id));

  const [liveApp, setLiveApp] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    // Sample rows resolve from the store; only fetch for unknown ids.
    if (USE_MOCK || !id || mockApp) {
      setLiveApp(null);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    applicationsApi
      .get(id)
      .then((r: BackendAppDetail) => {
        if (alive) {
          setLiveApp(mapAppDetail(r));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setLiveApp(null);
          // This one matters: a detail screen with no record and no sample row is
          // BLANK. Previously the failure was swallowed and the user just saw an
          // empty page with no explanation and no way to retry.
          setError(describeError(err));
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mockApp === undefined, nonce]);

  return {
    app: liveApp ?? mockApp,
    live: liveApp !== null,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
  };
}
