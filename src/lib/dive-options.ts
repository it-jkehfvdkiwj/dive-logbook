// Vorschlagswerte für Formularfelder (freie Eingabe bleibt möglich).

export const CURRENT_OPTIONS = ["None", "Light", "Moderate", "Strong"] as const;

export const ENTRY_TYPE_OPTIONS = [
  "Boat – backroll",
  "Boat – giant stride",
  "Shore",
  "Beach launch",
  "Jetty",
] as const;

export const DIVE_TYPE_OPTIONS = [
  "Reef",
  "Drift",
  "Wall",
  "Wreck",
  "Night",
  "Deep",
  "Cave",
  "Muck",
  "Pelagic",
  "Baited shark dive",
  "Training",
] as const;

export const CONDITIONS_OPTIONS = ["Calm", "Choppy", "Surge", "Swell", "Rough"] as const;

export const WEATHER_OPTIONS = ["Sunny", "Partly cloudy", "Overcast", "Rain", "Windy"] as const;
