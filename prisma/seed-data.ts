// Seed-Daten: Arten-Katalog (bleibt dauerhaft) + Demo-Tauchgänge (source = "demo", löschbar).

export interface SeedSpecies {
  commonName: string;
  scientificName: string;
  category: string;
  description?: string;
}

export const SPECIES_CATALOG: SeedSpecies[] = [
  // Sharks
  { commonName: "Ragged-tooth Shark", scientificName: "Carcharias taurus", category: "Shark", description: "Also known as sand tiger or grey nurse shark. Gathers on South African reefs such as Aliwal Shoal in winter." },
  { commonName: "Bull Shark", scientificName: "Carcharhinus leucas", category: "Shark", description: "Robust, blunt-nosed shark; known as Zambezi shark in Southern Africa. Regular at Protea Banks in summer." },
  { commonName: "Scalloped Hammerhead", scientificName: "Sphyrna lewini", category: "Shark", description: "Hammerhead with a scalloped head front edge. Often seen in schools." },
  { commonName: "Great Hammerhead", scientificName: "Sphyrna mokarran", category: "Shark", description: "The largest hammerhead species with a tall, sickle-shaped first dorsal fin." },
  { commonName: "Smooth Hammerhead", scientificName: "Sphyrna zygaena", category: "Shark" },
  { commonName: "Tiger Shark", scientificName: "Galeocerdo cuvier", category: "Shark" },
  { commonName: "Whale Shark", scientificName: "Rhincodon typus", category: "Shark", description: "The largest fish in the sea; a filter feeder. Frequently encountered off Tofo, Mozambique." },
  { commonName: "Blacktip Shark", scientificName: "Carcharhinus limbatus", category: "Shark" },
  { commonName: "Dusky Shark", scientificName: "Carcharhinus obscurus", category: "Shark" },
  { commonName: "Oceanic Blacktip Shark", scientificName: "Carcharhinus brevipinna", category: "Shark", description: "Also called spinner shark." },
  { commonName: "Zebra Shark", scientificName: "Stegostoma tigrinum", category: "Shark", description: "Also called leopard shark; rests on sandy bottoms near reefs." },
  { commonName: "Whitetip Reef Shark", scientificName: "Triaenodon obesus", category: "Shark" },

  // Rays
  { commonName: "Reef Manta Ray", scientificName: "Mobula alfredi", category: "Ray", description: "Visits cleaning stations such as Manta Reef off Tofo." },
  { commonName: "Oceanic Manta Ray", scientificName: "Mobula birostris", category: "Ray" },
  { commonName: "Spotted Eagle Ray", scientificName: "Aetobatus ocellatus", category: "Ray" },
  { commonName: "Bluespotted Ribbontail Ray", scientificName: "Taeniura lymma", category: "Ray" },
  { commonName: "Smalleye Stingray", scientificName: "Megatrygon microps", category: "Ray", description: "Very large stingray regularly observed around Tofo." },
  { commonName: "Giant Guitarfish", scientificName: "Rhynchobatus djiddensis", category: "Ray" },
  { commonName: "Marbled Electric Ray", scientificName: "Torpedo sinuspersici", category: "Ray" },

  // Turtles
  { commonName: "Green Turtle", scientificName: "Chelonia mydas", category: "Turtle" },
  { commonName: "Hawksbill Turtle", scientificName: "Eretmochelys imbricata", category: "Turtle" },
  { commonName: "Loggerhead Turtle", scientificName: "Caretta caretta", category: "Turtle" },

  // Fish
  { commonName: "Giant Moray", scientificName: "Gymnothorax javanicus", category: "Fish" },
  { commonName: "Honeycomb Moray", scientificName: "Gymnothorax favagineus", category: "Fish" },
  { commonName: "Clark's Anemonefish", scientificName: "Amphiprion clarkii", category: "Fish", description: "A clownfish species found in many anemone hosts." },
  { commonName: "Two-bar Anemonefish", scientificName: "Amphiprion allardi", category: "Fish", description: "Also called Allard's clownfish; endemic to the western Indian Ocean." },
  { commonName: "Common Lionfish", scientificName: "Pterois miles", category: "Fish" },
  { commonName: "Giant Frogfish", scientificName: "Antennarius commerson", category: "Fish" },
  { commonName: "Potato Grouper", scientificName: "Epinephelus tukula", category: "Fish" },
  { commonName: "Giant Trevally", scientificName: "Caranx ignobilis", category: "Fish" },
  { commonName: "Moorish Idol", scientificName: "Zanclus cornutus", category: "Fish" },
  { commonName: "Yellowbar Angelfish", scientificName: "Pomacanthus maculosus", category: "Fish" },
  { commonName: "Titan Triggerfish", scientificName: "Balistoides viridescens", category: "Fish" },
  { commonName: "Ornate Ghost Pipefish", scientificName: "Solenostomus paradoxus", category: "Fish" },

  // Mammals
  { commonName: "Humpback Whale", scientificName: "Megaptera novaeangliae", category: "Whale" },
  { commonName: "Indo-Pacific Bottlenose Dolphin", scientificName: "Tursiops aduncus", category: "Dolphin" },
  { commonName: "Spinner Dolphin", scientificName: "Stenella longirostris", category: "Dolphin" },
  { commonName: "Dugong", scientificName: "Dugong dugon", category: "Mammal", description: "Rare herbivorous marine mammal; one of the last East African populations lives around the Bazaruto Archipelago." },

  // Invertebrates
  { commonName: "Common Octopus", scientificName: "Octopus vulgaris", category: "Cephalopod" },
  { commonName: "Broadclub Cuttlefish", scientificName: "Sepia latimanus", category: "Cephalopod" },
  { commonName: "Painted Spiny Lobster", scientificName: "Panulirus versicolor", category: "Crustacean" },
  { commonName: "Harlequin Shrimp", scientificName: "Hymenocera picta", category: "Crustacean" },
  { commonName: "Spanish Dancer", scientificName: "Hexabranchus sanguineus", category: "Nudibranch", description: "Large, bright red nudibranch that swims with undulating movements." },
  { commonName: "Nudibranch (Phyllidia)", scientificName: "Phyllidia varicosa", category: "Nudibranch", description: "Common warty nudibranch with blue-black ridges and yellow tips." },
  { commonName: "Moon Jellyfish", scientificName: "Aurelia aurita", category: "Jellyfish" },
  { commonName: "Crown-of-thorns Starfish", scientificName: "Acanthaster planci", category: "Echinoderm" },
  { commonName: "Table Coral", scientificName: "Acropora cytherea", category: "Coral" },
];

export interface SeedDive {
  diveNumber: number;
  date: string;
  startTime: string;
  site: { name: string; location: string; country: string; latitude: number; longitude: number };
  maxDepth: number;
  avgDepth: number;
  duration: number;
  waterTemperature: number;
  visibility: number;
  conditions?: string;
  current?: string;
  weather?: string;
  entryType?: string;
  diveType?: string;
  buddy?: string;
  diveCenter?: string;
  notes?: string;
  favorite?: boolean;
  sightings: { scientificName: string; count?: number; notes?: string }[];
}

// Koordinaten sind ungefähre Werte für Demo-Zwecke.
export const DEMO_DIVES: SeedDive[] = [
  {
    diveNumber: 1,
    date: "2026-09-08",
    startTime: "08:40",
    site: { name: "Manta Reef", location: "Tofo", country: "Mozambique", latitude: -23.9, longitude: 35.57 },
    maxDepth: 26.3,
    avgDepth: 18.4,
    duration: 45,
    waterTemperature: 24,
    visibility: 15,
    conditions: "Swell",
    current: "Moderate",
    weather: "Sunny",
    entryType: "Beach launch",
    diveType: "Reef",
    diveCenter: "Peri-Peri Divers",
    notes: "Two mantas circling the cleaning station for almost ten minutes.",
    favorite: true,
    sightings: [
      { scientificName: "Mobula alfredi", count: 2, notes: "Cleaning station at ~22 m." },
      { scientificName: "Gymnothorax javanicus", count: 1 },
      { scientificName: "Megatrygon microps", count: 1 },
      { scientificName: "Hexabranchus sanguineus", count: 1 },
    ],
  },
  {
    diveNumber: 2,
    date: "2026-09-10",
    startTime: "09:15",
    site: { name: "Giant's Castle", location: "Tofo", country: "Mozambique", latitude: -23.84, longitude: 35.57 },
    maxDepth: 22.1,
    avgDepth: 15.9,
    duration: 51,
    waterTemperature: 24,
    visibility: 12,
    current: "Light",
    weather: "Partly cloudy",
    entryType: "Beach launch",
    diveType: "Reef",
    diveCenter: "Peri-Peri Divers",
    sightings: [
      { scientificName: "Gymnothorax javanicus", count: 2 },
      { scientificName: "Chelonia mydas", count: 1 },
      { scientificName: "Amphiprion allardi", count: 4 },
      { scientificName: "Phyllidia varicosa", count: 3 },
    ],
  },
  {
    diveNumber: 3,
    date: "2026-09-15",
    startTime: "10:30",
    site: { name: "Two Mile Reef", location: "Vilanculos", country: "Mozambique", latitude: -21.79, longitude: 35.51 },
    maxDepth: 16.8,
    avgDepth: 11.2,
    duration: 58,
    waterTemperature: 25,
    visibility: 20,
    conditions: "Calm",
    current: "Light",
    weather: "Sunny",
    entryType: "Boat – backroll",
    diveType: "Reef",
    notes: "Super clear water, turtles everywhere.",
    sightings: [
      { scientificName: "Chelonia mydas", count: 3 },
      { scientificName: "Amphiprion allardi", count: 6 },
      { scientificName: "Hexabranchus sanguineus", count: 1 },
      { scientificName: "Gymnothorax javanicus", count: 1 },
    ],
  },
  {
    diveNumber: 4,
    date: "2026-09-21",
    startTime: "07:50",
    site: { name: "Protea Banks", location: "Shelly Beach", country: "South Africa", latitude: -30.84, longitude: 30.52 },
    maxDepth: 24.7,
    avgDepth: 19.1,
    duration: 48,
    waterTemperature: 22,
    visibility: 18,
    conditions: "Choppy",
    current: "Strong",
    weather: "Overcast",
    entryType: "Boat – backroll",
    diveType: "Drift",
    notes: "Strong current at the beginning. Saw the biggest shark I've ever seen.",
    favorite: true,
    sightings: [
      { scientificName: "Carcharias taurus", count: 5 },
      { scientificName: "Carcharhinus leucas", count: 2 },
      { scientificName: "Sphyrna lewini", count: 3, notes: "Large school at around 18 m." },
      { scientificName: "Mobula alfredi", count: 1 },
    ],
  },
  {
    diveNumber: 5,
    date: "2026-09-24",
    startTime: "08:20",
    site: { name: "Aliwal Shoal – Cathedral", location: "Umkomaas", country: "South Africa", latitude: -30.26, longitude: 30.83 },
    maxDepth: 27.4,
    avgDepth: 17.6,
    duration: 42,
    waterTemperature: 21,
    visibility: 14,
    current: "Moderate",
    weather: "Sunny",
    entryType: "Boat – backroll",
    diveType: "Reef",
    buddy: "Dive buddy",
    sightings: [
      { scientificName: "Carcharias taurus", count: 8, notes: "Resting in the Cathedral." },
      { scientificName: "Chelonia mydas", count: 1 },
      { scientificName: "Gymnothorax javanicus", count: 1 },
    ],
  },
];

/**
 * Deutsche Namen als Fallback, falls iNaturalist keinen liefert (oder nicht erreichbar ist).
 * Schlüssel: wissenschaftlicher Name.
 */
export const GERMAN_NAMES: Record<string, string> = {
  "Carcharias taurus": "Sandtigerhai",
  "Carcharhinus leucas": "Bullenhai",
  "Sphyrna lewini": "Bogenstirn-Hammerhai",
  "Sphyrna mokarran": "Großer Hammerhai",
  "Sphyrna zygaena": "Glatter Hammerhai",
  "Galeocerdo cuvier": "Tigerhai",
  "Rhincodon typus": "Walhai",
  "Carcharhinus limbatus": "Schwarzspitzenhai",
  "Carcharhinus obscurus": "Schwarzhai",
  "Carcharhinus brevipinna": "Spinnerhai",
  "Stegostoma tigrinum": "Zebrahai",
  "Triaenodon obesus": "Weißspitzen-Riffhai",
  "Mobula alfredi": "Riffmanta",
  "Mobula birostris": "Riesenmanta",
  "Taeniura lymma": "Blaupunktrochen",
  "Chelonia mydas": "Suppenschildkröte",
  "Eretmochelys imbricata": "Echte Karettschildkröte",
  "Caretta caretta": "Unechte Karettschildkröte",
  "Gymnothorax javanicus": "Riesenmuräne",
  "Amphiprion clarkii": "Clarks Anemonenfisch",
  "Pterois miles": "Indischer Rotfeuerfisch",
  "Zanclus cornutus": "Halfterfisch",
  "Balistoides viridescens": "Riesen-Drückerfisch",
  "Megaptera novaeangliae": "Buckelwal",
  "Tursiops aduncus": "Indopazifischer Großer Tümmler",
  "Stenella longirostris": "Spinnerdelfin",
  "Dugong dugon": "Dugong",
  "Octopus vulgaris": "Gemeiner Krake",
  "Hymenocera picta": "Harlekingarnele",
  "Hexabranchus sanguineus": "Spanische Tänzerin",
  "Aurelia aurita": "Ohrenqualle",
  "Acanthaster planci": "Dornenkronenseestern",
};
