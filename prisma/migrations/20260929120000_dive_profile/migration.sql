-- CreateTable
CREATE TABLE "DiveProfile" (
    "id" TEXT NOT NULL,
    "diveId" TEXT NOT NULL,
    "samples" JSONB NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiveProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiveProfile_diveId_key" ON "DiveProfile"("diveId");

-- AddForeignKey
ALTER TABLE "DiveProfile" ADD CONSTRAINT "DiveProfile_diveId_fkey" FOREIGN KEY ("diveId") REFERENCES "Dive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
