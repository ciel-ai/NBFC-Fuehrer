-- eStamp is legally separate from eSign — RBI requires both a signed AND
-- stamped agreement before disbursement. The eSign provider already returns
-- a real eStamp result (applyEStamp()), but until now it was never persisted
-- anywhere, so no disbursement gate could actually verify it happened.
ALTER TABLE "kyc_documents" ADD COLUMN "estamp_id" VARCHAR(100);
ALTER TABLE "kyc_documents" ADD COLUMN "estamp_status" VARCHAR(30);
