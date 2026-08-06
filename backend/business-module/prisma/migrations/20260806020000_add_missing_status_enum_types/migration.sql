-- Schema drift fix: schema.prisma declares five status enums
-- (loan_status, emi_status, payment_status, disbursement_status,
-- collection_case_status) but no migration ever created the actual
-- Postgres enum types — every one of these columns was left as a plain
-- VARCHAR. Only enach_mandate_status got the proper enum treatment (see
-- 20260730130000_formalize_mandate_status_enum). Any real write to
-- loan_applications, loan_accounts, emi_schedule, disbursements, payments,
-- or collection_cases fails against a database built from just these
-- migration files, because Prisma's generated client tries to bind the
-- (nonexistent) enum type.
--
-- All six affected columns are converted in place; values already stored
-- match the declared enum members exactly (verified against schema.prisma
-- before writing this migration), so the USING cast is a straight match,
-- not a remapping.

CREATE TYPE "loan_status" AS ENUM (
    'DRAFT', 'KYC_PENDING', 'KYC_REJECTED', 'UNDERWRITING',
    'APPOINTMENT_BOOKED', 'APPRAISAL_PENDING', 'PROPERTY_ASSESSMENT',
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ESIGN_PENDING',
    'DISBURSED', 'ACTIVE', 'CLOSED', 'NPA', 'WRITTEN_OFF'
);

CREATE TYPE "emi_status" AS ENUM (
    'PENDING', 'PAID', 'OVERDUE', 'WAIVED', 'BOUNCED', 'PARTIAL'
);

CREATE TYPE "payment_status" AS ENUM (
    'INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PENDING'
);

CREATE TYPE "disbursement_status" AS ENUM (
    'PENDING', 'INITIATED', 'IN_TRANSIT', 'COMPLETED', 'FAILED', 'REVERSED'
);

CREATE TYPE "collection_case_status" AS ENUM (
    'OPEN', 'RESOLVED', 'CLOSED', 'ESCALATED'
);

ALTER TABLE "loan_applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "loan_applications" ALTER COLUMN "status" TYPE "loan_status" USING "status"::"loan_status";
ALTER TABLE "loan_applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"loan_status";

ALTER TABLE "loan_accounts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "loan_accounts" ALTER COLUMN "status" TYPE "loan_status" USING "status"::"loan_status";
ALTER TABLE "loan_accounts" ALTER COLUMN "status" SET DEFAULT 'DISBURSED'::"loan_status";

ALTER TABLE "emi_schedule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "emi_schedule" ALTER COLUMN "status" TYPE "emi_status" USING "status"::"emi_status";
ALTER TABLE "emi_schedule" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"emi_status";

ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "payment_status" USING "status"::"payment_status";
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"payment_status";

ALTER TABLE "disbursements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "disbursements" ALTER COLUMN "status" TYPE "disbursement_status" USING "status"::"disbursement_status";
ALTER TABLE "disbursements" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"disbursement_status";

ALTER TABLE "collection_cases" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "collection_cases" ALTER COLUMN "status" TYPE "collection_case_status" USING "status"::"collection_case_status";
ALTER TABLE "collection_cases" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"collection_case_status";
