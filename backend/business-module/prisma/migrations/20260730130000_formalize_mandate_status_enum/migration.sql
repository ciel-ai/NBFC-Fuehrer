DROP INDEX IF EXISTS "one_non_cancelled_mandate_per_account";

CREATE TYPE "enach_mandate_status" AS ENUM ('CREATED', 'PENDING_REGISTRATION', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "enach_mandates"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "enach_mandate_status" USING "status"::"enach_mandate_status",
  ALTER COLUMN "status" SET DEFAULT 'CREATED';

CREATE UNIQUE INDEX "one_non_cancelled_mandate_per_account"
  ON "enach_mandates" ("loan_account_id")
  WHERE "status" <> 'CANCELLED' AND "loan_account_id" IS NOT NULL;