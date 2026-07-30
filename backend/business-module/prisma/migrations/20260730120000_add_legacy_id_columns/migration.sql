ALTER TABLE "customers" ADD COLUMN "legacy_id" VARCHAR(100);
CREATE INDEX "customers_legacy_id_idx" ON "customers"("legacy_id");

ALTER TABLE "loan_accounts" ADD COLUMN "legacy_id" VARCHAR(100);
CREATE INDEX "loan_accounts_legacy_id_idx" ON "loan_accounts"("legacy_id");

ALTER TABLE "enach_mandates" ADD COLUMN "legacy_id" VARCHAR(100);
CREATE INDEX "enach_mandates_legacy_id_idx" ON "enach_mandates"("legacy_id");

ALTER TABLE "payments" ADD COLUMN "legacy_id" VARCHAR(100);
CREATE INDEX "payments_legacy_id_idx" ON "payments"("legacy_id");