# Admin API Endpoint Readiness (Task 2.1)

**Verified 2026-07-08** against `backend/business-module/src/modules/web/*`
(routes enumerated from source, not assumed). Legend: ✅ Ready to wire ·
🔗 Already wired live · ⚠️ Needs contract discussion · ❌ Deprecated.

| Frontend api file | Backend routes (web BFF, mounted under /api/v1) | Status |
|---|---|---|
| `dashboard.api.ts` | GET /dashboard/summary | 🔗 wired (Dashboard) |
| `applications.api.ts` | GET /applications, GET /applications/:id | 🔗 list wired · detail ✅ ready |
| `users.api.ts` | GET/POST /users, PATCH /users/:id, activate/deactivate | 🔗 wired (User Management) |
| `lms.api.ts` | GET /loans/accounts + /emi/:id/schedule (business routes) | 🔗 wired (Loan Accounts/Detail) |
| — richer LMS BFF | GET /lms/loans, /:id, /:id/emi-schedule, /:id/emi-summary, **/:id/payments**, /:id/foreclosure-quote, /:id/mandate; POST /lms/payments/cash; /lms/collections/cases* | ✅ ready — use for Repayments/Charges tabs + Record Payment |
| `credit.api.ts` | GET /credit/queue, /credit/summary; POST /credit/decision/:id | ✅ ready (action paths fixed 4e36f36) |
| `finance.api.ts` | GET /finance/queue, /finance/summary; POST /finance/disburse/:id | ✅ ready (action path fixed 4e36f36) |
| `customers.api.ts` | GET /customers, /customers/:id, /customers/:id/loans | ✅ ready |
| `collections.api.ts` | GET /collections/cases, /cases/:id, /summary; POST contact-log; PATCH assign | ✅ ready (page fetches, doesn't render yet) |
| `branches.api.ts` | GET/POST /branches, PATCH /:id, activate/deactivate | ✅ ready (page restored live fbea289-era) |
| `agents.api.ts` | GET/POST /agents, PATCH /:id, activate/deactivate, GET /:id/commissions | ✅ ready (page restored live) |
| `reports.api.ts` | reports web router mounted (portfolio/collection/RBI services) | ⚠️ verify response shapes vs Reports.tsx before wiring |
| `settings.api.ts` | /settings + /audit-logs routers | ✅ ready (pages restored live) |
| (appraisals — no api file yet) | POST/GET /appraisals/gold/:id(+/arrive), /appraisals/housing/:id | ✅ ready — **backend exists**, needs a small appraisals.api.ts |
| `auth.api.ts` | called /admin/auth/* (never existed) | ❌ deprecated — replaced by `staffAuth.api.ts` (/staff/auth/*) |

**Money units:** every response passes the `moneyConverter` middleware —
money fields arrive in **paise**; convert ÷100 on ingest (see lms.api.ts
`rupees()`; `outstandingAfter` is the known exception, already rupees).

**Statuses:** backend speaks LOAN_STATUS vocabulary (KYC_PENDING,
UNDERWRITING, PENDING_APPROVAL…) — map to the frontend pipeline vocabulary
as in `useApplications.ts` STATUS_MAP.

**Conclusion:** nothing is blocked on the backend. Remaining wiring order
(checklist 2.3): ApplicationDetails → Customers → Appraisals → CreditQueue
→ FinanceQueue → LMS tabs (payments) → Reports.
