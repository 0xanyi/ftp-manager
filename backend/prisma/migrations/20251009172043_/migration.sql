-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "fk_audit_logs_actor";

-- DropIndex
DROP INDEX "public"."idx_audit_logs_created_at";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_audit_logs_action" RENAME TO "audit_logs_action_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_entity" RENAME TO "audit_logs_entity_type_entity_id_idx";
