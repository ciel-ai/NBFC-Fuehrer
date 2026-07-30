DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_deficit_amount_nonneg') THEN
    ALTER TABLE "gold_auctions" ADD CONSTRAINT "chk_deficit_amount_nonneg"
      CHECK (deficit_amount IS NULL OR deficit_amount >= 0::numeric);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_surplus_amount_nonneg') THEN
    ALTER TABLE "gold_auctions" ADD CONSTRAINT "chk_surplus_amount_nonneg"
      CHECK (surplus_amount IS NULL OR surplus_amount >= 0::numeric);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recommended_amount_nonneg') THEN
    ALTER TABLE "underwriting_reports" ADD CONSTRAINT "chk_recommended_amount_nonneg"
      CHECK (recommended_amount IS NULL OR recommended_amount >= 0::numeric);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_max_eligible_amount_nonneg') THEN
    ALTER TABLE "underwriting_reports" ADD CONSTRAINT "chk_max_eligible_amount_nonneg"
      CHECK (max_eligible_amount IS NULL OR max_eligible_amount >= 0::numeric);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "one_non_cancelled_mandate_per_account"
  ON "enach_mandates" ("loan_account_id")
  WHERE "status" <> 'CANCELLED' AND "loan_account_id" IS NOT NULL;