-- DropIndex
ALTER TABLE "Note" DROP CONSTRAINT "Note_fileKey_key";

-- DropColumn
ALTER TABLE "Note" DROP COLUMN "userId";

-- DropColumn
ALTER TABLE "Note" DROP COLUMN "contentType";

-- DropColumn
ALTER TABLE "Note" DROP COLUMN "imageExpected";

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "fileKey" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "isPublished" SET DEFAULT true;