-- AlterTable
ALTER TABLE "DiveSite" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "locationEdited" BOOLEAN NOT NULL DEFAULT false;
