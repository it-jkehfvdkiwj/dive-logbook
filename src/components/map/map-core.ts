"use client";

import type { Map as MlMap, StyleSpecification } from "maplibre-gl";

// Kartenstile: OpenFreeMap (frei, ohne API-Key) + Esri-Satellitenbilder.
export type MapLayer = "map" | "satellite";

const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};

/** Notfall-Stil, falls der Kartenserver nicht erreichbar ist – Pins funktionieren trotzdem. */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#aad3df" } }],
};

export function styleFor(layer: MapLayer, dark: boolean): string | StyleSpecification {
  if (layer === "satellite") return SATELLITE_STYLE;
  return dark ? DARK_STYLE : LIGHT_STYLE;
}

export type MapLibre = typeof import("maplibre-gl");

let loader: Promise<MapLibre> | null = null;
/** maplibre-gl erst im Browser laden (nicht beim Server-Rendering). */
export function loadMapLibre(): Promise<MapLibre> {
  loader ??= import("maplibre-gl").then((m) => ((m as unknown as { default?: MapLibre }).default ?? m) as MapLibre);
  return loader;
}

export interface LngLatPoint {
  latitude: number;
  longitude: number;
}

/** Karte so einpassen, dass alle Punkte sichtbar sind. */
export type Padding = number | { top: number; bottom: number; left: number; right: number };

export function fitPoints(map: MlMap, points: LngLatPoint[], opts: { padding?: Padding; maxZoom?: number; animate?: boolean } = {}) {
  if (!points.length) return;
  const padding = opts.padding ?? 60;
  if (points.length === 1) {
    map.easeTo({
      center: [points[0].longitude, points[0].latitude],
      zoom: opts.maxZoom ?? 11,
      duration: opts.animate === false ? 0 : 900,
    });
    return;
  }
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
  }
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding, maxZoom: opts.maxZoom ?? 11, duration: opts.animate === false ? 0 : 900 },
  );
}
