-- Backfill: fix payments.user_id rows corrupted by the processNachDebit bug
-- (payments.service.ts, previously wrote emi.loanAccountId into user_id
-- instead of the real customer id from the loan account — fixed in code
-- on Day 1 of the sprint).
--
-- Detection signature: for every row created by the old buggy code,
-- user_id was set equal to the row's own loan_account_id. A genuine,
-- non-corrupted row can only match this by an astronomically unlikely
-- UUID collision, so this is a safe, precise signature. Restricted to
-- channel = 'ENACH' as a second, independent check, since the buggy
-- function only ever wrote that channel.
--
-- Proven correct on 2026-08-07 against a local test database using a
-- deliberately-inserted synthetic corrupted row: dry-run correctly found
-- it, the UPDATE fixed exactly that row and nothing else, and a re-run
-- of the dry-run returned zero rows afterward.
--
-- USAGE: always run the dry-run SELECT first and review the row count.
-- When running against any real environment, wrap the UPDATE in
-- BEGIN / COMMIT, re-run the dry-run SELECT before committing to confirm
-- zero rows remain, and only COMMIT once that's confirmed.

-- STEP 1 — dry run: inspect affected rows. Changes nothing.
SELECT
    p.id            AS payment_id,
    p.loan_account_id,
    p.user_id       AS corrupted_user_id,
    la.user_id      AS correct_user_id,
    p.channel,
    p.status,
    p.initiated_at
FROM payments p
JOIN loan_accounts la ON la.id = p.loan_account_id
WHERE p.channel = 'ENACH'
  AND p.user_id = p.loan_account_id;

-- STEP 2 — the actual fix. Run inside a transaction against any real
-- environment; re-run the Step 1 SELECT before COMMIT to confirm it now
-- returns zero rows.
UPDATE payments p
SET user_id = la.user_id
FROM loan_accounts la
WHERE la.id = p.loan_account_id
  AND p.channel = 'ENACH'
  AND p.user_id = p.loan_account_id;