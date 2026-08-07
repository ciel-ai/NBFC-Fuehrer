-- Root-cause fix for the eSign/eStamp per-user-vs-per-application bug
-- (see the "⚠️ KNOWN GAP" comments this replaces in cdlLoans.service.ts,
-- goldLoans.service.ts, and disbursement.service.ts, and commit 919f711).
--
-- esign_request_id / esign_status / estamp_id / estamp_status /
-- signed_agreement_s3_key lived on kyc_documents, which is one row per
-- USER (kyc_documents.user_id is @unique). Agreement signing is a
-- per-APPLICATION concept — a customer's second loan application read the
-- same row as their first, so an already-signed prior loan silently
-- satisfied the disbursement gate for a brand-new, never-signed
-- application. Reproduced live: app #1 signed+disbursed correctly; app #2
-- (same customer, agreement never generated) disbursed anyway.
--
-- Moving these five fields to loan_applications (one row per application —
-- the correct granularity) and adding a real UNIQUE constraint on
-- esign_request_id (previously ungenforced — the webhook used findFirst
-- because nothing guaranteed uniqueness).
--
-- Old kyc_documents columns are intentionally NOT dropped here — left in
-- place, marked DEPRECATED in schema.prisma. Removal is a separate
-- follow-up once nothing reads them.

ALTER TABLE "loan_applications" ADD COLUMN "esign_request_id" VARCHAR(100);
ALTER TABLE "loan_applications" ADD COLUMN "esign_status" VARCHAR(30);
ALTER TABLE "loan_applications" ADD COLUMN "estamp_id" VARCHAR(100);
ALTER TABLE "loan_applications" ADD COLUMN "estamp_status" VARCHAR(30);
ALTER TABLE "loan_applications" ADD COLUMN "signed_agreement_s3_key" VARCHAR(500);

CREATE UNIQUE INDEX "loan_applications_esign_request_id_key" ON "loan_applications"("esign_request_id");
