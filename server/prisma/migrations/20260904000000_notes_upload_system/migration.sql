-- Baseline for migration applied to database but missing locally.
-- Reconstructed to match current schema; applied state recorded via resolve.
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "fileKey" TEXT;
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3);
