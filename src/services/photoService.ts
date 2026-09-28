import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { PhotoInput } from "@/lib/validation/misc";

/**
 * Fotos werden aktuell per URL gespeichert (z. B. iCloud-/Google-Photos-Freigabe, CDN).
 * Später kann hier ein Storage-Adapter (S3, R2, lokales Dateisystem) ergänzt werden,
 * ohne dass sich das Datenmodell ändert.
 */
export async function addPhoto(userId: string, diveId: string, input: PhotoInput) {
  const dive = await db.dive.findFirst({ where: { id: diveId, userId }, select: { id: true } });
  if (!dive) throw new NotFoundError("Dive");
  return db.divePhoto.create({
    data: { diveId, url: input.url, caption: input.caption, speciesId: input.speciesId },
  });
}

export async function deletePhoto(userId: string, id: string) {
  const photo = await db.divePhoto.findFirst({ where: { id, dive: { userId } }, select: { id: true } });
  if (!photo) throw new NotFoundError("Photo");
  await db.divePhoto.delete({ where: { id } });
}
