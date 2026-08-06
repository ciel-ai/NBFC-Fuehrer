-- Schema drift fix: kyc_documents.aadhaar_hash / pan_hash have existed in
-- schema.prisma (deterministic SHA-256 fingerprints used to prevent the
-- same PAN/Aadhaar being registered against two different user_ids — see
-- the comment on the kyc_documents model) but no migration ever actually
-- created them in the database. Any real read/write of a kyc_documents
-- row failed against a database built from just these migration files,
-- because Prisma's generated client expects both columns to exist.
ALTER TABLE "kyc_documents" ADD COLUMN "aadhaar_hash" VARCHAR(64);
ALTER TABLE "kyc_documents" ADD COLUMN "pan_hash" VARCHAR(64);

CREATE UNIQUE INDEX "kyc_documents_aadhaar_hash_key" ON "kyc_documents"("aadhaar_hash");
CREATE UNIQUE INDEX "kyc_documents_pan_hash_key" ON "kyc_documents"("pan_hash");
