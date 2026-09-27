-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "DiveSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiveSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dive" (
    "id" TEXT NOT NULL,
    "diveNumber" INTEGER,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "diveSiteId" TEXT NOT NULL,
    "maxDepth" DOUBLE PRECISION,
    "avgDepth" DOUBLE PRECISION,
    "duration" INTEGER,
    "waterTemperature" DOUBLE PRECISION,
    "visibility" DOUBLE PRECISION,
    "conditions" TEXT,
    "current" TEXT,
    "weather" TEXT,
    "entryType" TEXT,
    "diveType" TEXT,
    "buddy" TEXT,
    "diveCenter" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "manuallyEditedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "description" TEXT,
    "imageUrl" TEXT,
    "slug" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sighting" (
    "id" TEXT NOT NULL,
    "diveId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "count" INTEGER,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivePhoto" (
    "id" TEXT NOT NULL,
    "diveId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "speciesId" TEXT,
    "takenAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL DEFAULT 'Diver',
    "syncOverwriteManualEdits" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiveSite_name_idx" ON "DiveSite"("name");

-- CreateIndex
CREATE INDEX "DiveSite_country_idx" ON "DiveSite"("country");

-- CreateIndex
CREATE UNIQUE INDEX "DiveSite_source_externalId_key" ON "DiveSite"("source", "externalId");

-- CreateIndex
CREATE INDEX "Dive_date_idx" ON "Dive"("date");

-- CreateIndex
CREATE INDEX "Dive_favorite_idx" ON "Dive"("favorite");

-- CreateIndex
CREATE UNIQUE INDEX "Dive_source_externalId_key" ON "Dive"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Species_scientificName_key" ON "Species"("scientificName");

-- CreateIndex
CREATE UNIQUE INDEX "Species_slug_key" ON "Species"("slug");

-- CreateIndex
CREATE INDEX "Species_commonName_idx" ON "Species"("commonName");

-- CreateIndex
CREATE INDEX "Species_category_idx" ON "Species"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Species_source_externalId_key" ON "Species"("source", "externalId");

-- CreateIndex
CREATE INDEX "Sighting_speciesId_idx" ON "Sighting"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "Sighting_diveId_speciesId_key" ON "Sighting"("diveId", "speciesId");

-- CreateIndex
CREATE INDEX "DivePhoto_diveId_idx" ON "DivePhoto"("diveId");

-- AddForeignKey
ALTER TABLE "Dive" ADD CONSTRAINT "Dive_diveSiteId_fkey" FOREIGN KEY ("diveSiteId") REFERENCES "DiveSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_diveId_fkey" FOREIGN KEY ("diveId") REFERENCES "Dive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivePhoto" ADD CONSTRAINT "DivePhoto_diveId_fkey" FOREIGN KEY ("diveId") REFERENCES "Dive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivePhoto" ADD CONSTRAINT "DivePhoto_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE SET NULL ON UPDATE CASCADE;
