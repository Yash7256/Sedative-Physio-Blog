-- Baseline for migration applied to database but missing locally.
ALTER TABLE "Note" ALTER COLUMN "isPublished" SET DEFAULT false;
