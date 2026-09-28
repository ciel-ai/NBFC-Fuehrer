# NBFC-Fuehrer — Repository Audit

**Scope:** full monorepo (`backend/`, `frontend/`, `docs/`). Generated 2026-09-28 from source, CI config, migrations, and existing internal docs (`docs/ENDPOINT_READINESS.md`, `docs/FRONTEND_CHECKLIST_STATUS.md`).

---

## 1. Project Overview

**What it does:** Fuehrer is an NBFC (Non-Banking Financial Company) lending platform for the Indian market, covering three loan product lines — **Gold Loans**, **Housing Loans**, and **Consumer Durable Loans (CDL)** — end to end: customer onboarding/KYC, sales origination (agent + mobile app), underwriting, disbursement, EMI/NACH collections, delinquency (NPA) management, accounting, regulatory reporting (RBI returns), and an internal staff admin console.

**Tech stack:**
- **Backend (primary):** `backend/business-module` — Node.js/Express + TypeScript, Prisma ORM on PostgreSQL, Redis (session/idempotency/denylist), BullMQ-style cron jobs via `node-cron`, AWS SDK (S3, KMS, Secrets Manager), Sentry, Winston, Swagger.
- **Backend (legacy/secondary):** `backend/user-module` — separate Express + Prisma service for phone/OTP auth, KYC, profile; JS not TS.
- **Frontend web (admin):** `frontend/web/admin` — React 19 + Vite + Ant Design 6 + TanStack Query + Zustand + Zod + React Hook Form.
- **Frontend web (customer):** `frontend/web/customer` — bare Vite/React scaffold, essentially unbuilt.
- **Mobile:** `frontend/mobile` — Expo/React Native 0.81 + expo-router, React Query, Zustand, cert pinning, Sentry.
- **Shared:** `frontend/shared` (`@nbfc/shared`) — cross-app types/validation (Zod).
- **Infra:** Dockerfiles for `backend/business-module` and `frontend/web/admin`; `docker-compose.yml` for local Postgres/Redis; GitHub Actions CI (`lint`, `placeholder-check`, presumably `test`/`build` jobs).

**Architecture:** Modular monolith. `backend/business-module/src/modules/*` — one folder per domain (loans, kyc, emi, underwriting, disbursement, payments, collections, reports, cdlLoans, goldLoans, housingLoans, sales, staff-auth, admin, approvals, audit, migration, webhooks, reconciliation, accounting, notifications) each with `controller/service/repository/routes/dto/types`. A `src/modules/web/*` BFF layer re-exposes/aggregates domain data for the admin dashboard. `src/providers/*` implements a **live/stub adapter pattern** per external integration (KYC, payments, eSign, SMS, email, credit bureau, AML, GST, bank verify/statement, background check, doc storage, encryption), selected via env config — a strong, deliberate architecture choice for safely running without live vendor credentials in dev/test.

---

## 2. Completion Status

### Fully implemented
- Full REST surface for all three loan products (Gold/Housing/CDL) — application, KYC, underwriting, disbursement, EMI schedule, NACH mandate, part-payment, foreclosure, closure — each with dozens of unit tests (`tests/unit/cdlLoans.*`, `goldHousingLoans.*`).
- Staff auth (`staffAuth.*`) with OTP + password login, JWT + refresh, RBAC (`rbac.middleware.ts`, `staffRbac.middleware.ts`), role hierarchy.
- Idempotency middleware wired onto every state-changing CDL/loan route (per commit history — audits #10–#17).
- EMI calculator, foreclosure quote, NPA watch job, reconciliation job, NACH debit + retry jobs, bureau reporting job, settlement job — all scheduled in `src/server.ts:104-112`.
- Money-in-paise convention enforced centrally via `moneyConverterMiddleware` (`src/app.ts:93`).
- Admin web portal: Dashboard, Applications, Customers, Credit/Finance queues, LMS (loans/payments/schedule), Users, Branches, Agents, Settings, Reports, Audit Logs — all confirmed **live-wired** per `docs/FRONTEND_CHECKLIST_STATUS.md` (checklist item 2.3, all ✅).
- Mobile app: full sales wizard (Gold/Housing/CDL config-driven forms), KYC orchestrator, offline queue for sales drafts, RBAC gating, cert pinning scaffold.

### Partially implemented / stubbed
- **Gold & Housing loan disbursal/agreement/eSign/NACH steps** are gated behind `stubGuard()` middleware (`src/middlewares/stubGuard.middleware.ts`) — returns `FEATURE_NOT_WIRED` (500) unless `ENABLE_UNWIRED_LOAN_STUBS=true`. See `housingLoans.routes.ts:23-32` and `goldLoans.routes.ts:57,66,75,84,93,102,131,140`. CDL's equivalents were unwired from stubGuard (commit `472c70d`, `c021402`) but Gold/Housing were not — inconsistent completion across the three products.
- **Collections page** (`Collections.tsx`) — API wired but per `docs/ENDPOINT_READINESS.md`: "fetches, doesn't render yet."
- **Reports page** — flagged "⚠️ verify response shapes vs Reports.tsx before wiring" — not confirmed done.
- **Appraisals** — backend ready, but `appraisals.api.ts` frontend file did not exist as of the readiness doc ("needs a small appraisals.api.ts").
- `loans.routes.ts:100` — `TODO: add loansController.emiSchedule handler that queries emi_schedule` — route path exists but handler is a stated gap.
- `kyc.routes.ts:182` — `TODO: add kycController.verifyPan handler`.
- `web/applications/applications.routes.ts:11` — `TODO: merge in gold/housing applications once those modules expose [a combined feed]` — the admin Applications list currently misses gold/housing apps (also noted in FRONTEND_CHECKLIST "Known follow-ups").
- `staffAuth.service.ts:187` — OTP SMS dispatch is a `TODO(prod)`: non-prod just logs and returns the OTP instead of sending it — **must be closed before going live** (not just a nice-to-have, it's a security gap, see §5).

### Referenced but not built
- **Maker-checker (dual-approval) engine** — `docs/FRONTEND_CHECKLIST_STATUS.md` item 3.1: "⛔ blocked on backend — No engine exists (no approval_requests model/module)." **However**, migration `20260805_add_approval_requests` and `src/modules/approvals/*` now exist in the repo (post-dating that doc) — worth re-verifying whether this is actually closed; the doc is stale on this point. Confirm current state before treating it as still open.
- **Migration-status monitoring UI** — checklist 4.2: "⛔ blocked on backend — No migration status data/models exposed." A `src/modules/migration/*` module does now exist (controller/service/repository/routes + tests) — again looks like the backend caught up after the doc was written; the *admin UI screen* itself still appears unbuilt (no `MigrationStatus.tsx` found under `frontend/web/admin/src/pages`).
- **Cross-portfolio "list all payments" endpoint** (Repayments/Charges register) — listed as backend backlog in the same doc.
- **Notifications with unread counts** for mobile home badge — backend backlog item, mobile TODO not yet resolved.
- `frontend/web/customer` — customer web portal is an empty Vite scaffold (default `App.tsx`/`App.css`, vite/react svg placeholders) — not a built product, contradicts README's claim it's one of four live portals.
- `frontend/web/lms` — referenced in root `README.md` ("LMS Web Portal") and `docs/ARCHITECTURE.md`, but **does not exist on disk** (`ls frontend/web` → only `admin`, `customer`). The checklist doc confirms it was intentionally deleted ("lms deleted — redundant with web/admin /lms/*") but neither `README.md` nor `docs/ARCHITECTURE.md` was updated to remove the reference — **stale/misleading docs**.

---

## 3. Third-Party Integrations

All via the `src/providers/<name>/{interface,live,stub}.ts` pattern, selected by env var (`KYC_PROVIDER`, `PAYMENT_PROVIDER`, `SMS_PROVIDER`, `EMAIL_PROVIDER`, `BUREAU_PROVIDER`, etc. — `config/env.ts:365-405`):

| Provider | Vendor (live) | Status |
|---|---|---|
| Payments | Razorpay (`razorpay` npm dep present) | Wired — live/stub switch on `PAYMENT_PROVIDER` |
| SMS | Twilio / MSG91 | Wired — `twilio` dep present; MSG91 has no matching npm dep visible, verify `sms/live.ts` uses raw HTTP |
| Email | Resend | Wired — `resend` dep present |
| eSign/eStamp | Signzy | Wired (also present standalone in `user-module/src/vendors/signzyClient.js`) |
| Encryption | AWS KMS + AES-256-GCM | Wired — hard startup dependency (noted as one of two hard blockers, `providers/index.ts` header comment) |
| KYC (PAN/Aadhaar) | Perfios (`KYC_PROVIDER: 'perfios' \| 'stub'`) | Wired via provider interface, live implementation present |
| Credit Bureau | Generic (`BUREAU_PROVIDER: string`) | Wired but provider name untyped (`string` not a union) — no compile-time guard against a typo'd provider value |
| AML/Sanctions, Fraud score, GST verify, Bank verify/statement, Background check | Unnamed live vendors | Installed/scaffolded (interface + live + stub each present) — **verify with the team which are contracted vendors vs. placeholder live implementations**, since no npm SDK deps for most of these are visible in `package.json` (suggests raw `axios` HTTP calls to vendor REST APIs configured via secrets, not SDKs) |
| Doc storage | AWS S3 (`@aws-sdk/client-s3`) | Wired |
| Sentry | `@sentry/node` (backend), `@sentry/react` (admin), `@sentry/react-native` (mobile) | Wired across all three apps — confirm DSNs are actually set in each environment's secrets, not left blank |
| eNACH | Custom (`enachClient.js` in user-module) + NACH debit/retry jobs in business-module | Wired, two separate implementations across the two backend services — **overlap risk**, see §4/§9 |

No obviously "installed but unused" vendor SDK was found; the provider abstraction means unused vendors would show as `stub`-only implementations, which requires an env audit (§9) rather than a code audit to fully confirm.

---

## 4. Database & Data Model Health

- **ORM:** Prisma, schema at `backend/business-module/prisma/schema.prisma` — **43 models, 7 enums**. Actively maintained: 15+ migrations from `20260526` (initial) through `20260813` (CDL employment type), including several explicit **drift-reconciliation migrations** (`20260717121424_baseline_reconcile_drift`, `20260730140000_track_raw_sql_constraints`) — a signal that manual/raw-SQL schema edits happened outside Prisma at least once and had to be reconciled. Worth confirming `prisma migrate status` is clean before any new migration is authored.
- **Two independent Prisma schemas** exist: `backend/business-module/prisma/schema.prisma` (43 models, business domain) and `backend/user-module/prisma/schema.prisma` (separate, smaller — auth/KYC/user domain, confirmed to *differ* from business-module's). Two backends against what may be the same or different Postgres databases — **confirm whether `user-module` and `business-module` share one DB (foreign-key-safe) or two separate DBs (in which case cross-service joins/consistency are the app's problem, not the DB's)**. This is architecturally significant and not documented anywhere in `docs/ARCHITECTURE.md`.
- **Root-level `backend/prisma/` and `backend/server.js`** are byte-identical duplicates of `backend/user-module/`'s equivalents (`diff` confirms `server.js` identical; `backend/fuehrer-app` vs `frontend/mobile` also has near-duplicate `.env.example`/`.gitignore`) — **dead/stale duplicate trees** left in the repo root that don't belong to any npm workspace (`package.json` workspaces glob is `backend/*`, `frontend/mobile`, `frontend/web/*`, `frontend/shared` — `backend/prisma`, `backend/server.js`, and `backend/fuehrer-app` are not workspace members, and `backend/fuehrer-app` isn't a workspace either since workspaces target `backend/*` — actually `backend/*` *would* match `backend/fuehrer-app` as a directory, but it has no build/relevance). **Recommend deleting** `backend/server.js`, `backend/prisma/`, `backend/fuehrer-app/` (all three appear to be an earlier, superseded copy of `user-module`) after confirming nothing outside the repo references them.
- **Seed data:** `backend/business-module/scripts/seed-dev.ts`, `seed-demo-data.ts`, `seed-permissions.ts`, `seed-staff.ts`, `_seedGuard.ts` (likely a prod-safety guard) — seeding is present and appears layered (base data → demo data → staff → permissions). `user-module/scripts/seed.js` also exists separately. No single documented "run these in order" sequence — infer from filenames or check `package.json` `db:seed` script (only wires `seed-dev.ts`; the others are presumably run manually/ad hoc — **undocumented seed order is a resume-time risk**, see §10).
- **Indexes:** not verified line-by-line in this pass — recommend `prisma migrate diff` / `EXPLAIN ANALYZE` on the largest tables (`loan_applications`, `emi_schedule`, `payments`) as a follow-up; the presence of dedicated migrations for idempotency (`20260811000000_enach_debit_idempotency`) suggests the team is already deliberate about this.

---

## 5. Auth & Security Gaps

- **Route-level auth coverage is good.** A systematic scan of all `*.routes.ts` files found only 21 route handlers without `requireAuth`/`allowRoles`/`allowStaffRoles` in their middleware chain, and **every one is legitimately public**: OTP send/verify, login/refresh (auth endpoints, by definition pre-auth), public rate lookups (`GET /gold/rate`, `POST /eligibility`), health checks (`/health/live`, `/ready`), and webhooks (`razorpay`, `esign`, `signzy` — these use signature verification instead of JWT, confirmed by `tests/unit/webhooks.signatureVerification.test.ts`). **No unprotected sensitive route was found.**
- **Denylist fail-open on Redis outage** (`src/middlewares/verifyToken.middleware.ts:87-103`) — deliberately documented trade-off (availability over strictness), bounded by 15-min access-token TTL. Reasonable, but confirm this is an accepted risk with security sign-off, since it means a just-logged-out/revoked token is honored for up to 15 minutes during a Redis outage.
- **OTP not actually sent outside prod** (`staffAuth.service.ts:187`, `TODO(prod): dispatch via the SMS provider. In non-prod we log + return it.`) — **check that this code path is unreachable in production** (i.e., gated on `NODE_ENV`/`SMS_PROVIDER !== 'stub'`), not just "trust the TODO." If the OTP is ever returned in an API response body in a non-dev environment, that's an auth bypass.
- **No hardcoded secrets found** in a pattern scan (`sk_live`, AWS access key patterns, inline `password=`/`secret=` literals) across `src/` and `config/` — clean. Secrets are loaded via `config/secrets.ts` + AWS Secrets Manager (`loadSecrets()` called at boot, `src/server.ts:57-64`, hard startup failure if unavailable — good practice).
- **`BUREAU_PROVIDER` is typed `string`** not a union (`config/env.ts:374`) unlike every other provider (`'razorpay' | 'stub'`, `'twilio' | 'msg91' | 'stub'`, etc.) — a typo in this env var would silently misconfigure credit bureau integration with no compile-time or (likely) runtime guard. Minor but worth a one-line fix.
- **Maker-checker / dual control**: flagged in `docs/FRONTEND_CHECKLIST_STATUS.md` as a "security-audit P0: single-actor sanction" risk at time of writing (item 3.1). An `approvals` module and `approval_requests` migration now exist — **verify this P0 is actually closed in practice** (i.e., that high-risk actions like large disbursals actually route through the approvals engine, not just that the engine exists) before treating it as resolved.
- **Two independent JWT-issuing services** (`user-module` mints customer tokens, `business-module`'s `staff-auth` mints staff tokens) verified by **one shared `verifyToken.middleware.ts`** that branches on role shape (`isStaffRole(rawRole)` at line 41) — confirm both services use the *same* `JWT_SECRET`/algorithm in every environment; if they diverge, tokens silently stop validating (availability bug) or, worse, if one service's secret is weaker, it downgrades the security of the whole system.

---

## 6. Code Health

- **~50,000 lines of backend TypeScript**, modular structure, consistent `controller/service/repository` layering — good separation of concerns.
- **Error handling:** custom error hierarchy (`src/errors/{AppError,ConflictError,ForbiddenError,LoanStateError,NotFoundError,RateLimitError,UnauthorizedError,ValidationError,VendorError}.ts`) + global `errorHandler.middleware.ts` + explicit `uncaughtException`/`unhandledRejection` handlers added at boot (`src/server.ts:34-48`, with an inline comment noting these were previously *missing entirely* — a real gap that's now closed).
- **Dead/legacy code:** `backend/server.js`, `backend/prisma/`, `backend/fuehrer-app/`, `backend/user-module/fuehrer-app/` — see §4, these look like superseded copies that should be removed or the READMEs corrected to explain why they're kept.
- `backend/business-module/errors.txt` — a loose file at the module root (not `.gitignore`d) that looks like a debug/scratch dump left in the repo; check its contents and delete if it's not meant to be tracked.
- **TODOs:** only 14 in backend `src/`, all narrow and specific (listed in §2) — healthy signal, not a codebase full of unaddressed debt.
- **Tests:** `backend/business-module/tests/` has 30 unit test files + 1 integration test (`payments.e2e.test.ts`), heavily concentrated on CDL (`cdlLoans.*`, `cdlAutoApproval.*` — 8 files) reflecting the recent CDL audit-closure work (per git log). **Gold Loan and Housing Loan modules have comparatively thin direct coverage** — only `goldHousingLoans.esignPerApplication.test.ts` and `housingLoans.controllerAwait.test.ts` touch them directly, vs. CDL's 8+ dedicated files. Given Gold/Housing are still behind `stubGuard()` for several flows, this is proportionate but should be revisited once those flows go live.
- **Frontend tests:** `frontend/web/admin/src/utils/__tests__/*` (7 files — finance, csv, decisioning, statusMap, format, analytics, fourEyes) and `frontend/mobile/src/**/__tests__/*` (offline queue, sales schemas, customer draft, document workflow, ornaments config) — good utility-level coverage; **no component/integration tests found** for either React app (no `*.spec.tsx` rendering tests located) — UI regressions would only be caught manually or by TypeScript.
- `frontend/web/admin/src/__canary.txt` — an odd non-source file sitting in `src/`; likely a deploy/build canary marker, confirm it's intentional (probably fine, but flag for review since it's the only `.txt` in a TS source tree).

---

## 7. Dependency Health

- Could not run `npm audit`/`npm outdated` in this pass (would require installing ~6 separate `node_modules` trees); flagging notable version signals from `package.json` inspection instead:
  - `frontend/web/admin`: React 19.2, Vite 8, Vitest 4, Zod 4, Ant Design 6 — all current-generation majors, actively maintained.
  - `frontend/mobile`: Expo ~54, React Native 0.81, React 19.1 — current.
  - `backend/business-module`: Express 4.18 (Express 5 is out; staying on 4 is a defensible, common choice, not urgent), Prisma 5.22 (Prisma 6 exists — **note the version mismatch**: `user-module` is already on `@prisma/client: ^6.6.0` while `business-module` pins `5.22.0` exactly — the two backends are one major version apart on the same ORM, worth deliberately aligning or documenting why not).
  - `bcryptjs` (JS-only bcrypt) is used in `business-module`, while `user-module` uses **both** `bcrypt` (native) and `bcryptjs` (`user-module/package.json` deps list both) — redundant, pick one per service; mixing native/pure-JS bcrypt across services risks hash-format incompatibility if password hashes are ever compared cross-service.
- **Action:** run `npm audit --workspaces` and `npm outdated --workspaces` from repo root as a concrete next step — this report cannot substitute for that in a sandboxed pass without installing dependencies.

---

## 8. Infrastructure & DevOps Gaps

- **CI** (`.github/workflows/ci.yml`): `lint` job (backend only) + `placeholder-check` job that fails the build if `PENDING-CLIENT-INPUT` strings remain in `config/nbfc.constants.ts` — **and they currently do** (7 occurrences confirmed: `registrationNumber`, `rbiCorNumber`, `registeredAddress`, `licenseCategory`, plus a contact block's `name`/`email`/`phone`, all in `backend/business-module/config/nbfc.constants.ts:19-27`). **This means CI is currently red on this check for any push that includes this file unchanged** — these are real regulatory/legal fields (NBFC registration number, RBI CoR number) that literally cannot be filled by engineering; this is a **hard external blocker** on production readiness, not a code task. Separately, `.github/workflows/pre-checks.yml` and `deploy.yml` exist but weren't inspected in depth — recommend confirming `deploy.yml` targets match the current App Runner reference in `src/server.ts` comment ("App Runner sends SIGTERM").
- **Dockerfiles** present for `backend/business-module` and `frontend/web/admin` only — **no Dockerfile for `frontend/mobile`** (not expected, Expo apps ship via EAS, fine) but also **none for `backend/user-module`**, which is a real deployable service — confirm its deploy path (same `deploy.yml`? separate?).
- **EAS / mobile build:** `docs/FRONTEND_CHECKLIST_STATUS.md` item 1.2 flags this as still open at time of writing: EAS `projectId` not initialized, and cert-pinning SHA-256 hashes in `frontend/mobile/src/core/api/api.ts:51-53` are still `TODO(owner): replace with real value` placeholders — confirmed still present in current source. **Mobile app cannot be built for a store release until both are set.**
- **Env config:** `.env.example` present at root-adjacent locations (`backend/.env.example`, `backend/business-module/.env.example`, `backend/user-module/.env.example`, `backend/fuehrer-app/.env.example`, `frontend/.env.example`) — reasonably thorough, though the duplication across `backend/fuehrer-app` (stale tree) adds noise.
- **`frontend/web/admin/scripts/check-env.mjs`** + `verify:release-env` npm script — a real pre-release env-completeness check exists for the admin app; no equivalent found for `business-module` (only `loadSecrets()` runtime validation, which fails at boot rather than at CI/build time — a build-time check would catch missing env vars earlier).

---

## 9. Prioritized Pending Work

**P0 — blockers to any production deploy**
1. Fill the 7 `PENDING-CLIENT-INPUT` regulatory fields in `backend/business-module/config/nbfc.constants.ts:19-27` (NBFC registration number, RBI CoR number, registered address, license category, contact name/email/phone) — currently fails CI's `placeholder-check` job. **Not an engineering task — needs the client/compliance team.**
2. Confirm `staffAuth.service.ts:187`'s "log + return OTP in non-prod" branch is genuinely unreachable when `NODE_ENV=production` — verify, don't assume from the TODO comment.
3. Decide Gold/Housing loan disbursal path: either wire the real integrations behind `stubGuard()` (`housingLoans.routes.ts:23-32`, `goldLoans.routes.ts` 8 guarded routes) or explicitly scope them out of this release, matching what was already done for CDL.
4. Set mobile EAS `projectId` and replace the two placeholder cert-pinning SHA-256 hashes in `frontend/mobile/src/core/api/api.ts:51,53` — store builds are blocked without this.

**P1 — functional gaps affecting current users**
5. `loans.routes.ts:100` — implement `loansController.emiSchedule` handler (route exists, handler doesn't).
6. `kyc.routes.ts:182` — implement `kycController.verifyPan` handler.
7. `web/applications/applications.routes.ts:11` — merge gold/housing applications into the unified `GET /applications` feed used by the admin Applications list (currently CDL-only per the TODO).
8. Wire `frontend/web/admin/src/pages/collections/Collections.tsx` to actually render the data it already fetches.
9. Verify `reports.api.ts` response shapes against `Reports.tsx` and complete wiring (flagged "verify before wiring" in `docs/ENDPOINT_READINESS.md`).
10. Add `appraisals.api.ts` on the frontend — backend is ready and unused.
11. Re-verify (don't trust the stale checklist doc) whether the maker-checker approvals engine and migration-status endpoints, which now have backend modules, are actually fully wired to admin UI screens — `docs/FRONTEND_CHECKLIST_STATUS.md` says both are blocked, but the backend modules referenced as missing (`approvals`, `migration`) now exist in `src/modules/`.

**P2 — cleanup / hygiene**
12. Delete or clearly explain the stale duplicate trees: `backend/server.js`, `backend/prisma/`, `backend/fuehrer-app/` (identical/near-identical to `backend/user-module/`'s equivalents).
13. Remove `frontend/web/lms` references from `README.md` and `docs/ARCHITECTURE.md` — the directory was intentionally deleted but docs weren't updated.
14. Build out `frontend/web/customer` (currently an empty Vite starter) or remove it from the README's list of live portals until it is.
15. Align `@prisma/client` major version between `business-module` (5.22.0) and `user-module` (6.6.0); pick one bcrypt library in `user-module` instead of both `bcrypt` and `bcryptjs`.
16. Type `BUREAU_PROVIDER` as a union instead of bare `string` in `config/env.ts:374`.
17. Investigate/clean up `backend/business-module/errors.txt` (looks like a stray debug artifact).
18. Add component/integration tests for the React admin and mobile apps (current coverage is utility-function-only).
19. Run `npm audit --workspaces` and `npm outdated --workspaces` — not done in this pass; treat as an open action item.
20. Document DB topology: does `user-module` share a Postgres instance/database with `business-module`, or are they fully separate? Not documented anywhere.
21. Complete the "Service contract tests" item from `docs/FRONTEND_CHECKLIST_STATUS.md` (5.2, marked "⏳ next up, not started") — jest contract suites for `realAuth`/`realKYC`/`realPayment` mobile services.

---

## 10. Resume Checklist — minimum steps to run locally today

1. `cd backend/business-module && cp .env.example .env` — fill `DATABASE_URL`, `JWT_SECRET`/staff JWT secret (must match what `user-module` issues, see §5), Redis URL, and set `*_PROVIDER=stub` for every vendor (`PAYMENT_PROVIDER`, `SMS_PROVIDER`, `EMAIL_PROVIDER`, `KYC_PROVIDER`) to avoid needing real vendor credentials.
2. Likewise `cd backend/user-module && cp .env.example .env` if running the second auth/KYC service.
3. `docker-compose up -d` (in `backend/business-module/`, and separately in `backend/user-module/` if it has its own compose file) to get local Postgres + Redis.
4. From repo root: `npm install` (installs all workspaces).
5. `cd backend/business-module && npx prisma generate && npx prisma migrate deploy` (or `db:migrate` for dev-mode with shadow DB).
6. `npm run db:seed` (only wires `seed-dev.ts` — check if `seed-staff.ts`/`seed-permissions.ts` need to be run manually too; `_seedGuard.ts` suggests there's a prod-safety gate to be aware of).
7. `npm run dev --workspace=backend/business-module` — confirm it boots past the three hard startup checks (secrets, DB, Redis, GL account codes — `src/server.ts:57-91`) without exiting.
8. Repeat for `backend/user-module` if both services are needed (`npm run dev` there too).
9. `npm run dev --workspace=frontend/web/admin` and log in via staff auth (check `seed-staff.ts` for a seeded admin account/credentials).
10. For mobile: `cd frontend/mobile && cp .env.example .env`, set `EXPO_PUBLIC_API_URL` to the local backend, then `npm run start` — note EAS build (not local dev) is blocked per §8/§9 item 4.

If anything above fails, the most likely first blocker is a missing `AWS_*` credential for the encryption/KMS provider — `providers/index.ts` explicitly calls out encryption as a **hard startup dependency**, so it may need a local/stub KMS override even in dev.
