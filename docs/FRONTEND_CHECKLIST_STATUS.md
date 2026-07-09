# Frontend Fix Checklist — Status & Decisions (2026-07-08)

Execution record for the Week 1–5 checklist. Every ✅ has its DoD met and
a dedicated commit on `master`.

| Task | Status | Notes / commit |
|---|---|---|
| 1.1 Duplicate frontend tree | ✅ | frontend/mobile canonical; stale root tree archived (`f643494`) |
| 1.2 EAS projectId | ⚠️ **user action** | Run `cd frontend/mobile && npx eas init` with the org's Expo login, then one `eas build --profile preview`. Cert-pinning hashes are also still REPLACE placeholders |
| 1.3 web/customer + web/lms | ✅ | lms deleted (redundant with web/admin /lms/*), customer README'd (`4768b2a`) |
| 2.1 Endpoint readiness | ✅ | docs/ENDPOINT_READINESS.md — nothing blocked on backend (`4c94fc8`) |
| 2.2 Mock/real swap | ✅ | Live-first hooks + central VITE_USE_MOCK (`bbc4254`) |
| 2.3 Page wiring | ✅ all | Applications list+detail, Customers, Appraisals, Credit/Finance queues, LMS book/detail/schedule/payments, Users, Dashboard, Reports (a–f: `758a8b4`,`cdb11d1`,`417bc1c`,`abf6c84`,`e52d5c2`,`7756ef2`,`36e30e5`) |
| 3.1 Maker-checker UI | ⛔ **blocked on backend** | No engine exists (no approval_requests model/module — verified by scan). Build the generic engine first (also a security-audit P0: single-actor sanction). UI slots into web/admin/src/pages/approvals/ once ready |
| 4.1 Mobile permission RBAC | ✅ | useRBAC + /unauthorized 403 + permission-gated new-sale (`83aa615`) |
| 4.2 Migration monitoring | ⛔ **blocked on backend** | No migration status data/models exposed. Screen is trivial (admin table) once an endpoint exists |
| 5.1 Mobile hygiene | ✅ | Zero bare console.log; all TODOs owner/date-tracked |
| 5.2 Service contract tests | ⏳ next up | jest + shared contract suites for realAuth/realKYC/realPayment — not started |
| 5.3 Appraiser capture UI | ✅ **scoped out (decision)** | Appraisal capture is a branch-ops function and already exists in the admin portal (Appraisals page, wired to the real gold/housing engine). It does NOT belong in the customer mobile app. Revisit only if field appraisers get devices without desktop access |

## Known follow-ups (backend backlog)
- List-all payments endpoint (cross-portfolio Repayments/Charges registers)
- Gold/housing applications merged into GET /applications (live appraisal queue)
- Remaining hardcoded staff-role arrays: agents.service, underwriting.service
  (same 403 class fixed centrally for loans/emi in `cdb11d1`)
- Notifications API with unread counts (mobile home badge TODO)
- Maker-checker engine, migration status API (unblock 3.1 / 4.2)
