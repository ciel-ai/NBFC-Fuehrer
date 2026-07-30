CREATE TABLE "migration_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_name" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "source_system" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ(6),
    "triggered_by" VARCHAR(100) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "migration_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "migration_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "legacy_id" VARCHAR(100) NOT NULL,
    "new_record_id" UUID,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "migration_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "migration_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "migration_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "migration_batches_entity_type_status_idx" ON "migration_batches"("entity_type", "status");
CREATE INDEX "migration_batches_started_at_idx" ON "migration_batches"("started_at");

CREATE UNIQUE INDEX "migration_records_batch_id_entity_type_legacy_id_key" ON "migration_records"("batch_id", "entity_type", "legacy_id");
CREATE INDEX "migration_records_batch_id_idx" ON "migration_records"("batch_id");
CREATE INDEX "migration_records_entity_type_legacy_id_idx" ON "migration_records"("entity_type", "legacy_id");