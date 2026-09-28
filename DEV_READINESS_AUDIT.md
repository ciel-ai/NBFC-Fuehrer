# NBFC-Fuehrer — Development-Side Readiness Audit

**Focus:** everything the engineering team can build, configure, and finalize *right now*, without waiting on the client. All findings sourced from `backend/business-module/src`, `prisma/schema.prisma`, `.github/workflows/*`, and related frontend code. Paths are relative to `backend/business-module/` unless stated otherwise.

---

## 1. Core NBFC Modules — Dev Readiness

| Module | Done | Pending | Completable without client input? |
|---|---|---|---|
| **Loan origination** (Gold/Housing/CDL) | Application CRUD, state machine (`src/utils/loanStateMachine.util.ts`), underwriting rules engine (`src/modules/underwriting/underwriting.rules.ts`, `rules/housingLoan.rules.ts`), CDL fully unwired from stubs (commits `472c70d`, `c021402`) | Gold/Housing disbursal, agreement, eSign, NACH still behind `stubGuard()` (`housingLoans.routes.ts:23-32`, `goldLoans.routes.ts:57,66,75,84,93,102,131,140`) | **Yes** — wiring these to the already-built live provider adapters (`providers/esign/live.ts`, `providers/payment/live.ts`) is pure engineering; only the *sandbox* vendor credentials are needed, which is a dev-team infra task (§4), not a client input |
| **KYC** | PAN/Aadhaar capture, encryption (AES-256-GCM) + SHA-256 hash fingerprints (`prisma/schema.prisma:36-54`), Perfios-shaped provider interface (`providers/kycVerify/{interface,live,stub}.ts`), 19 routes in `kyc.routes.ts` | `kyc.routes.ts:182` — `kycController.verifyPan` handler is a stated TODO, route exists without implementation | **Yes** — the handler just needs to call the existing `kycVerify` provider the same way other KYC steps do; no client input required |
| **Credit scoring / underwriting** | Rule-based engine (`underwriting.rules.ts`), CDL auto-approval service (`cdlAutoApproval.service.ts`) with its own test suite (`tests/unit/cdlAutoApproval.*.test.ts` — 3 files), bureau provider interface | Bureau report *format* for regulatory submission is explicitly client-blocked (see `bureauReporting.job.ts:5-11`) — but that's *output* formatting, not the scoring logic itself | **Mostly** — scoring/decisioning logic is dev-owned and can be finished/tuned freely; only the bureau *report file format* is client-blocked |
| **Repayment / EMI** | Full amortization engine (`emi.calculator.ts`) — paise-based math, schedule builder, foreclosure, partial-payment allocation, daily overdue penalty, bounce penalty; re-exported cleanly via `utils/emiCalculator.util.ts`; dedicated test file `tests/unit/emi.calculator.test.ts` | None identified — this module reads as complete | N/A — already done |
| **Collections** | Backend: `collections.service.ts`, `collections.repository.ts`, contact-log endpoints, DPD classification (`npa.constants.ts`), NPA watch job. Admin frontend: API wired | **`Collections.tsx` fetches data but doesn't render it** (per `docs/ENDPOINT_READINESS.md`) — pure frontend gap | **Yes** — 100% dev work, backend is ready and waiting |
| **Ledger / Accounting** | `src/modules/accounting/{accounting.service,accounting.repository,accounting.types}.ts`, GL account code validation enforced as a **hard startup check** (`src/server.ts:84-91`, `assertGlAccountCodesExist()`) | Verify GL account codes seeded in `nbfc.constants.ts` are dev-placeholder-free (separate from the `PENDING-CLIENT-INPUT` regulatory fields) — confirm this doesn't block local boot | Largely dev-complete; confirm seed data covers all GL codes referenced by `accounting.service.ts` |
| **Notifications** | SMS + Email dispatch (`notifications.service.ts`), dedupe via Redis (`DEDUPE_PREFIX`), templated messages (`notifications.templates.ts`), used by EMI reminder job | **No WhatsApp provider exists.** `NotificationChannel` type is `'SMS' \| 'EMAIL' \| 'PUSH'` only (`notifications.types.ts:6`) — no `'WHATSAPP'` — yet `collections.dto.ts:11` and `collections.types.ts:85` already reference `'WHATSAPP'` as a contact-log channel value, and no `PUSH` provider implementation was found either (type exists, no `providers/push/` directory) | **Yes** — build `providers/whatsapp/{interface,live,stub}.ts` and `providers/push/{interface,live,stub}.ts` following the exact existing pattern; sandbox WhatsApp Business API (Meta test numbers) and a stub push provider can be fully built and tested today |
| **Admin panel** | Dashboard, Applications, Customers, Credit/Finance queues, LMS (loans/payments/schedule), Users, Branches, Agents, Settings, Audit Logs — all confirmed live-wired (`docs/FRONTEND_CHECKLIST_STATUS.md` 2.3) | Reports page needs response-shape verification against `Reports.tsx`; Appraisals needs a small `appraisals.api.ts` (backend ready, frontend file missing) | **Yes** — both are pure frontend wiring tasks against an already-built backend |

---

## 2. API & Backend

### Endpoints: fully implemented vs stubbed vs missing
- **Fully implemented:** the vast majority of the ~280 routes across all `*.routes.ts` files (loans, kyc, emi, underwriting, payments, agents, collections, audit, reports, reconciliation, approvals, admin, all `web/*` BFF routes).
- **Stubbed (returns `FEATURE_NOT_WIRED`, not a real response):** every route guarded by `stubGuard()` — Housing (`generateAgreement`, `eSign`, `registerNach`, `applyPmaySubsidy`, `disburseToBuilder`, `getEmiSchedule`, `getPrepaymentQuote`, `processPrepayment`, `closeLoan` — `housingLoans.routes.ts:23-32`) and 8 equivalent Gold Loan routes (`goldLoans.routes.ts`). CDL's equivalents were deliberately unwired already.
- **Missing (route exists, handler doesn't):**
  - `loans.routes.ts:100` — `loansController.emiSchedule` — "add handler that queries emi_schedule"
  - `kyc.routes.ts:182` — `kycController.verifyPan`
  - `web/applications/applications.routes.ts:11` — combined gold/housing/CDL applications feed (currently CDL-only)

### Business logic: complete vs placeholder vs not started
- **Complete:** EMI/amortization math, underwriting rules, idempotency handling (audits #10–#17 per git log), NACH mandate lifecycle, webhook signature verification (Razorpay/eSign/Signzy — `tests/unit/webhooks.signatureVerification.test.ts`).
- **Placeholder:** bureau reporting job produces a generic CSV pending confirmed format (`bureauReporting.job.ts:5-11`) — the aggregation logic itself is real, only the render step is a placeholder.
- **Not started:** WhatsApp/push notification channels (§1); combined multi-product applications feed for admin.

### Background jobs — status of each (`src/jobs/*.job.ts`, all scheduled in `src/server.ts:104-112`)
| Job | Status |
|---|---|
| `npaWatch.job.ts` | ✅ Implemented — daily DPD/NPA rollover, penalty calc, collection case auto-open, broken-PTP detection |
| `reconciliation.job.ts` | ✅ Implemented — delegates to `reconciliation.service.ts` |
| `bureauReporting.job.ts` | ⚠️ Implemented but output format is a placeholder pending client confirmation (data aggregation itself is real) |
| `emiReminder.job.ts` | ✅ Implemented — 3-day/1-day/due-today reminder tiers |
| `nachDebit.job.ts` | ✅ Implemented — daily auto-debit, distributed lock via Redis (`acquireLock`/`releaseLock`) |
| `debitRetry.job.ts` | ✅ Implemented — retry logic with lock guard |
| `settlement.job.ts` | ✅ Implemented — resolves stale payments, recovers orphaned accounts, flags stale disbursements |
| `mandateConsistencyCheck.job.ts` | ✅ Implemented — daily drift-detection safety net between `loan_accounts.razorpay_mandate_id` and `enach_mandates` |
| `webhookDeadLetterCheck.job.ts` | ✅ Implemented — surfaces permanently-failed webhook events for manual reconciliation |

**All 9 jobs are implemented and scheduled.** This is a fully dev-complete area — nothing here is blocked or waiting on anything.

---

## 3. Database & Data Model

- **Schema:** 43 models, 7 enums, 15+ migrations (`20260526` → `20260813`), actively maintained. Complete for all three loan products, staff auth, audit, notifications, collections, accounting, approvals, migration tracking.
- **Audit trail:** real — `auditTrail.middleware.ts` writes to `audit_logs`, with a hard-coded always-audit list (`ALWAYS_AUDIT_PATTERNS`, lines 13-20: approve/reject/disburse/KYC-complete/payment-webhook/agent-suspend/admin-*) as a safety net beyond whatever the service layer populates. **One item to fix now:** `MOCK_ROUTE_PATTERNS` (lines 31-36) still excludes `/sales/` and `/consumer-durable-loans/` from audit logging with a comment saying it's because "sales.service.ts / cdlLoans.service.ts" are not yet wired to real logic — but per git log, CDL *was* wired to real logic in commits `472c70d`/`c021402`/`c0886bb` ("cdl workflow backend", "cdl product details"). **This exclusion is very likely stale and should be re-verified/removed now** — if CDL now performs real disbursals, silently skipping its audit log is a compliance gap the dev team can close today without any client input.
- **Soft delete:** **not implemented anywhere.** `grep -c "deletedAt" prisma/schema.prisma` returns 0 across all 43 models. All deletion appears to be handled via status flags (e.g., loan/account status enums) rather than a `deletedAt`/`isDeleted` convention. If the product requires recoverable deletes (e.g., accidental agent/user deactivation) or a "right to be forgotten" pattern distinct from status flags, this is a schema task the dev team can design and migrate now.
- **Transaction logs:** present — `webhook_logs` (referenced by `webhookDeadLetterCheck.job.ts`), `enach_mandates`, payment idempotency tracking (migration `20260811000000_enach_debit_idempotency`), reconciliation channels tracked per prior commit (`d3ac373`).
- **Financial calculations:** fully implemented, not hardcoded — `src/modules/emi/emi.calculator.ts` (paise-based arithmetic, full amortization schedule, foreclosure amount, daily overdue penalty, bounce penalty, partial-payment allocation), consolidated as the single authoritative source (per commit `e496187` "one authoritative EMI/total calculation" and `472c70d` "consolidate cdlAutoApproval onto the authoritative EMI calculator" — the team previously had duplicate/divergent EMI logic and fixed it). `utils/emiCalculator.util.ts` is a deliberate re-export shim with an explicit "DO NOT add calculation logic here" comment — good hygiene, nothing to fix.
- **Drift-reconciliation migrations exist** (`20260717121424_baseline_reconcile_drift`, `20260730140000_track_raw_sql_constraints`) — signals a past manual/raw-SQL schema edit had to be reconciled. Action: run `npx prisma migrate status` now to confirm the migration history is currently clean before adding new migrations.

---

## 4. Integrations — Dev Configurable Now

Every integration uses the `providers/<name>/{interface,live,stub}.ts` pattern selected by env var — this is the single biggest thing working in the dev team's favor: **the entire application already runs fully functional in sandbox/stub mode with zero client credentials**, confirmed by CI itself (`.github/workflows/ci.yml` sets `KYC_PROVIDER=stub`, `BUREAU_PROVIDER=stub`, `PAYMENT_PROVIDER=stub`, `SMS_PROVIDER=stub`, `EMAIL_PROVIDER=stub` and the full test suite runs green against those).

### Can be fully set up in sandbox/test mode right now (dev-owned, no client input needed):
- **Payment gateway (Razorpay):** Razorpay issues test-mode API keys via self-signup, no client agreement needed — dev team should sign up for a Razorpay test account and wire `providers/payment/live.ts` against it end-to-end (test cards, test UPI) instead of relying only on the stub.
- **eNACH:** same Razorpay test-mode mandate flow, or the sandbox environment of whatever eNACH aggregator `providers/payment` targets — fully testable pre-launch.
- **eSign/eStamp (Signzy):** Signzy offers a sandbox/UAT environment with self-serve test credentials — dev can register a sandbox account and validate `providers/esign/live.ts` against real Signzy sandbox responses instead of only the stub.
- **SMS (Twilio):** Twilio trial account (self-signup, free tier, verified numbers) — fully wireable and testable now against `providers/sms/live.ts`.
- **Email (Resend):** Resend free tier / sandbox domain — fully wireable now.
- **KYC (Perfios or equivalent):** most KYC/PAN-verification vendors in India offer a UAT sandbox with test PAN/Aadhaar numbers under a standard developer agreement (not a full commercial contract) — worth pursuing a sandbox key in parallel with the commercial negotiation.
- **Credit Bureau:** CIBIL/Experian/Equifax/CRIF all offer UAT/test environments under standard developer registration — the *scoring/decisioning logic* can be validated against sandbox bureau responses now, independent of the production reporting-format question.
- **AML/Fraud/GST/Bank-verify/Background-check providers** (`providers/{amlCheck,fraudScore,gstVerify,bankVerify,bankStatement,bgCheck}/`): all follow the same interface/live/stub pattern — audit which of these have a real "live" implementation with a sandbox key vs. which are still `live.ts` files that were scaffolded but never pointed at an actual vendor sandbox (worth a quick pass, not confirmed either way in this audit).
- **WhatsApp:** Meta's WhatsApp Business Platform / most BSPs (e.g., Gupshup, Twilio WhatsApp) offer sandbox test numbers with no business verification required to start dev — the provider module doesn't exist yet (§1), and this can be built and tested in sandbox today.

### Blocked pending client agreements or production keys (list separately — NOT dev work):
- Production/live API keys and commercial contracts for Razorpay, Signzy, Twilio/MSG91, Resend, the chosen KYC vendor, and the chosen credit bureau(s) — sandbox keys unblock dev/QA, but go-live needs production credentials from the client's commercial relationships.
- The **confirmed bureau reporting file format** (CIBIL/Experian/Equifax/CRIF submission spec) — `bureauReporting.job.ts:5-11` explicitly ties this to "Consumer_Loan_Pending_Requirements_Document item #66."
- Final choice of which bureau(s) to integrate in production (if not yet decided).
- WhatsApp Business API **production** number verification/approval (Meta's business verification process) — sandbox testing is unblocked, production rollout is not.

---

## 5. Auth & Security

### RBAC — complete vs partial vs missing
- **Customer-facing roles** (`config/constants.ts` `ROLE` enum): `CUSTOMER`, `AGENT` — implemented, enforced via `allowRoles()` across `loans.routes.ts`, `kyc.routes.ts`, `payments.routes.ts`, etc.
- **Staff roles** (`src/constants/staffRoles.constants.ts`): `ADMIN`, `CREDIT_CDL/GOLD/HOUSING`, `FINANCE_CDL/GOLD/HOUSING`, `SALES_CDL/GOLD/HOUSING` — a fully-realized product-scoped RBAC model (credit/finance/sales × loan-type), with an explicit module-access map (`ModuleKey` list, `CREDIT_MODULES` etc.) and a documented contract with the frontend ("mirrors `webdash/src/auth/rbac.ts` exactly — keep in sync"). **This is complete, not partial.**
- **Legacy roles still present:** `SUPER_ADMIN`, `CREDIT_MANAGER`, `FINANCE`, `OPS_EXECUTIVE`, `COLLECTION_AGENT` are marked `// Legacy (deprecated, will remove later)` in `config/constants.ts` but are still actively referenced in route guards (e.g., `loans.routes.ts:134` uses `ROLE.COLLECTION_AGENT`, `payments.routes.ts:74` uses `ROLE.COLLECTION_AGENT, ROLE.SUPER_ADMIN`). **Action for dev team:** decide whether the migration off legacy roles is finished or not — if `staffRoles.constants.ts` is the intended final model, these legacy role checks need to be migrated to the new `STAFF_ROLE` equivalents; if not, remove the "deprecated" comment. This is a pure internal decision, not client-blocked.
- **`FRONTEND_CHECKLIST_STATUS.md`'s "remaining hardcoded staff-role arrays"** in `agents.service` and `underwriting.service` (same class of bug already fixed elsewhere per commit `cdb11d1`) — confirmed as an open item, fixable now.

### Unprotected routes / missing guards
- Full route-by-route scan across every `*.routes.ts` file found **21 routes without `requireAuth`/`allowRoles`**, and all 21 are legitimately public: OTP send/verify, login/refresh (pre-auth by definition), public rate lookups (`GET /gold/rate`, `POST /eligibility`), health checks, and the three webhook endpoints (which use signature verification instead of JWT — confirmed by `tests/unit/webhooks.signatureVerification.test.ts`). **No missing guard was found.**

### Hardcoded secrets
- Pattern scan (`sk_live`, AWS key patterns, inline `password=`/`secret=` literals) across `src/` and `config/` found **none**. Secrets are loaded via `config/secrets.ts` + AWS Secrets Manager at boot (`loadSecrets()`, hard startup failure if unavailable, `src/server.ts:57-64`) — good.

### PII encryption
- **Implemented, not a gap:** PAN and Aadhaar are stored as `*_encrypted` (AES-256-GCM via the KMS-backed encryption provider) plus a separate deterministic `*_hash` (SHA-256) column for uniqueness constraints without exposing plaintext (`prisma/schema.prisma:36-54`). A telling comment at schema line 106-111 notes a **past incident was already fixed**: an agent-onboarding flow previously stored only `pan_last4`-equivalent data with "the real PAN was never persisted anywhere," making a legitimate "recover an agent's actual PAN" request impossible to satisfy — this was corrected. No further PII encryption gap identified in this pass, but recommend a targeted grep for any other PII field (bank account number, address) to confirm the same encryption treatment is applied consistently — not fully verified in this audit.
- **One real gap:** `staffAuth.service.ts:187` — non-production environments log and return the OTP directly instead of dispatching it via the SMS provider (`TODO(prod): dispatch via the SMS provider. In non-prod we log + return it.`). Confirm this branch is strictly gated to non-prod (`NODE_ENV`/env check) — this is dev work to verify/harden today, not client-blocked.

---

## 6. Infrastructure & DevOps

| Item | Status |
|---|---|
| CI (`ci.yml`) | ✅ `lint`, `typecheck`, `test` (with live Postgres 16 + Redis 7 service containers, all providers stubbed), `placeholder-check` (fails build on unfilled regulatory fields — currently failing, see §8) |
| CD (`deploy.yml`) | ✅ Full pipeline — builds Docker image, pushes to ECR, deploys to AWS App Runner, triggered on `master` push scoped to `backend/business-module/**` |
| Dockerfile | ✅ `backend/business-module/Dockerfile`, ✅ `frontend/web/admin/Dockerfile`. ⚠️ **No Dockerfile for `backend/user-module`** (a real, separately deployable Express service) — dev task to add one and confirm its deploy path |
| Env configs | ✅ `.env.example` present per service (`backend/business-module`, `backend/user-module`, `frontend/mobile`, `frontend`); ✅ `frontend/web/admin/scripts/check-env.mjs` (`verify:release-env` script) does build-time env completeness checking for the admin app — **no equivalent build-time check exists for `business-module`** (only runtime `loadSecrets()` at boot, which fails late rather than at CI time) — worth adding a `check-env` script for parity |
| Logging | ✅ Winston-based structured logging (`config/logger.ts`, `createModuleLogger()` per module), request logger middleware, audit trail middleware |
| Monitoring / error tracking | ✅ Sentry wired in all three apps (`@sentry/node` backend, `@sentry/react` admin, `@sentry/react-native` mobile) via `config/crashReporter.ts` — **verify DSNs are actually populated per environment**, not left blank (not verified in this pass — a one-line env check the dev team can run today) |
| Graceful shutdown | ✅ SIGTERM handling with 10s timeout, drains in-flight requests, closes DB/Redis cleanly (`src/server.ts:119-150`) — explicitly built for AWS App Runner's shutdown signal |
| Distributed job locking | ✅ Redis-based locks (`acquireLock`/`releaseLock`) on cron jobs that must not double-run across horizontally-scaled instances (`nachDebit.job.ts`, `debitRetry.job.ts`, `mandateConsistencyCheck.job.ts`, `webhookDeadLetterCheck.job.ts`) |

**This section is essentially dev-complete.** The one concrete gap (a `business-module` env-completeness CI check, matching what the admin app already has) is buildable today.

---

## 7. Code Health

- **Error handling in payment/KYC/bureau flows:** better than a raw try/catch count suggests. Every controller method wraps its body in `try { ... } catch (err) { next(err); }` (confirmed pattern in `payments.controller.ts`), funneling into a central `errorHandler.middleware.ts` that maps Prisma errors to typed `AppError`s (e.g., `P2002` → `DUPLICATE_RECORD`, `HTTP.CONFLICT`) and never leaks raw Prisma internals to the client. Vendor calls (bureau, payment, KYC) go through a shared `vendorCall()` wrapper (`providers/_base/provider.utils.ts`) with built-in retry/backoff (confirmed in `providers/creditBureau/live.ts:35-70` — 3 attempts, 2s base delay, 2x backoff) and typed vendor error mapping (`BUREAU_ERRORS.noHit/timeout/fetchFailed`). **No missing error handling identified** in this pass; this is a consistent, deliberate pattern.
- **Dead code:** `backend/server.js`, `backend/prisma/`, `backend/fuehrer-app/` are stale duplicate copies of `backend/user-module/`'s files (confirmed byte-identical `server.js` via `diff`) — not referenced by the npm workspace glob in any functional way; safe to delete after confirming no external reference. `backend/business-module/errors.txt` is a loose untracked-looking file at the module root — check its contents, likely a stray debug dump, delete if so.
- **Stale audit-exclusion comment:** `auditTrail.middleware.ts:31-36` still treats CDL as mock/unwired — contradicts the CDL-wiring commits already in git log (§3) — fix today.
- **Broken imports:** none found in this pass (TypeScript project — `npm run typecheck` in CI would catch these; CI is green per the workflow config, so none are currently present on `master`).
- **Outdated/mismatched dependencies:**
  - `@prisma/client` — `business-module` pins `5.22.0`, `user-module` uses `^6.6.0` — one major version apart on the same ORM across two services in the same repo; align or document why not.
  - `user-module/package.json` lists **both** `bcrypt` (native) and `bcryptjs` (pure JS) as dependencies — redundant, pick one; mixing hash implementations across password-handling code risks confusion (though both produce standard bcrypt-format hashes, so not a compatibility bug per se — still worth cleaning up).
- **Test coverage for critical financial logic:**
  - **Strong:** `emi.calculator.ts` (`tests/unit/emi.calculator.test.ts`), CDL end-to-end (`cdlAutoApproval.*` × 3 files, `cdlLoans.*` × 12 files covering disburse totals, part-payment, foreclosure quote, idempotency, ownership, employment type, quote, DTO, agreement idempotency, document generation, e-sign, generateNoc, credit decision), NACH debit cursor-loop (`nachDebit.cursorLoop.test.ts`), payments webhook/processNachDebit, idempotency middleware, RBAC middleware, webhook signature verification.
  - **Thin:** Gold Loan and Housing Loan modules — only `goldHousingLoans.esignPerApplication.test.ts` and `housingLoans.controllerAwait.test.ts` directly touch them, versus CDL's 12+ files. Proportionate given Gold/Housing are still stub-gated (§2), but flag for expansion once those flows are unblocked.
  - **Missing entirely:** no component/integration tests found for either React app (`frontend/web/admin`, `frontend/mobile`) — only utility-function-level tests (finance, csv, decisioning, statusMap, format, analytics in admin; offline queue, sales schemas, customer draft, document workflow in mobile). A UI regression in a form or a queue page would only be caught manually today.

---

## 8. Blocked by Client — Do NOT Include in Dev Work

These, and only these, require client input/decisions/credentials and are outside what engineering can resolve independently:

1. **7 regulatory fields** in `config/nbfc.constants.ts:19-27` — NBFC registration number, RBI Certificate of Registration number, registered address, license category, and a compliance contact's name/email/phone. Currently literal `PENDING-CLIENT-INPUT` strings, and this **fails CI's `placeholder-check` job right now** — cannot be filled by engineering under any circumstance.
2. **Confirmed credit bureau reporting file format** (CIBIL/Experian/Equifax/CRIF submission spec) — referenced as "Consumer_Loan_Pending_Requirements_Document item #66" in `bureauReporting.job.ts:5-11`.
3. **Production/commercial vendor agreements and live API keys** — Razorpay, Signzy, the chosen SMS provider, Resend/email, KYC vendor, credit bureau(s). (Sandbox versions of all of these are dev-actionable now, per §4 — only the production commercial relationship is client-blocked.)
4. **Final choice of credit bureau(s)** to integrate in production, if not already decided by the client.
5. **Business/lending policy decisions not yet encoded** — e.g., final interest rate slabs, penalty schedules, or eligibility thresholds that are client/business-owned parameters rather than engineering defaults (the *calculation engine* is done per §3; any specific numeric policy the client hasn't yet finalized would need their sign-off before being hardcoded as the production default — not identified as an open item in this pass, but flagged as the general category of client-owned input that looks similar to code but isn't).
6. **Legal/compliance document templates** — loan agreement wording, NOC templates, PMAY subsidy terms — to the extent these are legal-team-owned content rather than the PDF-generation *mechanism* (the mechanism, `pdf.service.ts`, is already built and dev-owned).
7. **WhatsApp Business API production number verification** (Meta's business verification process) — sandbox testing is not blocked (§4).

Everything else in this report — including all 9 background jobs, the entire RBAC model, all sandbox integrations, the audit-trail fix, the two missing controller handlers, the stub-guard decision for Gold/Housing, and all test-coverage gaps — is dev-actionable today.

---

## 9. Prioritized Dev Task List

**P0 — quick, high-value, unblocks CI/compliance visibility**
1. Fix `auditTrail.middleware.ts:31-36` — remove or scope down the `/sales/` and `/consumer-durable-loans/` exclusion from `MOCK_ROUTE_PATTERNS` now that CDL is wired to real logic (verify against `cdlLoans.service.ts`'s actual current state first). Missing audit logs on real disbursals is a compliance gap closeable today.
2. Verify `staffAuth.service.ts:187`'s non-prod OTP log-and-return branch is unreachable when `NODE_ENV=production`.
3. Implement `loansController.emiSchedule` (`loans.routes.ts:100`) and `kycController.verifyPan` (`kyc.routes.ts:182`) — both are route-exists/handler-missing gaps with a clear pattern to copy from sibling handlers.

**P1 — finish partially-built product flows**
4. Decide and execute on Gold/Housing `stubGuard()` routes (`housingLoans.routes.ts:23-32`, `goldLoans.routes.ts` 8 routes): either wire them to the already-built live provider adapters (esign, payment) the same way CDL was unwired, or explicitly document them as out of scope for this release.
5. Wire `frontend/web/admin/src/pages/collections/Collections.tsx` to render the data it already fetches.
6. Add `appraisals.api.ts` on the frontend (backend ready, per `docs/ENDPOINT_READINESS.md`).
7. Verify `reports.api.ts` response shapes against `Reports.tsx` and complete wiring.
8. Merge gold/housing applications into the unified `GET /applications` feed (`web/applications/applications.routes.ts:11`).

**P2 — sandbox integrations (unblocks realistic QA without client credentials)**
9. Set up sandbox/test accounts for Razorpay (payments + eNACH), Signzy (eSign, UAT), Twilio (SMS trial), Resend (email sandbox) and validate each `providers/*/live.ts` against real sandbox responses instead of only the stub.
10. Pursue UAT/developer-tier sandbox access for the KYC vendor and at least one credit bureau in parallel with the client's commercial negotiation — validates decisioning logic against real response shapes.
11. Build `providers/whatsapp/{interface,live,stub}.ts` against a WhatsApp sandbox (Meta test number or a BSP like Gupshup/Twilio) and extend `NotificationChannel` (`notifications.types.ts:6`) to include `'WHATSAPP'`, matching what `collections.dto.ts:11` already expects.
12. Build `providers/push/{interface,live,stub}.ts` — type exists (`'PUSH'` in `NotificationChannel`), no implementation found.

**P3 — RBAC/role cleanup**
13. Decide whether `SUPER_ADMIN`, `CREDIT_MANAGER`, `FINANCE`, `OPS_EXECUTIVE`, `COLLECTION_AGENT` (marked "deprecated, will remove later" in `config/constants.ts`) are actually being phased out; if so, migrate the remaining references (`loans.routes.ts:134`, `payments.routes.ts:74`, and others) to the `STAFF_ROLE` model and remove the legacy roles.
14. Fix the remaining hardcoded staff-role arrays in `agents.service.ts` and `underwriting.service.ts` (same class of 403 bug already fixed elsewhere per commit `cdb11d1`).

**P4 — infra/DevOps parity**
15. Add a build-time env-completeness check for `backend/business-module`, mirroring `frontend/web/admin/scripts/check-env.mjs`'s `verify:release-env`.
16. Add a `Dockerfile` for `backend/user-module` and confirm/document its deploy path (currently only `business-module` and `web/admin` have one).
17. Confirm Sentry DSNs are actually populated (not blank) per environment across all three apps.

**P5 — code hygiene**
18. Delete stale duplicate trees: `backend/server.js`, `backend/prisma/`, `backend/fuehrer-app/` (confirmed near/exact duplicates of `backend/user-module/`).
19. Investigate and likely delete `backend/business-module/errors.txt`.
20. Align `@prisma/client` version between `business-module` (5.22.0) and `user-module` (6.6.0); remove the redundant `bcrypt`/`bcryptjs` duplication in `user-module/package.json`.
21. Design and migrate a soft-delete (`deletedAt`) convention if the product needs recoverable deletes beyond existing status-flag handling — currently absent from all 43 Prisma models.

**P6 — test coverage**
22. Expand Gold/Housing Loan test coverage to match CDL's depth once §4 P1's stub-guard decision is made.
23. Add component/integration tests for `frontend/web/admin` and `frontend/mobile` — current coverage is utility-function-only in both.
24. Complete the "service contract tests" item already tracked in `docs/FRONTEND_CHECKLIST_STATUS.md` (5.2) — jest contract suites for `realAuth`/`realKYC`/`realPayment` mobile services, marked "not started."
