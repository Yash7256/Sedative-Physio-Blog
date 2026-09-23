-- AlterTable: add tutor designation
ALTER TABLE "Tutor" ADD COLUMN "designation" TEXT;

-- AlterTable: course metadata fields
ALTER TABLE "Course" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'Beginner';
ALTER TABLE "Course" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'English';
ALTER TABLE "Course" ADD COLUMN "estimatedHours" INTEGER;

-- AlterTable: course highlights ("what you get")
ALTER TABLE "Course" ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT '{}';

-- Rename previewImage -> thumbnail
ALTER TABLE "Course" RENAME COLUMN "previewImage" TO "thumbnail";