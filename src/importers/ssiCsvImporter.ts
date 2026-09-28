import type { DiveImporter, ImportedDive } from "./types";

/**
 * Fallback-Import: CSV-Export von my.divessi.com (Logbuch → Export).
 * Spalten laut Export: dive #, Dive Site, Country, Date / Time, Dive Activity,
 * Specialty Dive, Dive type, Duration, Depth, Dive Buddy / Instructor / Center
 *
 * Der Parser ist tolerant gegenüber Trennzeichen (, ; Tab), Anführungszeichen,
 * BOM, Zeilenenden und verschiedenen Datums-/Zahlenformaten.
 */
export class SSICsvImporter implements DiveImporter {
  readonly source = "ssi-csv";
  readonly label = "SSI (CSV file)";
  private log: string[] = [];

  constructor(private readonly csv: string) {}

  async importDives(): Promise<ImportedDive[]> {
    const { dives, diagnostics } = parseSsiCsv(this.csv);
    this.log = diagnostics;
    if (!dives.length) throw new Error("No dives found in this file. Is it the CSV export from my.divessi.com?");
    return dives;
  }

  diagnostics(): string[] {
    return this.log;
  }
}

// ---------------------------------------------------------------------------

export function splitCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = text.split("\n", 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (h: string) => h.toLowerCase().replace(/\s+/g, " ").trim();

function number(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** "45", "45 min", "0:45", "00:45:00" → Minuten */
function minutes(v: string | undefined): number | null {
  if (!v) return null;
  const hms = v.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) return Number(hms[1]) * 60 + Number(hms[2]) + Math.round(Number(hms[3] ?? 0) / 60);
  const n = number(v);
  return n != null ? Math.round(n) : null;
}

function dateTime(v: string | undefined): { date: string | null; time: string | null } {
  if (!v) return { date: null, time: null };
  const s = v.trim();
  const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
  const time =
    timeMatch && Number(timeMatch[1]) < 24 ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : null;

  let y: string | undefined, m: string | undefined, d: string | undefined;
  let r = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [, y, m, d] = r;
  else if ((r = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) [, d, m, y] = r;
  else if ((r = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/))) {
    // Tag/Monat vs. Monat/Tag: eindeutig, wenn eine Zahl > 12 ist; sonst Tag/Monat annehmen
    const [a, b] = [Number(r[1]), Number(r[2])];
    if (b > 12 && a <= 12) [m, d] = [r[1], r[2]];
    else [d, m] = [r[1], r[2]];
    y = r[3];
  }
  if (!y || !m || !d) return { date: null, time };
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return { date: Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? null : date, time };
}

export function parseSsiCsv(csv: string): { dives: ImportedDive[]; diagnostics: string[] } {
  const rows = splitCsv(csv);
  const diagnostics: string[] = [];
  if (rows.length < 2) return { dives: [], diagnostics: ["file has no data rows"] };

  const headers = rows[0].map(norm);
  diagnostics.push(`csv columns: ${rows[0].map((h) => h.trim()).join(" | ")}`);
  const col = (...names: string[]) => headers.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const idx = {
    nr: col("dive #", "dive no", "dive number", "#"),
    site: col("dive site", "site"),
    country: col("country"),
    dt: col("date / time", "date/time", "date"),
    activity: col("dive activity"),
    specialty: col("specialty dive"),
    type: col("dive type"),
    duration: col("duration", "dive time", "divetime"),
    depth: col("depth", "max depth"),
    buddy: col("dive buddy", "buddy"),
  };
  if (idx.dt < 0 || idx.site < 0) {
    diagnostics.push("required columns 'Date / Time' and 'Dive Site' not found");
    return { dives: [], diagnostics };
  }

  const get = (r: string[], i: number) => (i >= 0 ? r[i]?.trim() || undefined : undefined);
  const dives: ImportedDive[] = [];
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const { date, time } = dateTime(get(r, idx.dt));
    const site = get(r, idx.site);
    if (!date || !site) {
      skipped++;
      continue;
    }
    const nr = number(get(r, idx.nr));
    const diveType = [get(r, idx.type), get(r, idx.specialty)].filter(Boolean).join(" · ") || get(r, idx.activity) || null;
    const depth = number(get(r, idx.depth));
    const duration = minutes(get(r, idx.duration));
    dives.push({
      externalId: `${date}#${nr ?? "x"}#${time ?? ""}`,
      date,
      startTime: time,
      diveNumber: nr != null && nr >= 1 ? Math.round(nr) : null,
      site: { name: site, country: get(r, idx.country) ?? null },
      maxDepth: depth != null && depth > 0 ? depth : null,
      duration: duration != null && duration > 0 ? duration : null,
      diveType,
      buddy: get(r, idx.buddy) ?? null,
    });
  }
  if (skipped) diagnostics.push(`skipped ${skipped} rows without date or site`);
  diagnostics.push(`mapped dives: ${dives.length}`);
  return { dives, diagnostics };
}
