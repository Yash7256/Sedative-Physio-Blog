-- CreateTable
CREATE TABLE "Model3D" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "jsDelivrUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model3D_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Model3D_createdAt_idx" ON "Model3D"("createdAt");