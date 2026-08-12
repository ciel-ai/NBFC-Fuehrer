-- CDL audit: loan_applications had no dedicated employment_type column —
-- the customer's SALARIED/SELF_EMPLOYED status (used to determine the
-- permitted interest-rate set at submission, per cdlLoans.service.ts's
-- CDL_INTEREST_RATES) was validated on the way in and then silently
-- discarded, same class of gap migration 20260813000000_add_cdl_product_fields
-- fixed for productValue/downPayment/productCategory.
--
-- Nullable, deliberately: existing gold/housing applications never set this
-- (same as product_name/product_value/product_category) and stay NULL
-- permanently, and existing CDL applications predate this column with no
-- reliable source to backfill it from (customers.employment_type is a
-- separate, mutable, general profile field — using it to guess a past
-- application's employment type would be presenting a guess as a decided
-- fact, exactly what this fix must not do). Those rows are documented as
-- requiring manual/back-office correction if the value is ever needed
-- (audit review, MIS), not silently assigned.
--
-- Only SALARIED/SELF_EMPLOYED — STUDENT was accepted by the request
-- validation this column's writer replaces, but was never an officially
-- confirmed CDL value (see the enum's own comment in schema.prisma).

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('SALARIED', 'SELF_EMPLOYED');

-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "employment_type" "employment_type";
