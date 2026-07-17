-- DropForeignKey
ALTER TABLE "admin_users" DROP CONSTRAINT "admin_users_branch_id_fkey";

-- DropIndex
DROP INDEX "admin_users_branch_id_idx";

-- DropIndex
DROP INDEX "branches_name_key";

-- AlterTable
ALTER TABLE "admin_users" DROP COLUMN "must_reset_pwd",
ADD COLUMN     "is_active" BOOLEAN DEFAULT true,
ADD COLUMN     "must_change_password" BOOLEAN DEFAULT true,
ADD COLUMN     "product" VARCHAR(20) DEFAULT 'ALL',
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "address" VARCHAR(300) NOT NULL,
ADD COLUMN     "lat" DECIMAL(9,6),
ADD COLUMN     "lng" DECIMAL(9,6),
ADD COLUMN     "manager_id" UUID,
ADD COLUMN     "phone" VARCHAR(15),
ADD COLUMN     "pincode" VARCHAR(10) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "working_hours" VARCHAR(100),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "state" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "is_active" DROP NOT NULL;

-- AlterTable
ALTER TABLE "emi_schedule" ADD COLUMN     "last_penalty_applied_date" DATE;

-- AlterTable
ALTER TABLE "enach_mandates" ADD COLUMN     "debit_day" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "loan_applications" DROP COLUMN "city",
DROP COLUMN "employer_name",
DROP COLUMN "employment_type",
DROP COLUMN "flat_house_no",
DROP COLUMN "pincode",
DROP COLUMN "state",
DROP COLUMN "street_area",
ADD COLUMN     "crop_details" VARCHAR(200),
ADD COLUMN     "customer_id" UUID,
ADD COLUMN     "is_priority_sector" BOOLEAN DEFAULT false,
ADD COLUMN     "land_extent" VARCHAR(100),
ADD COLUMN     "loan_purpose" VARCHAR(100),
ADD COLUMN     "nominee_address" TEXT,
ADD COLUMN     "nominee_age" INTEGER,
ADD COLUMN     "nominee_name" VARCHAR(100),
ADD COLUMN     "nominee_relationship" VARCHAR(50),
ADD COLUMN     "preferred_debit_day" INTEGER DEFAULT 4,
ADD COLUMN     "priority_category" VARCHAR(50),
ADD COLUMN     "reference_number" VARCHAR(20),
ADD COLUMN     "survey_number" VARCHAR(50),
ADD COLUMN     "taluk" VARCHAR(100),
ADD COLUMN     "village" VARCHAR(100);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "flat_house_no" VARCHAR(100),
    "street_area" VARCHAR(200),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(6),
    "employment_type" VARCHAR(30),
    "employer_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grievances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "loan_account_id" UUID,
    "reference_number" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "assigned_to" UUID,
    "resolution_notes" TEXT,
    "raised_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_due_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "escalated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grievances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureau_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bureau_report_id" UUID NOT NULL,
    "lender" VARCHAR(100),
    "account_type" VARCHAR(50),
    "sanctioned_amount" DECIMAL(15,2),
    "outstanding_amount" DECIMAL(15,2),
    "opened_on" DATE,
    "status" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureau_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureau_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL DEFAULT 'CIBIL',
    "score" SMALLINT NOT NULL,
    "report_date" DATE NOT NULL,
    "enquiries_6m" SMALLINT,
    "total_accounts" SMALLINT,
    "active_accounts" SMALLINT,
    "overdue_accounts" SMALLINT,
    "oldest_account_years" DECIMAL(4,1),
    "payment_history" JSONB,
    "raw_payload" JSONB,
    "pulled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureau_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "preferred_date" DATE NOT NULL,
    "preferred_slot" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'BOOKED',
    "visit_notes" VARCHAR(500),
    "arrived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collateral_gold" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL,
    "net_weight_grams" DECIMAL(8,2) NOT NULL,
    "gross_weight_grams" DECIMAL(8,2) NOT NULL,
    "purity_karat" SMALLINT NOT NULL,
    "rate_per_gram" DECIMAL(10,2) NOT NULL,
    "valuation" DECIMAL(15,2) NOT NULL,
    "ltv_pct" DECIMAL(5,2) NOT NULL,
    "items" JSONB NOT NULL,
    "valued_by" VARCHAR(100) NOT NULL,
    "valued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "custody_status" VARCHAR(20) NOT NULL DEFAULT 'IN_CUSTODY',
    "vault_location" VARCHAR(100),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "released_by" VARCHAR(100),
    "release_reason" VARCHAR(30),

    CONSTRAINT "collateral_gold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collateral_property" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL,
    "property_type" VARCHAR(50) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "market_value" DECIMAL(15,2) NOT NULL,
    "ltv_pct" DECIMAL(5,2) NOT NULL,
    "builder_name" VARCHAR(100),
    "construction_stage" VARCHAR(50),
    "valued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collateral_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_auctions" (
    "id" UUID NOT NULL,
    "loan_account_id" UUID NOT NULL,
    "loan_application_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NOTICE_SENT',
    "auction_type" VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    "notice_sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notice_period_days" INTEGER NOT NULL DEFAULT 14,
    "scheduled_date" TIMESTAMPTZ(6),
    "reserve_price" DECIMAL(15,2),
    "actual_sale_price" DECIMAL(15,2),
    "outstanding_dues" DECIMAL(15,2),
    "surplus_amount" DECIMAL(15,2),
    "deficit_amount" DECIMAL(15,2),
    "auctioned_by" VARCHAR(100),
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gold_auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "name" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(20) NOT NULL DEFAULT 'READ',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "normal_balance" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "reference_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "debit_account" VARCHAR(20) NOT NULL,
    "credit_account" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "narration" VARCHAR(300) NOT NULL,
    "posted_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_reports" (
    "id" UUID NOT NULL,
    "run_date" DATE NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "total_expected" DECIMAL(15,2) NOT NULL,
    "total_actual" DECIMAL(15,2) NOT NULL,
    "variance" DECIMAL(15,2) NOT NULL,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unmatched_count" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "request_path" VARCHAR(200) NOT NULL,
    "response" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_sequences" (
    "sequence_key" VARCHAR(50) NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("sequence_key")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "product_type" VARCHAR(30) NOT NULL,
    "min_amount" DECIMAL(15,2) NOT NULL,
    "max_amount" DECIMAL(15,2) NOT NULL,
    "min_rate" DECIMAL(5,2) NOT NULL,
    "max_rate" DECIMAL(5,2) NOT NULL,
    "max_tenure_months" SMALLINT NOT NULL,
    "processing_fee_pct" DECIMAL(5,3) NOT NULL,
    "insurance_pct" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "stamp_duty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "documentation_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_ltv_pct" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appraiser_fee" DECIMAL(10,2) DEFAULT 0,
    "second_appraiser_fee" DECIMAL(10,2) DEFAULT 0,
    "incidental_charges" DECIMAL(10,2) DEFAULT 0,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("product_type")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "customers_user_id_idx" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "grievances_reference_number_key" ON "grievances"("reference_number");

-- CreateIndex
CREATE INDEX "grievances_user_id_idx" ON "grievances"("user_id");

-- CreateIndex
CREATE INDEX "grievances_status_idx" ON "grievances"("status");

-- CreateIndex
CREATE INDEX "grievances_loan_account_id_idx" ON "grievances"("loan_account_id");

-- CreateIndex
CREATE INDEX "bureau_accounts_report_id_idx" ON "bureau_accounts"("bureau_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "bureau_reports_loan_id_key" ON "bureau_reports"("loan_id");

-- CreateIndex
CREATE INDEX "bureau_reports_loan_id_idx" ON "bureau_reports"("loan_id");

-- CreateIndex
CREATE INDEX "bureau_reports_score_idx" ON "bureau_reports"("score");

-- CreateIndex
CREATE INDEX "appointments_loan_id_idx" ON "appointments"("loan_id");

-- CreateIndex
CREATE INDEX "appointments_branch_id_idx" ON "appointments"("branch_id");

-- CreateIndex
CREATE INDEX "appointments_customer_id_idx" ON "appointments"("customer_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_preferred_date_idx" ON "appointments"("preferred_date");

-- CreateIndex
CREATE UNIQUE INDEX "collateral_gold_loan_id_key" ON "collateral_gold"("loan_id");

-- CreateIndex
CREATE INDEX "collateral_gold_loan_id_idx" ON "collateral_gold"("loan_id");

-- CreateIndex
CREATE INDEX "collateral_gold_custody_status_idx" ON "collateral_gold"("custody_status");

-- CreateIndex
CREATE UNIQUE INDEX "collateral_property_loan_id_key" ON "collateral_property"("loan_id");

-- CreateIndex
CREATE INDEX "collateral_property_loan_id_idx" ON "collateral_property"("loan_id");

-- CreateIndex
CREATE INDEX "gold_auctions_loan_account_id_idx" ON "gold_auctions"("loan_account_id");

-- CreateIndex
CREATE INDEX "gold_auctions_status_idx" ON "gold_auctions"("status");

-- CreateIndex
CREATE INDEX "role_permissions_role_name_idx" ON "role_permissions"("role_name");

-- CreateIndex
CREATE INDEX "role_permissions_module_idx" ON "role_permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_name_module_action_key" ON "role_permissions"("role_name", "module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_code_key" ON "gl_accounts"("code");

-- CreateIndex
CREATE INDEX "gl_accounts_code_idx" ON "gl_accounts"("code");

-- CreateIndex
CREATE INDEX "gl_accounts_type_idx" ON "gl_accounts"("type");

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_debit_account_idx" ON "journal_entries"("debit_account");

-- CreateIndex
CREATE INDEX "journal_entries_credit_account_idx" ON "journal_entries"("credit_account");

-- CreateIndex
CREATE INDEX "reconciliation_reports_run_date_idx" ON "reconciliation_reports"("run_date");

-- CreateIndex
CREATE INDEX "reconciliation_reports_report_type_idx" ON "reconciliation_reports"("report_type");

-- CreateIndex
CREATE INDEX "reconciliation_reports_status_idx" ON "reconciliation_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "admin_users_product_idx" ON "admin_users"("product");

-- CreateIndex
CREATE INDEX "branches_city_idx" ON "branches"("city");

-- CreateIndex
CREATE UNIQUE INDEX "loan_applications_reference_number_key" ON "loan_applications"("reference_number");

-- CreateIndex
CREATE INDEX "loan_applications_customer_id_idx" ON "loan_applications"("customer_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_loan_account_id_fkey" FOREIGN KEY ("loan_account_id") REFERENCES "loan_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bureau_accounts" ADD CONSTRAINT "bureau_accounts_bureau_report_id_fkey" FOREIGN KEY ("bureau_report_id") REFERENCES "bureau_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bureau_reports" ADD CONSTRAINT "bureau_reports_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collateral_gold" ADD CONSTRAINT "collateral_gold_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collateral_property" ADD CONSTRAINT "collateral_property_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loan_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "gold_auctions" ADD CONSTRAINT "gold_auctions_loan_account_id_fkey" FOREIGN KEY ("loan_account_id") REFERENCES "loan_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_auctions" ADD CONSTRAINT "gold_auctions_loan_application_id_fkey" FOREIGN KEY ("loan_application_id") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_name_fkey" FOREIGN KEY ("role_name") REFERENCES "roles"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_debit_account_fkey" FOREIGN KEY ("debit_account") REFERENCES "gl_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_credit_account_fkey" FOREIGN KEY ("credit_account") REFERENCES "gl_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

