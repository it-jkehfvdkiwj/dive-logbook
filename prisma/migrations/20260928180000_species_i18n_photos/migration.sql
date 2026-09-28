-- AlterTable
ALTER TABLE "User" ADD COLUMN     "speciesNameLang" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Species" ADD COLUMN     "commonNameDe" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "imageAttribution" TEXT,
ADD COLUMN     "inatTaxonId" INTEGER;

-- CreateIndex
CREATE INDEX "Species_commonNameDe_idx" ON "Species"("commonNameDe");
