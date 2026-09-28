// View-Modelle (DTOs), die Services an UI und API liefern.
// Bewusst entkoppelt von Prisma-Typen, damit sich das DB-Schema ändern kann,
// ohne dass jede Komponente angepasst werden muss.

export interface DiveSiteSummary {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DiveListItem {
  id: string;
  diveNumber: number | null;
  date: Date;
  startTime: string | null;
  site: DiveSiteSummary;
  maxDepth: number | null;
  duration: number | null;
  diveType: string | null;
  favorite: boolean;
  speciesCount: number;
  coverPhotoUrl: string | null;
}

export interface SightingWithSpecies {
  id: string;
  count: number | null;
  notes: string | null;
  createdAt: Date;
  species: SpeciesSummary;
}

export interface DivePhotoItem {
  id: string;
  url: string;
  caption: string | null;
  speciesId: string | null;
  createdAt: Date;
}

export interface DiveDetail extends DiveListItem {
  avgDepth: number | null;
  waterTemperature: number | null;
  visibility: number | null;
  conditions: string | null;
  current: string | null;
  weather: string | null;
  entryType: string | null;
  buddy: string | null;
  diveCenter: string | null;
  notes: string | null;
  source: string;
  externalId: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sightings: SightingWithSpecies[];
  photos: DivePhotoItem[];
  /** Tiere aus SSI, deren Art noch nicht zugeordnet ist */
  pendingSpeciesCount: number;
}

export interface SpeciesSummary {
  id: string;
  slug: string;
  commonName: string;
  commonNameDe: string | null;
  scientificName: string | null;
  category: string;
  imageUrl: string | null;
  imageAttribution: string | null;
}

export interface SightingRef {
  diveId: string;
  date: Date;
  siteName: string;
  location: string | null;
  country: string | null;
}

/** Eintrag der Life List bzw. des Katalogs */
export interface SpeciesListItem extends SpeciesSummary {
  sightingCount: number;
  firstSeen: SightingRef | null;
  lastSeen: SightingRef | null;
}

export interface SpeciesSightingItem {
  id: string;
  count: number | null;
  notes: string | null;
  dive: {
    id: string;
    date: Date;
    diveNumber: number | null;
    favorite: boolean;
    siteName: string;
    location: string | null;
    country: string | null;
  };
}

export interface SpeciesDetail extends SpeciesListItem {
  description: string | null;
  source: string;
  sightings: SpeciesSightingItem[];
  stats: {
    sightings: number;
    dives: number;
    individuals: number | null;
    locations: string[];
    countries: string[];
  };
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface OverviewStats {
  totalDives: number;
  totalMinutes: number;
  avgDuration: number | null;
  maxDepth: number | null;
  deepestDiveId: string | null;
  avgDepth: number | null;
  avgMaxDepth: number | null;
  totalSpecies: number;
  totalSightings: number;
  speciesByCategory: CategoryCount[];
  countries: number;
  diveSites: number;
  topSpecies: { id: string; commonName: string; commonNameDe: string | null; category: string; count: number }[];
  divesByCountry: { country: string; countryCode: string | null; count: number }[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
