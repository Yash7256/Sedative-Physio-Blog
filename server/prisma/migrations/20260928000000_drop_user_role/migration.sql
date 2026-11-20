-- Remove roles: this site has no admin or role-gated features.
ALTER TABLE "User" DROP COLUMN "role";
