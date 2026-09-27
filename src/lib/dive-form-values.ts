// Formularwerte des Dive-Formulars (Strings, wie sie in <input> stehen).
// Eigene Datei, damit Server-Komponenten Defaults erzeugen können.

export interface DiveFormValues {
  date: string;
  startTime: string;
  diveNumber: string;
  siteName: string;
  location: string;
  country: string;
  latitude: string;
  longitude: string;
  maxDepth: string;
  avgDepth: string;
  duration: string;
  waterTemperature: string;
  visibility: string;
  conditions: string;
  current: string;
  weather: string;
  entryType: string;
  diveType: string;
  buddy: string;
  diveCenter: string;
  notes: string;
  favorite: boolean;
}

export type TextKey = Exclude<keyof DiveFormValues, "favorite">;

export const NUMBER_FIELDS = [
  "diveNumber",
  "latitude",
  "longitude",
  "maxDepth",
  "avgDepth",
  "duration",
  "waterTemperature",
  "visibility",
] as const satisfies readonly TextKey[];

export const emptyDiveForm = (defaults: Partial<DiveFormValues> = {}): DiveFormValues => ({
  date: new Date().toISOString().slice(0, 10),
  startTime: "",
  diveNumber: "",
  siteName: "",
  location: "",
  country: "",
  latitude: "",
  longitude: "",
  maxDepth: "",
  avgDepth: "",
  duration: "",
  waterTemperature: "",
  visibility: "",
  conditions: "",
  current: "",
  weather: "",
  entryType: "",
  diveType: "",
  buddy: "",
  diveCenter: "",
  notes: "",
  favorite: false,
  ...defaults,
});
