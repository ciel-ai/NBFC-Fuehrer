-- Schema drift fix: schema.prisma declares enach_mandates.application_id
-- (a mandate is created against the loan application first — after eSign,
-- before disbursement — then linked to the real loan account once it
-- exists, via loan_account_id) and documents loan_account_id as nullable
-- for exactly that reason. The live database had neither: application_id
-- didn't exist at all, and loan_account_id was NOT NULL, contradicting
-- the documented design. This blocked NACH mandate registration
-- (payments.repository.ts findMandateByApplicationId /
-- createMandateForApplication) for every loan product, not just CDL.

ALTER TABLE "enach_mandates" ALTER COLUMN "loan_account_id" DROP NOT NULL;

ALTER TABLE "enach_mandates" ADD COLUMN "application_id" UUID;

ALTER TABLE "enach_mandates"
    ADD CONSTRAINT "enach_mandates_application_id_fkey"
    FOREIGN KEY ("application_id") REFERENCES "loan_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "enach_mandates_application_id_idx" ON "enach_mandates"("application_id");
