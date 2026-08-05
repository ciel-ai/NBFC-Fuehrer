CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_ref" VARCHAR(100),
    "payload" JSONB NOT NULL,
    "amount" DECIMAL(15,2),
    "maker_id" UUID NOT NULL,
    "maker_role" VARCHAR(30) NOT NULL,
    "maker_remarks" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "checker_id" UUID,
    "checker_role" VARCHAR(30),
    "checker_remarks" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "execution_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");
CREATE INDEX "approval_requests_maker_id_idx" ON "approval_requests"("maker_id");
CREATE INDEX "approval_requests_entity_type_entity_id_idx" ON "approval_requests"("entity_type", "entity_id");