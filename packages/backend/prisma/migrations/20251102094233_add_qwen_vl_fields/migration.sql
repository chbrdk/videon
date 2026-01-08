-- AlterTable
ALTER TABLE "vision_analyses" ADD COLUMN IF NOT EXISTS "qwenVLDescription" TEXT,
ADD COLUMN IF NOT EXISTS "qwenVLProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "qwenVLModel" TEXT,
ADD COLUMN IF NOT EXISTS "qwenVLProcessingTime" DOUBLE PRECISION;

-- CreateIndex (optional, falls benötigt)
-- CREATE INDEX IF NOT EXISTS "vision_analyses_qwenVLProcessed_idx" ON "vision_analyses"("qwenVLProcessed");
