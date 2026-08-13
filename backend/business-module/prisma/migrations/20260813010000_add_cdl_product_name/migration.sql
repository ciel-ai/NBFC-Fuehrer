-- A dedicated home for the CDL product name.
--
-- cdlLoans.service.ts has always written the product name into
-- loan_applications.purpose, the generic loan-purpose column that gold and
-- housing applications also use for their own, unrelated meaning. Two business
-- facts sharing one column means neither can be queried honestly: you cannot
-- ask "what items did we finance last quarter" without also matching gold
-- loans whose purpose happens to read like a product, and you cannot record a
-- genuine loan purpose on a CDL application at all.
--
-- Nullable and additive. Gold/housing rows keep product_name NULL, which is
-- correct — they finance no product.

ALTER TABLE "loan_applications" ADD COLUMN "product_name" VARCHAR(200);

-- Backfill: for existing consumer-durable applications the product name is
-- exactly what is sitting in `purpose` today, because that is where the
-- service put it. This is a lossless copy, not a guess.
--
-- `purpose` is deliberately left in place rather than cleared:
--   * it is NOT NULL, so it cannot be emptied;
--   * the admin applications list and the CAM document already read it, and
--     nulling it would blank those screens for every historical application.
-- New writes populate both — see cdlLoans.service.ts.
UPDATE "loan_applications"
SET "product_name" = "purpose"
WHERE "product_type" = 'CONSUMER_DURABLE'
  AND "product_name" IS NULL;
