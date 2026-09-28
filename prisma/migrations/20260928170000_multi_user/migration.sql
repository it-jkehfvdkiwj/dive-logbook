-- Mehrbenutzer-Umbau. Handgeschrieben (statt nur generiert), damit bestehende Daten
-- erhalten bleiben: alle vorhandenen Dives/Sites/Imports gehen an den Owner-Benutzer.
-- Das resultierende Schema entspricht exakt prisma/schema.prisma.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "syncOverwriteManualEdits" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordHash_key" ON "User"("passwordHash");

-- Owner anlegen (übernimmt Name + Sync-Einstellung aus AppSettings), nur wenn es Bestandsdaten gibt.
-- Das Passwort wird beim ersten Login mit APP_PASSWORD gesetzt.
INSERT INTO "User" ("id", "name", "passwordHash", "isAdmin", "syncOverwriteManualEdits", "updatedAt")
SELECT 'owner',
       COALESCE((SELECT "displayName" FROM "AppSettings" WHERE "id" = 1), 'Diver'),
       NULL,
       true,
       COALESCE((SELECT "syncOverwriteManualEdits" FROM "AppSettings" WHERE "id" = 1), false),
       CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "AppSettings")
   OR EXISTS (SELECT 1 FROM "Dive")
   OR EXISTS (SELECT 1 FROM "DiveSite")
   OR EXISTS (SELECT 1 FROM "ImportRun");

-- DropIndex
DROP INDEX "DiveSite_source_externalId_key";

-- DropIndex
DROP INDEX "Dive_source_externalId_key";

-- AlterTable (erst nullable, befüllen, dann NOT NULL)
ALTER TABLE "DiveSite" ADD COLUMN     "userId" TEXT;
ALTER TABLE "Dive" ADD COLUMN     "userId" TEXT;
ALTER TABLE "ImportRun" ADD COLUMN     "userId" TEXT;

UPDATE "DiveSite" SET "userId" = 'owner' WHERE "userId" IS NULL;
UPDATE "Dive" SET "userId" = 'owner' WHERE "userId" IS NULL;
UPDATE "ImportRun" SET "userId" = 'owner' WHERE "userId" IS NULL;

ALTER TABLE "DiveSite" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Dive" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ImportRun" ALTER COLUMN "userId" SET NOT NULL;

-- DropTable
DROP TABLE "AppSettings";

-- CreateIndex
CREATE INDEX "DiveSite_userId_idx" ON "DiveSite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiveSite_userId_source_externalId_key" ON "DiveSite"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "Dive_userId_date_idx" ON "Dive"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Dive_userId_source_externalId_key" ON "Dive"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "ImportRun_userId_startedAt_idx" ON "ImportRun"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "DiveSite" ADD CONSTRAINT "DiveSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dive" ADD CONSTRAINT "Dive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
