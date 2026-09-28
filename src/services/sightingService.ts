import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import type { SightingCreateInput, SightingUpdateInput } from "@/lib/validation/sighting";

/**
 * Fügt eine Art zu einem Dive hinzu.
 * Eine Art existiert pro Dive nur einmal (Unique diveId+speciesId).
 * Wird dieselbe Art erneut hinzugefügt, wird die bestehende Sichtung aktualisiert
 * statt einen Duplikat-Fehler zu werfen. Dadurch erscheint jede Art automatisch
 * genau einmal in der Life List – mit beliebig vielen Sichtungen über verschiedene Dives.
 */
export async function addSighting(userId: string, input: SightingCreateInput) {
  const [dive, species] = await Promise.all([
    db.dive.findFirst({ where: { id: input.diveId, userId }, select: { id: true } }),
    db.species.findUnique({ where: { id: input.speciesId }, select: { id: true } }),
  ]);
  if (!dive) throw new NotFoundError("Dive");
  if (!species) throw new NotFoundError("Species");

  const existing = await db.sighting.findUnique({
    where: { diveId_speciesId: { diveId: input.diveId, speciesId: input.speciesId } },
  });

  if (existing) {
    const sighting = await db.sighting.update({
      where: { id: existing.id },
      data: {
        count: input.count ?? existing.count,
        notes: input.notes ?? existing.notes,
      },
    });
    return { sighting, created: false };
  }

  const sighting = await db.sighting.create({
    data: { diveId: input.diveId, speciesId: input.speciesId, count: input.count, notes: input.notes },
  });
  return { sighting, created: true };
}

export async function updateSighting(userId: string, id: string, input: SightingUpdateInput) {
  const existing = await db.sighting.findFirst({ where: { id, dive: { userId } }, select: { id: true } });
  if (!existing) throw new NotFoundError("Sighting");
  return db.sighting.update({ where: { id }, data: { count: input.count, notes: input.notes } });
}

export async function deleteSighting(userId: string, id: string) {
  const existing = await db.sighting.findFirst({ where: { id, dive: { userId } }, select: { id: true } });
  if (!existing) throw new NotFoundError("Sighting");
  await db.sighting.delete({ where: { id } });
}

export async function listSightings(userId: string, filter: { diveId?: string; speciesId?: string }) {
  return db.sighting.findMany({
    where: { diveId: filter.diveId, speciesId: filter.speciesId, dive: { userId } },
    include: {
      species: { select: { id: true, commonName: true, scientificName: true, category: true } },
      dive: { select: { id: true, date: true, diveSite: { select: { name: true, country: true } } } },
    },
    orderBy: [{ dive: { date: "desc" } }, { createdAt: "desc" }],
    take: 500,
  });
}
