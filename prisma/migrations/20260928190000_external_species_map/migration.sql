-- AlterTable
ALTER TABLE "Dive" ADD COLUMN     "pendingExternalSpecies" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ExternalSpeciesMap" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSpeciesMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSpeciesMap_source_externalId_key" ON "ExternalSpeciesMap"("source", "externalId");

-- AddForeignKey
ALTER TABLE "ExternalSpeciesMap" ADD CONSTRAINT "ExternalSpeciesMap_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE CASCADE ON UPDATE CASCADE;
