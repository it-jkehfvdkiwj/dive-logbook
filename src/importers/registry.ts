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
    label: "SSI (MySSI account)",
    description: "Download all dives from your SSI logbook. Re-syncs update without duplicates.",
    status: "available",
  },
  {
    source: "ssi-csv",
    label: "SSI CSV export",
    description: "Fallback: upload the CSV export from my.divessi.com.",
    status: "available",
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
