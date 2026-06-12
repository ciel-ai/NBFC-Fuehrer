# Build Prompt — Sales Team Module (FUEHRER-NBFC mobile app)

> Paste this whole file as the task for the coding agent. It is written against the
> **actual** code in `frontend/`. Do not invent stacks, tokens, or components — the
> ones named below already exist and MUST be reused.

---

## 0. Objective

Add a complete **Sales Team** module to the existing FUEHRER-NBFC React Native app so
loan-origination agents can log in per product and run CDL, Gold Loan, and Affordable
Housing applications end-to-end. It must be **visually and behaviourally
indistinguishable** from the current customer experience — same design system, same
components, same navigation feel.

**This is an extension, not a redesign.** If you find yourself creating a new color,
font, button, card, spacing value, or animation, stop — the equivalent already exists.

---

## 1. Stack (already in `frontend/package.json` — do NOT add deps without justification)

- Expo SDK ~54, React Native 0.81.5, React 19, TypeScript ~5.9
- **Routing:** `expo-router` v6 — file-based, route groups under `app/`
- **Client state:** `zustand` v5 (`src/store/*`)
- **Server state / async:** `@tanstack/react-query` v5
- **Forms + validation:** `react-hook-form` v7 + `zod` v3 + `@hookform/resolvers` (`zodResolver`)
- **Animations:** `react-native-reanimated` v4 (+ `react-native-worklets`)
- **Icons:** `@expo/vector-icons` → **Ionicons** (`keyof typeof Ionicons.glyphMap`)
- **Fonts:** Inter via `@expo-google-fonts/inter` — **only 4 weights are loaded**
  (`Inter_400Regular/500Medium/600SemiBold/700Bold`). Do not reference any other weight.
- **Storage:** `expo-secure-store` (PII) + AsyncStorage, via `src/core/storage/storage`
  (`secureStorage`, `appStorage`)
- **Camera / files:** `expo-camera`, `expo-image-picker`
- **Other:** `expo-haptics`, `react-native-skeleton-placeholder`, `react-native-svg`,
  `react-native-safe-area-context`, `expo-local-authentication`, `expo-screen-capture`
- **Path alias:** `@/...` maps to `frontend/` (babel-plugin-module-resolver). Always import with `@/src/...`.

**Golden rules**
1. **Mock-first.** All data flows through the service layer and is switched by `USE_MOCK`
   (`Config.EXPO_PUBLIC_USE_MOCK`). Build mocks first so every screen runs with no backend.
2. **TypeScript strict** — no `any` in public signatures; model everything in `src/entities/*`.
3. **iOS + Android parity** — test both; use `KeyboardAvoidingView` (`behavior` per
   `Platform.OS`), `SafeAreaView`, and `scale()/moderateScale()` for all sizing.
4. **Accessibility** — every interactive element gets `accessibilityRole/Label/State`
   (match how existing components do it, e.g. `Button.tsx`, `EmptyState.tsx`).

---

## 2. Design-system contract (import these — never hardcode)

```ts
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { scale, moderateScale } from '@/src/core/utils/responsive';
```

- **Colors** — `Colors.primary` (#1A56DB), `primaryLight`, `navy`, `gold/goldLight/goldDark`,
  `success/successLight`, `error/errorLight`, `warning`, `background`, `backgroundLight`,
  `surface`, `border`, `textPrimary/textSecondary/textDisabled/textWhite`, `cardBackground`,
  product accents (`teal/tealLight`, `purple/purpleLight`). **No new hex values.**
- **Typography** — use the named styles (`headingLarge/Medium/Small`, `body/bodyLarge/bodyMedium`,
  `buttonText`, `caption/captionMedium`, `label`, `tiny`) plus `FontFamily`/`FontSize`. Font size
  goes through `FontSize.*` (already `moderateScale`-d).
- **Spacing** — `Spacing.xs..xxxl` (4/8/16/24/32/48/64). `BorderRadius.sm..full`. `Shadow.small/medium/large`.

**DON'T:** literal pixel paddings, `fontWeight: '600'` in place of `FontFamily.semiBold`
(except where existing code already pairs them), inline `#hex`, ad-hoc shadows, `Dimensions`
math instead of `scale()`.

---

## 3. Component reuse map (these EXIST in `src/shared/components/` — reuse, don't recreate)

| Need | Use |
|---|---|
| Primary/secondary/outline/ghost button (haptics + spring built in) | `common/Button.tsx` |
| Screen header w/ back | `common/Header.tsx` (and `shared/AppHeader.tsx`) |
| Empty list / no-data | `common/EmptyState.tsx` |
| Error / retry | `common/ErrorView.tsx`, `common/ErrorBoundary.tsx` |
| Loading | `common/LoadingSpinner.tsx`, `common/SkeletonLoader.tsx` |
| Numbered “how it works” steps | `common/StepItem.tsx` |
| Feature/benefit chips row | `common/FeatureRow.tsx` |
| Info / callout card | `common/InfoCard.tsx` |
| Success checkmark animation | `common/SuccessIcon.tsx` |
| Status pill | `common/Badge.tsx` |
| OTP entry | `common/OTPInput.tsx` |
| MPIN screens scaffold | `common/MpinScaffold.tsx` |
| Selectable role/option card | `features/auth/components/RoleCard.tsx` |
| Product card | `features/loans/components/LoanProductCard.tsx` |
| Multi-step workflow shell | `features/loans/screens/LoanWorkflowScreen.tsx` |

If a genuinely new primitive is needed, build it in `src/shared/components/common/` using the
same prop/style conventions as the neighbours (study `Button.tsx` + `EmptyState.tsx` first).

**Reference screens to mirror exactly** (the customer equivalents already shipped):
- Product chooser pattern → `app/(main)/apply/consumer-durable.tsx`
- Auth/form pattern → `app/(auth)/login.tsx`
- Role selection pattern → `app/(auth)/role-select.tsx`
- Multi-step CDL/Gold/Housing journeys → everything in `app/(main)/apply/` prefixed
  `cdl-*`, `gold-loan-*`, `housing-*`.

---

## 4. Architecture & file placement (follow the existing feature-based layout)

- **Entities (types):** `src/entities/*.ts`. **Reuse** `consumerDurableLoan.ts`, `goldLoan.ts`,
  `housingLoan.ts`, `loan.ts`, `kyc.ts`, `auth.ts`. Extend them; add a `salesAgent.ts` only for
  net-new agent concepts (agent profile, FDO details, draft envelope).
- **Services:** for each product there is already an interface + mock + real trio
  (`interfaces/IConsumerDurableLoanService.ts`, `mocks/mock*.ts`, `real/real*.ts`) wired in
  `core/services/ServiceProvider.tsx` and consumed via `useServices()`. **Reuse the LOS methods
  that already exist** (`submitApplication`, `runKycChecks`, `runCreditAssessment`,
  `generateAgreement`, `registerNachMandate`, `disburseToMerchant`, …). Add new methods/services
  for sales-only concerns (agent login, FDO/shop lookup, draft persistence, customer search) by:
  1. adding the method to the interface, 2. implementing in the mock, 3. stubbing the real impl,
  4. wiring in `ServiceProvider`. Never call `fetch`/`axios` from a screen.
- **Feature module:** create `src/features/sales/` with
  `{ components, hooks, screens, queries, resolvers, api }` mirroring `features/loans` &
  `features/kyc`. Zod schemas live in `resolvers/` (see `features/kyc/resolvers`).
- **Stores:** add `src/store/salesStore.ts` (zustand) for agent session + active-draft state;
  register it in `storeResetters.ts` like `userStore`/`loanStore` do. Persist PII via
  `secureStorage`, non-PII via `appStorage`, using keys added to `SECURE_STORE_KEYS`
  (`core/utils/constants.ts`) — **never rename existing keys**.
- **Screens are thin route files** under `app/` that compose feature components/hooks. Keep
  business logic in `features/` + `services/`.

---

## 5. Navigation & auth integration (specific edits required)

1. **`src/entities/auth.ts`** — extend `UserRole`:
   `export type UserRole = 'customer' | 'sales';` (update `userStore`, `SendOTPRequest` callers).
2. **`app/(auth)/role-select.tsx`** — add the **Sales Team** option to `ROLE_OPTIONS`
   (icon `'briefcase'`, the `RoleCard` already supports it). On Continue, if role === `'sales'`
   route to the new **Product Selection** screen instead of `/(auth)/login`.
3. **New route group `app/(sales)/`** (parallel to `(public)/(auth)/(main)`), registered in
   `app/_layout.tsx`’s `<Stack>`. Give it a `_layout.tsx` with the same
   `animation: 'slide_from_right'` + white `contentStyle` as `app/(auth)/_layout.tsx`.
   - `app/(sales)/product-select.tsx` — three product cards (CDL / GL / AHL).
   - `app/(sales)/login/[product].tsx` — product-scoped Employee-ID + Password login.
   - `app/(sales)/(cdl|gold|housing)/dashboard.tsx` + step screens (see §6).
4. **`AuthGuard` in `app/_layout.tsx`** — extend the redirect logic so a `sales`-role
   authenticated agent lands in `/(sales)/...` (its own dashboards) rather than the customer
   `/(main)/(tabs)/home`. Keep the existing customer paths untouched.
5. **Sales auth is Employee ID + Password**, not phone+OTP+MPIN. Add
   `loginSalesAgent({ product, employeeId, password })` and `requestSalesPasswordReset(...)` to
   `IAuthService` (+ mock/real), and a `salesStore` session. Reuse `login.tsx`’s exact form
   UI/UX (Header → KeyboardAvoidingView → ScrollView → labelled inputs via `Controller` +
   `zodResolver` → footer `Button`), just swapping the fields.

---

## 6. Functional scope

### Entry flow (existing, with one addition)
Splash → Get Started → Terms & Conditions → Permissions → **Role Selection (add “Sales Team”)** →
(sales) Product Selection.

### Product Selection — `app/(sales)/product-select.tsx`
Three cards using the existing card styling (mirror `consumer-durable.tsx` cards /
`LoanProductCard`): **Consumer Durable Loan (CDL)**, **Gold Loan (GL)**, **Affordable Housing
Loan (AHL)**. Each: Ionicon, title, description, Continue. Reuse existing press animation
(reanimated spring `{ damping: 15, stiffness: 300 }`).

### Product-based login — `app/(sales)/login/[product].tsx`
One screen, parameterised by product. Fields: **Employee ID**, **Password**, **Login**,
**Forgot Password**. Reuse `login.tsx` UI. On success → that product’s LOS dashboard.

### CDL LOS
**Dashboard** tiles: New Application · Draft Applications · Submitted · Approved · Rejected ·
Disbursed (counts from `consumerDurableLoanService`). Use existing dashboard card language.
**Application flow (15 steps), save-as-draft + progress indicator on every step:**
1 FDO Details (FDO Code, Retail Shop Code, Retail Shop Name, Branch) · 2 Personal Details ·
3 PAN Details · 4 Aadhaar Details · 5 Face Match (`expo-camera`) · 6 Occupation Details ·
7 Product Details · 8 Bank Statement Analyser · 9 Expected Loan Details · 10 Product Offer ·
11 Post-Sanction Documents · 12 Bank Details · 13 E-Mandate Registration · 14 Loan Summary ·
15 Submit. **Reuse `IConsumerDurableLoanService` + `consumerDurableLoan.ts`** for KYC/credit/
agreement/NACH/disbursal where they already exist.

### Gold Loan LOS
**Dashboard:** New Gold Loan · Drafts · Valuation Pending · Approved · Rejected · Disbursed.
**Flow (12):** 1 Customer Details · 2 KYC Verification · 3 Gold Details · 4 Gold Assessment ·
5 Gold Images (camera) · 6 Loan Eligibility · 7 Loan Selection · 8 Bank Details · 9 Agreement ·
10 E-Sign · 11 Disbursement Summary · 12 Submit. Reuse `IGoldLoanService` + `goldLoan.ts`.

### Affordable Housing LOS
**Dashboard:** New Lead · Draft Leads · Site Visit Pending · Credit Review · Approved · Rejected ·
Disbursed.
**Flow (17):** 1 Lead Creation · 2 Applicant · 3 Co-Applicant · 4 KYC · 5 Employment ·
6 Income Assessment · 7 Property Details · 8 Property Documents · 9 Legal Verification ·
10 Technical Evaluation · 11 Credit Assessment · 12 Loan Structuring · 13 Sanction Offer ·
14 Bank Details · 15 E-Sign · 16 Disbursement Summary · 17 Submit. Reuse `IHousingLoanService` +
`housingLoan.ts`.

### Shared features (implement once in `features/sales`, reuse across all three LOS)
- **Draft saving + Auto-save** — debounced write to `salesStore` + `appStorage`; resume by id.
- **Offline data capture** — queue mutations; flush on reconnect (use react-query + `onlineManager`,
  already configured in `app/_layout.tsx`).
- **Form validation** — zod schemas in `features/sales/resolvers`, `mode: 'onChange'`.
- **Document upload / PDF upload / Camera capture** — `expo-image-picker` + `expo-camera`.
- **Image compression** before upload.
- **Progress tracking** — step indicator component (extend `StepItem`/`LoanWorkflowScreen`).
- **Search Customer**, **Resume Application**, **Notifications** (reuse `INotificationService`),
  **Application Status Updates** (reuse `Badge` + status flows).

---

## 7. Per-screen deliverables (every screen, every journey)

For **each** screen produce: the populated/“happy” state, **loading** (`SkeletonLoader`/
`LoadingSpinner`), **empty** (`EmptyState`), **error** (`ErrorView` + retry), **validation**
(inline field errors like `login.tsx`), **success** (`SuccessIcon`), and disabled/submitting
states. Footer CTA uses `Button` with `loading`/`disabled` wired to form `isValid` + submit state.

---

## 8. Acceptance criteria

- Drops into existing nav with no visual seam; a customer-side reviewer can’t tell it’s new.
- Zero hardcoded colors/fonts/spacing — only theme tokens.
- No new design primitives unless unavoidable (and then built in the existing style).
- Type-checks under strict TS; runs fully on mocks (`USE_MOCK=true`) with no backend.
- Builds and passes basic flows on **both iOS and Android**.
- Existing customer journeys remain unchanged and unbroken (esp. `AuthGuard`, `userStore`, `role-select`).

---

## 9. Suggested build order

1. Types + routing skeleton: extend `UserRole`, add `(sales)` group + `_layout`, update
   `role-select.tsx` and `AuthGuard`. App navigates Role → Product → Login → empty dashboards.
2. Sales auth: `salesStore`, `IAuthService.loginSalesAgent` (mock), product login screen.
3. CDL LOS end-to-end on mocks (dashboard + 15 steps + draft/auto-save + all states).
4. Gold LOS, then Housing LOS (reuse the CDL step/draft infrastructure).
5. Shared features hardening: offline queue, image compression, customer search, notifications.
6. Stub the `real/*` service methods and confirm the `USE_MOCK` switch compiles both paths.
```
