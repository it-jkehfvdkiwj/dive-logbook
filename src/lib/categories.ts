// Species-Kategorien. Erweiterbar: einfach hier einen Eintrag ergänzen.
// In der DB ist `category` ein freier String – unbekannte Werte fallen auf "Other" zurück.

export interface CategoryInfo {
  value: string;
  label: string;
  emoji: string;
}

export const SPECIES_CATEGORIES = [
  { value: "Shark", label: "Sharks", emoji: "🦈" },
  { value: "Ray", label: "Rays", emoji: "🪁" },
  { value: "Fish", label: "Fish", emoji: "🐟" },
  { value: "Turtle", label: "Turtles", emoji: "🐢" },
  { value: "Dolphin", label: "Dolphins", emoji: "🐬" },
  { value: "Whale", label: "Whales", emoji: "🐋" },
  { value: "Mammal", label: "Mammals", emoji: "🦭" },
  { value: "Cephalopod", label: "Cephalopods", emoji: "🐙" },
  { value: "Crustacean", label: "Crustaceans", emoji: "🦐" },
  { value: "Nudibranch", label: "Nudibranchs", emoji: "🐌" },
  { value: "Jellyfish", label: "Jellyfish", emoji: "🪼" },
  { value: "Coral", label: "Corals", emoji: "🪸" },
  { value: "Echinoderm", label: "Echinoderms", emoji: "⭐" },
  { value: "Other", label: "Other", emoji: "🫧" },
] as const satisfies readonly CategoryInfo[];

export type SpeciesCategory = (typeof SPECIES_CATEGORIES)[number]["value"];

export const CATEGORY_VALUES = SPECIES_CATEGORIES.map((c) => c.value) as [
  SpeciesCategory,
  ...SpeciesCategory[],
];

const byValue = new Map<string, CategoryInfo>(SPECIES_CATEGORIES.map((c) => [c.value, c]));

export function getCategory(value: string | null | undefined): CategoryInfo {
  return byValue.get(value ?? "") ?? byValue.get("Other")!;
}
