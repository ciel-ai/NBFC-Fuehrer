// config/nbfc.constants.ts
//
// Legal / regulatory identity fields required on customer-facing documents
// (KFS, loan agreements, NOC, legal notices).
//
// ⚠️ PENDING CLIENT CONFIRMATION — see Consumer_Loan_Pending_Requirements_Document:
//   #38 NBFC Registration Number
//   #39 Company Registered Address
//   #56 NBFC License Category
//   #57 RBI Certificate of Registration Number
//   #59 Designated Grievance Officer Details
//
// All values below are PLACEHOLDERS. Replace once the client confirms the
// corresponding requirement item. Do not remove the "PENDING" markers until
// the real value is in — they are grepped for in the pre-go-live checklist.

export const NBFC_IDENTITY = {
    legalName: 'Fuehrer Capital',                 // PENDING #56 — confirm registered legal name / license category
    registrationNumber: 'PENDING-CLIENT-INPUT',    // PENDING #38 — NBFC Registration Number
    rbiCorNumber: 'PENDING-CLIENT-INPUT',          // PENDING #57 — RBI Certificate of Registration Number
    registeredAddress: 'PENDING-CLIENT-INPUT',     // PENDING #39 — Company Registered Address
    licenseCategory: 'PENDING-CLIENT-INPUT',       // PENDING #56 — NBFC License Category

    grievanceOfficer: {
        name: 'PENDING-CLIENT-INPUT',              // PENDING #59
        email: 'PENDING-CLIENT-INPUT',
        phone: 'PENDING-CLIENT-INPUT',
    },

    // PENDING #61 (data retention) does not affect document rendering — tracked separately.
} as const;

// Interest computation method disclosure — PENDING #37 (client to confirm per product;
// engine already computes reducing-balance, so this is a disclosure-wording default,
// not a calculation change).
export const INTEREST_METHOD_LABEL = 'Reducing Balance Method' as const;

// RBI-mandated cooling-off period (digital lending guidelines). Duration itself is
// not in the pending-requirements doc, but the *value* below should be confirmed
// against the client's compliance policy before go-live — flagged here so it's not
// silently hardcoded and forgotten.
export const COOLING_OFF_PERIOD_DAYS = 3 as const; // ⚠️ confirm with client compliance team