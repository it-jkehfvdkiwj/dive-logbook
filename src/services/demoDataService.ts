import { db } from "@/lib/db";
import { deleteOrphanSites } from "./diveSiteService";

export const DEMO_SOURCE = "demo";

export async function countDemoDives(): Promise<number> {
  return db.dive.count({ where: { source: DEMO_SOURCE } });
}

/**
 * Entfernt alle Demo-Tauchgänge (source = "demo") inkl. ihrer Sichtungen und Fotos.
 * Der Arten-Katalog bleibt erhalten – er ist die Grundlage für die Suche.
 */
export async function deleteDemoData(): Promise<{ deletedDives: number }> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.dive.deleteMany({ where: { source: DEMO_SOURCE } });
    await deleteOrphanSites(tx);
    return { deletedDives: count };
  });
}
