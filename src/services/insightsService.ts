import { db } from "@/lib/db";

// Detail-Statistiken (Jahre, Buddies, Rekorde …). Wird in JS berechnet –
// ein Logbuch hat wenige hundert Dives, das ist schneller als viele Einzel-Queries.

export interface RankedItem {
  key: string;
  label: string;
  count: number;
  href: string;
  sub?: string;
  code?: string | null;
}

export interface DiveRecord {
  label: string;
  value: string;
  diveId: string;
  sub: string;
}

export interface DiveInsights {
  years: number[];
  perYear: { year: number; dives: number; minutes: number }[];
  perMonth: number[];
  divingDays: number;
  buddies: RankedItem[];
  soloDives: number;
  buddyCount: number;
  diveCenters: RankedItem[];
  diveCenterCount: number;
  topSites: RankedItem[];
  depthBuckets: { label: string; count: number }[];
  timeOfDay: { label: string; count: number }[];
  records: DiveRecord[];
  firstDive: { id: string; date: Date } | null;
  lastDive: { id: string; date: Date } | null;
}

/** "Anna, Ben & Chris" → ["Anna", "Ben", "Chris"] */
export function splitBuddies(buddy: string | null): string[] {
  if (!buddy) return [];
  return buddy
    .split(/\s*(?:,|;|\/|&|\+|\band\b|\bund\b|\n)\s*/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 1 && !/^(solo|none|keiner|-+)$/i.test(b));
}

const DEPTH_BUCKETS: [string, number, number][] = [
  ["0–10 m", 0, 10],
  ["10–18 m", 10, 18],
  ["18–30 m", 18, 30],
  ["30–40 m", 30, 40],
  ["40 m+", 40, Infinity],
];

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function getDiveInsights(userId: string, year?: number): Promise<DiveInsights> {
  const all = await db.dive.findMany({
    where: { userId },
    select: {
      id: true,
      date: true,
      startTime: true,
      maxDepth: true,
      duration: true,
      waterTemperature: true,
      buddy: true,
      diveCenter: true,
      diveSite: { select: { id: true, name: true, country: true, countryCode: true } },
      _count: { select: { sightings: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Jahresverlauf immer über alle Jahre (inkl. Lücken)
  const yearMap = new Map<number, { dives: number; minutes: number }>();
  for (const d of all) {
    const y = d.date.getUTCFullYear();
    const e = yearMap.get(y) ?? { dives: 0, minutes: 0 };
    e.dives++;
    e.minutes += d.duration ?? 0;
    yearMap.set(y, e);
  }
  const years = [...yearMap.keys()].sort((a, b) => a - b);
  const perYear: DiveInsights["perYear"] = [];
  if (years.length) {
    for (let y = years[0]; y <= years[years.length - 1]; y++) perYear.push({ year: y, ...(yearMap.get(y) ?? { dives: 0, minutes: 0 }) });
  }

  const dives = year ? all.filter((d) => d.date.getUTCFullYear() === year) : all;
  const yearParams = year ? `&from=${year}-01-01&to=${year}-12-31` : "";

  const perMonth = Array.from({ length: 12 }, () => 0);
  const days = new Set<string>();
  const buddyMap = new Map<string, { label: string; count: number; last: Date }>();
  const centerMap = new Map<string, { label: string; count: number }>();
  const siteMap = new Map<string, { label: string; count: number; country: string | null; code: string | null }>();
  const depthBuckets = DEPTH_BUCKETS.map(([label]) => ({ label, count: 0 }));
  const timeOfDay = [
    { label: "Morning", count: 0 },
    { label: "Midday", count: 0 },
    { label: "Afternoon", count: 0 },
    { label: "Night", count: 0 },
  ];
  let soloDives = 0;

  for (const d of dives) {
    perMonth[d.date.getUTCMonth()]++;
    days.add(d.date.toISOString().slice(0, 10));

    const buddies = splitBuddies(d.buddy);
    if (!buddies.length) soloDives++;
    for (const b of buddies) {
      const key = b.toLowerCase();
      const e = buddyMap.get(key) ?? { label: b, count: 0, last: d.date };
      e.count++;
      e.last = d.date;
      buddyMap.set(key, e);
    }

    if (d.diveCenter?.trim()) {
      const key = d.diveCenter.trim().toLowerCase();
      const e = centerMap.get(key) ?? { label: d.diveCenter.trim(), count: 0 };
      e.count++;
      centerMap.set(key, e);
    }

    const s = siteMap.get(d.diveSite.id) ?? { label: d.diveSite.name, count: 0, country: d.diveSite.country, code: d.diveSite.countryCode };
    s.count++;
    siteMap.set(d.diveSite.id, s);

    if (d.maxDepth != null) {
      const i = DEPTH_BUCKETS.findIndex(([, lo, hi]) => d.maxDepth! >= lo && d.maxDepth! < hi);
      if (i >= 0) depthBuckets[i].count++;
    }

    if (d.startTime) {
      const h = Number(d.startTime.slice(0, 2));
      timeOfDay[h >= 5 && h < 11 ? 0 : h >= 11 && h < 14 ? 1 : h >= 14 && h < 18 ? 2 : 3].count++;
    }
  }

  const rank = <T extends { count: number }>(m: Map<string, T>, n: number) =>
    [...m.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).slice(0, n);

  // Rekorde
  const records: DiveRecord[] = [];
  const pick = (
    label: string,
    value: (d: (typeof dives)[number]) => number | null,
    better: "max" | "min",
    format: (v: number) => string,
  ) => {
    let best: (typeof dives)[number] | null = null;
    for (const d of dives) {
      const v = value(d);
      if (v == null) continue;
      if (!best || (better === "max" ? v > value(best)! : v < value(best)!)) best = d;
    }
    if (best) records.push({ label, value: format(value(best)!), diveId: best.id, sub: `${best.diveSite.name} · ${fmtDate(best.date)}` });
  };
  pick("Deepest dive", (d) => d.maxDepth, "max", (v) => `${v.toFixed(1)} m`);
  pick("Longest dive", (d) => d.duration, "max", (v) => `${v} min`);
  pick("Coldest water", (d) => d.waterTemperature, "min", (v) => `${v.toFixed(0)} °C`);
  pick("Warmest water", (d) => d.waterTemperature, "max", (v) => `${v.toFixed(0)} °C`);
  pick("Most species", (d) => (d._count.sightings > 0 ? d._count.sightings : null), "max", (v) => `${v}`);

  return {
    years,
    perYear,
    perMonth,
    divingDays: days.size,
    buddies: rank(buddyMap, 10).map(([key, b]) => ({
      key,
      label: b.label,
      count: b.count,
      href: `/dives?q=${encodeURIComponent(b.label)}${yearParams}`,
      sub: `last ${fmtDate(b.last)}`,
    })),
    soloDives,
    buddyCount: buddyMap.size,
    diveCenterCount: centerMap.size,
    diveCenters: rank(centerMap, 6).map(([key, c]) => ({
      key,
      label: c.label,
      count: c.count,
      href: `/dives?q=${encodeURIComponent(c.label)}${yearParams}`,
    })),
    topSites: rank(siteMap, 8).map(([id, s]) => ({
      key: id,
      label: s.label,
      count: s.count,
      href: `/map?site=${id}`,
      sub: s.country ?? undefined,
      code: s.code,
    })),
    depthBuckets,
    timeOfDay,
    records,
    firstDive: dives[0] ? { id: dives[0].id, date: dives[0].date } : null,
    lastDive: dives.length ? { id: dives[dives.length - 1].id, date: dives[dives.length - 1].date } : null,
  };
}
