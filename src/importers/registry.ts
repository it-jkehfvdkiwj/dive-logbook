// Übersicht der (geplanten) Datenquellen – wird in Settings → Import / Sync angezeigt.

export interface ImportSourceInfo {
  source: string;
  label: string;
  description: string;
  status: "available" | "planned";
}

export const IMPORT_SOURCES: ImportSourceInfo[] = [
  {
    source: "json",
    label: "JSON file",
    description: "Import dives in the app's neutral import format.",
    status: "available",
  },
  {
    source: "ssi",
    label: "SSI",
    description: "Dive logs, wildlife and dive sites from your SSI account.",
    status: "planned",
  },
  {
    source: "suunto",
    label: "Suunto",
    description: "Dive computer data.",
    status: "planned",
  },
  {
    source: "garmin",
    label: "Garmin",
    description: "Dive computer data.",
    status: "planned",
  },
];
