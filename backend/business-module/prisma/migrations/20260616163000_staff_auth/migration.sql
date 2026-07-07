-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "branch_id" UUID,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "must_reset_pwd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "username" VARCHAR(50);

-- AlterTable
ALTER TABLE "loan_applications" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "employer_name" VARCHAR(200),
ADD COLUMN     "employment_type" VARCHAR(30),
ADD COLUMN     "flat_house_no" VARCHAR(100),
ADD COLUMN     "monthly_income" DECIMAL(12,2),
ADD COLUMN     "pincode" VARCHAR(6),
ADD COLUMN     "repayment_type" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY_EMI',
ADD COLUMN     "state" VARCHAR(100),
ADD COLUMN     "street_area" VARCHAR(200);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE INDEX "branches_is_active_idx" ON "branches"("is_active");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_admin_user_id_idx" ON "admin_refresh_tokens"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_token_hash_idx" ON "admin_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_expires_at_idx" ON "admin_refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_username_idx" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_branch_id_idx" ON "admin_users"("branch_id");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
