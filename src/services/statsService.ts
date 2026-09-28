import { db } from "@/lib/db";
import type { OverviewStats } from "@/types";

export async function getOverviewStats(userId: string): Promise<OverviewStats> {
  const [agg, avgDepthAgg, deepest, speciesByCategoryRows, totalSightings, sites, topRaw, diveCountries] =
    await Promise.all([
      db.dive.aggregate({
        where: { userId },
        _count: { _all: true },
        _sum: { duration: true },
        _avg: { duration: true, maxDepth: true },
        _max: { maxDepth: true },
      }),
      db.dive.aggregate({ where: { userId }, _avg: { avgDepth: true } }),
      db.dive.findFirst({
        where: { userId, maxDepth: { not: null } },
        orderBy: { maxDepth: "desc" },
        select: { id: true },
      }),
      db.species.groupBy({
        by: ["category"],
        where: { sightings: { some: { dive: { userId } } } },
        _count: { _all: true },
      }),
      db.sighting.count({ where: { dive: { userId } } }),
      db.diveSite.findMany({
        where: { userId, dives: { some: {} } },
        select: { id: true, country: true, _count: { select: { dives: true } } },
      }),
      db.sighting.groupBy({
        by: ["speciesId"],
        where: { dive: { userId } },
        _count: { _all: true },
        orderBy: { _count: { speciesId: "desc" } },
        take: 5,
      }),
      db.diveSite.groupBy({
        by: ["country"],
        where: { userId, dives: { some: {} } },
      }),
    ]);

  const topSpeciesRows = await db.species.findMany({
    where: { id: { in: topRaw.map((t) => t.speciesId) } },
    select: { id: true, commonName: true, category: true },
  });
  const byId = new Map(topSpeciesRows.map((s) => [s.id, s]));

  const divesByCountryMap = new Map<string, number>();
  for (const site of sites) {
    const key = site.country ?? "Unknown";
    divesByCountryMap.set(key, (divesByCountryMap.get(key) ?? 0) + site._count.dives);
  }

  const speciesByCategory = speciesByCategoryRows
    .map((r) => ({ category: r.category, count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDives: agg._count._all,
    totalMinutes: agg._sum.duration ?? 0,
    avgDuration: agg._avg.duration,
    maxDepth: agg._max.maxDepth,
    deepestDiveId: deepest?.id ?? null,
    avgDepth: avgDepthAgg._avg.avgDepth,
    avgMaxDepth: agg._avg.maxDepth,
    totalSpecies: speciesByCategory.reduce((sum, c) => sum + c.count, 0),
    totalSightings,
    speciesByCategory,
    countries: diveCountries.filter((c) => c.country).length,
    diveSites: sites.length,
    topSpecies: topRaw
      .map((t) => {
        const s = byId.get(t.speciesId);
        return s ? { id: s.id, commonName: s.commonName, category: s.category, count: t._count._all } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    divesByCountry: [...divesByCountryMap.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
  };
}
