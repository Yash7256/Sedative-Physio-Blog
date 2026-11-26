-- Cursor pagination seeks by (createdAt desc, id desc) inside the published
-- filter. Composite indexes let the database seek instead of sorting the whole
-- catalog on every page.

DROP INDEX IF EXISTS "Course_isPublished_idx";

CREATE INDEX "Course_isPublished_createdAt_id_idx" ON "Course"("isPublished", "createdAt", "id");
CREATE INDEX "Note_isPublished_createdAt_id_idx" ON "Note"("isPublished", "createdAt", "id");
CREATE INDEX "Model3D_createdAt_id_idx" ON "Model3D"("createdAt", "id");
