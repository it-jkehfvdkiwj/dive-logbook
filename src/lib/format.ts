// Formatierung. Datumswerte sind reine Kalendertage (UTC-Mitternacht in der DB),
// deshalb wird immer in UTC formatiert – so verschiebt sich kein Tag.

const dateLong = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dateShort = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

type DateInput = Date | string;
const toDate = (d: DateInput) => (typeof d === "string" ? new Date(d) : d);

export const formatDateLong = (d: DateInput) => dateLong.format(toDate(d));
export const formatDateShort = (d: DateInput) => dateShort.format(toDate(d));
export const formatWeekday = (d: DateInput) => weekday.format(toDate(d));

/** YYYY-MM-DD für <input type="date"> */
export const toDateInputValue = (d: DateInput) => toDate(d).toISOString().slice(0, 10);

export function formatDepth(m: number | null | undefined): string | null {
  if (m == null) return null;
  return `${m.toFixed(1).replace(/\.0$/, "")} m`;
}

export function formatMinutes(min: number | null | undefined): string | null {
  if (min == null) return null;
  return `${min} min`;
}

/** 4954 → "82h 34m" */
export function formatTotalTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatTemperature(c: number | null | undefined): string | null {
  if (c == null) return null;
  return `${c.toFixed(1).replace(/\.0$/, "")} °C`;
}

export function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const dir = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${dir}`;
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}
