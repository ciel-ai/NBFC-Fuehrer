-- CDL product details had nowhere to live.
--
-- cdlSubmitApplicationSchema has always validated productPrice, downPayment
-- and productCategory, and cdlLoans.service.ts has always ignored all three:
-- submitApplication never passed them to the repository, and
-- loan_applications had no column to hold them. Every CDL application
-- persisted since launch is missing the invoice value of the item financed,
-- the customer's down payment, and the product category — the three facts
-- that distinguish a consumer-durable loan from a generic personal loan.
--
-- Additive and nullable, for two reasons:
--   1. Gold and housing applications share this table and finance no product,
--      so NOT NULL is wrong for them.
--   2. Existing CDL rows cannot be backfilled — the values were never
--      captured anywhere, not in the row, not in an audit log. NULL is the
--      honest representation of "we did not record this", and lets reporting
--      distinguish pre-migration rows from a genuine zero down payment.
--
-- product_value is the item's invoice value, NOT the loan principal:
-- amount_requested = product_value - down_payment. The two are separate
-- business facts and both are needed for LTV and for the KFS document.

ALTER TABLE "loan_applications" ADD COLUMN "product_value" DECIMAL(15,2);
ALTER TABLE "loan_applications" ADD COLUMN "down_payment" DECIMAL(15,2);
ALTER TABLE "loan_applications" ADD COLUMN "product_category" VARCHAR(50);

-- Same non-negative guard the existing money columns on this table carry
-- (amount_requested, approved_amount). NULL passes, as it must.
ALTER TABLE "loan_applications"
    ADD CONSTRAINT "loan_applications_product_value_non_negative"
    CHECK ("product_value" IS NULL OR "product_value" >= 0);

ALTER TABLE "loan_applications"
    ADD CONSTRAINT "loan_applications_down_payment_non_negative"
    CHECK ("down_payment" IS NULL OR "down_payment" >= 0);
