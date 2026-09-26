-- Clerk becomes the identity provider; this table keeps only domain data.
-- Safe to run against a populated database: every step below is either
-- additive or drops columns that Clerk now owns.

-- AlterTable: add the Clerk join key and the student profile fields.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN "collegeName" TEXT;
-- Tombstone. A Clerk `user.deleted` event must not hard-delete the row:
-- "Order".userId is ON DELETE RESTRICT, so the delete would fail outright, and
-- "Enrollment".userId is ON DELETE CASCADE, so it would silently drop
-- enrolments. The webhook nulls clerkUserId and stamps this instead.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- clerkUserId deliberately stays NULL for pre-existing rows. Matching them to
-- Clerk by email is a separate, reviewable backfill (see auth/webhook.ts
-- re-link logic) — inventing a key here would be worse than a null one,
-- because a wrong key silently attaches a domain profile to the wrong person.

-- email becomes optional: Clerk allows phone-only signups, and this column is
-- now a mirror rather than the login key.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Unique index for the new join key.
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- DropTable: credentials, sessions and one-time tokens are Clerk's now.
DROP TABLE IF EXISTS "RefreshToken";
DROP TABLE IF EXISTS "VerificationToken";

-- DropEnum: only the removed token table used it.
DROP TYPE IF EXISTS "VerificationTokenPurpose";

-- AlterTable: remove the credential and lockout columns the custom auth owned.
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" DROP COLUMN "failedLoginCount";
ALTER TABLE "User" DROP COLUMN "lockedUntil";
ALTER TABLE "User" DROP COLUMN "lastLoginAt";
