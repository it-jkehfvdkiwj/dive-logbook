import { db } from "@/lib/db";

export interface MapDive {
  id: string;
  date: string; // YYYY-MM-DD
  diveNumber: number | null;
  maxDepth: number | null;
  duration: number | null;
  favorite: boolean;
}

export interface MapSite {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  locationEdited: boolean;
  diveCount: number;
  maxDepth: number | null;
  speciesCount: number;
  lastDate: string;
  dives: MapDive[];
}

/** Alle Tauchplätze des Users mit ihren Tauchgängen – Grundlage für die Karte. */
export async function getMapSites(userId: string): Promise<MapSite[]> {
  const sites = await db.diveSite.findMany({
    where: { userId, dives: { some: {} } },
    include: {
      dives: {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        select: {
          id: true,
          date: true,
          diveNumber: true,
          maxDepth: true,
          duration: true,
          favorite: true,
          sightings: { select: { speciesId: true } },
        },
      },
    },
  });

  return sites
    .map((s) => {
      const species = new Set(s.dives.flatMap((d) => d.sightings.map((x) => x.speciesId)));
      const depths = s.dives.map((d) => d.maxDepth).filter((x): x is number => x != null);
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        country: s.country,
        countryCode: s.countryCode,
        latitude: s.latitude,
        longitude: s.longitude,
        locationEdited: s.locationEdited,
        diveCount: s.dives.length,
        maxDepth: depths.length ? Math.max(...depths) : null,
        speciesCount: species.size,
        lastDate: s.dives[0].date.toISOString().slice(0, 10),
        dives: s.dives.map((d) => ({
          id: d.id,
          date: d.date.toISOString().slice(0, 10),
          diveNumber: d.diveNumber,
          maxDepth: d.maxDepth,
          duration: d.duration,
          favorite: d.favorite,
        })),
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}
