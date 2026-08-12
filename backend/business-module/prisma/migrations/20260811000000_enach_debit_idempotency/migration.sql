-- Prevent duplicate ENACH debit attempts for the same EMI on the same attempt number.
-- Prisma does not support partial unique indexes in schema.prisma — applied here via raw SQL.
-- A partial index (WHERE channel = 'ENACH') means payments via other channels (UPI, cash, etc.)
-- for the same EMI are unaffected.
CREATE UNIQUE INDEX payments_enach_debit_idempotency
    ON payments (emi_id, debit_attempt_no)
    WHERE channel = 'ENACH' AND emi_id IS NOT NULL;