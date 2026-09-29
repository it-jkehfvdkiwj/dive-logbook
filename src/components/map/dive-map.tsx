"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Map as MlMap, Marker } from "maplibre-gl";
import Supercluster, { type ClusterProperties } from "supercluster";
import { ChevronRight, Expand, Layers, MapPinOff, Pencil, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { flagEmoji } from "@/lib/country-display";
import { formatDateShort, formatDepth, formatMinutes, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MapSite } from "@/services/mapService";
import { BaseMap } from "./base-map";
import { LocationPicker, MapButton, type PickedLocation } from "./location-picker";
import { fitPoints, type LngLatPoint, type MapLayer, type MapLibre } from "./map-core";

type SitePoint = MapSite & { latitude: number; longitude: number };
type ClusterProps = { siteId: string; dives: number };

const hasCoords = (s: MapSite): s is SitePoint => s.latitude != null && s.longitude != null;

const FIT_PADDING = { top: 150, bottom: 60, left: 50, right: 50 };

interface CountryGroup {
  key: string;
  country: string;
  countryCode: string | null;
  dives: number;
  points: SitePoint[];
}

/** Pin über der Info-Karte zentrieren (mobil liegt die Karte unten auf der Map). */
function cardOffset(map: MlMap): [number, number] {
  if (typeof window === "undefined" || window.innerWidth >= 1024) return [0, 0];
  return [0, -Math.round(map.getContainer().clientHeight * 0.22)];
}

function drawMarkers(
  map: MlMap,
  ml: MapLibre,
  previous: Marker[],
  opts: {
    index: Supercluster<ClusterProps, { dives: number }>;
    siteById: Map<string, MapSite>;
    selectedId: string | null;
    onSelect: (id: string) => void;
  },
): Marker[] {
  for (const m of previous) m.remove();
  const markers: Marker[] = [];
  const b = map.getBounds();
  const zoom = Math.round(map.getZoom());
  const features = opts.index.getClusters(
    [Math.max(-180, b.getWest() - 5), Math.max(-85, b.getSouth() - 5), Math.min(180, b.getEast() + 5), Math.min(85, b.getNorth() + 5)],
    zoom,
  );

  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const el = document.createElement("div");
    const props = f.properties as Partial<ClusterProperties> & ClusterProps & { dives: number };
    if (props.cluster) {
      const count = props.dives;
      const size = Math.round(Math.min(62, 38 + Math.log2(count) * 4));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dm-cluster";
      btn.style.width = `${size}px`;
      btn.style.height = `${size}px`;
      btn.setAttribute("aria-label", `${count} dives – zoom in`);
      btn.textContent = String(count);
      el.appendChild(btn);
      const clusterId = props.cluster_id!;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = Math.min(opts.index.getClusterExpansionZoom(clusterId), 16);
        map.easeTo({ center: [lng, lat], zoom: target, duration: 700 });
      });
    } else {
      const site = opts.siteById.get(props.siteId);
      if (!site) continue;
      const isSelected = opts.selectedId === site.id;
      const wrap = document.createElement("div");
      wrap.className = "dm-pin-wrap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dm-pin";
      if (isSelected) btn.dataset.selected = "true";
      btn.setAttribute("aria-label", `${site.name}, ${pluralize(site.diveCount, "dive")}`);
      btn.textContent = String(site.diveCount);
      wrap.appendChild(btn);
      if (zoom >= 9 || isSelected) {
        const label = document.createElement("span");
        label.className = "dm-pin-label";
        label.textContent = site.name;
        wrap.appendChild(label);
      }
      el.appendChild(wrap);
      if (isSelected) el.style.zIndex = "2";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onSelect(site.id);
      });
    }
    markers.push(new ml.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map));
  }
  return markers;
}

export function DiveMap({
  sites,
  initialSiteId,
  editInitial,
}: {
  sites: MapSite[];
  initialSiteId?: string;
  editInitial?: boolean;
}) {
  const router = useRouter();
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MapLibre | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [layer, setLayer] = useState<MapLayer>("map");
  const [selectedId, setSelectedId] = useState<string | null>(initialSiteId ?? null);
  const selectedRef = useRef(selectedId);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [noGpsOpen, setNoGpsOpen] = useState(false);
  const [pickerSite, setPickerSite] = useState<MapSite | null>(() =>
    editInitial && initialSiteId ? (sites.find((s) => s.id === initialSiteId) ?? null) : null,
  );

  const points = useMemo(() => sites.filter(hasCoords), [sites]);
  const withoutGps = useMemo(() => sites.filter((s) => !hasCoords(s)), [sites]);
  const selected = sites.find((s) => s.id === selectedId) ?? null;

  const countries = useMemo(() => {
    const map = new Map<string, CountryGroup>();
    for (const s of sites) {
      const key = s.countryCode ?? s.country ?? "?";
      if (!s.country) continue;
      const g = map.get(key) ?? { key, country: s.country, countryCode: s.countryCode, dives: 0, points: [] };
      g.dives += s.diveCount;
      if (hasCoords(s)) g.points.push(s);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.dives - a.dives);
  }, [sites]);

  const index = useMemo(() => {
    const sc = new Supercluster<ClusterProps, { dives: number }>({
      radius: 56,
      maxZoom: 14,
      map: (p) => ({ dives: p.dives }),
      reduce: (acc, p) => {
        acc.dives += p.dives;
      },
    });
    sc.load(
      points.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
        properties: { siteId: s.id, dives: s.diveCount },
      })),
    );
    return sc;
  }, [points]);

  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);

  // --- Marker (imperativ, über Refs – die Karte lebt außerhalb von React) ---
  const dataRef = useRef({ index, siteById });
  const selectRef = useRef<(id: string | null, fly: boolean) => void>(() => {});

  const draw = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    markersRef.current = drawMarkers(map, ml, markersRef.current, {
      ...dataRef.current,
      selectedId: selectedRef.current,
      onSelect: (id) => selectRef.current(id, false),
    });
  }, []);

  function select(id: string | null, fly: boolean) {
    selectedRef.current = id;
    setSelectedId(id);
    const map = mapRef.current;
    const site = id ? siteById.get(id) : null;
    if (map && site && hasCoords(site)) {
      const offset = cardOffset(map);
      if (fly) map.flyTo({ center: [site.longitude, site.latitude], zoom: Math.max(map.getZoom(), 11), offset, duration: 1200 });
      else map.easeTo({ center: [site.longitude, site.latitude], offset, duration: 500 });
    }
    draw();
  }

  useEffect(() => {
    selectRef.current = select;
  });

  // Daten geändert (z. B. Position korrigiert) → Marker neu zeichnen
  useEffect(() => {
    dataRef.current = { index, siteById };
    draw();
  }, [index, siteById, draw]);

  const onReady = useCallback(
    (map: MlMap, ml: MapLibre) => {
      mapRef.current = map;
      mlRef.current = ml;
      map.on("moveend", draw);
      map.on("click", () => {
        if (selectedRef.current) {
          selectedRef.current = null;
          setSelectedId(null);
          draw();
        }
      });
      const { siteById: byId } = dataRef.current;
      const initial = initialSiteId ? byId.get(initialSiteId) : null;
      if (initial && hasCoords(initial)) {
        map.jumpTo({ center: [initial.longitude, initial.latitude], zoom: 11 });
        map.panBy(cardOffset(map).map((v) => -v) as [number, number], { duration: 0 });
      } else {
        fitPoints(map, [...byId.values()].filter(hasCoords), { padding: FIT_PADDING, maxZoom: 10, animate: false });
      }
      draw();
    },
    [draw, initialSiteId],
  );

  useEffect(
    () => () => {
      for (const m of markersRef.current) m.remove();
    },
    [],
  );

  function fitAll() {
    setActiveCountry(null);
    if (mapRef.current) fitPoints(mapRef.current, points, { padding: FIT_PADDING, maxZoom: 10 });
  }

  function focusCountry(g: CountryGroup) {
    setActiveCountry(g.key);
    if (g.points.length && mapRef.current) fitPoints(mapRef.current, g.points, { padding: FIT_PADDING, maxZoom: 11 });
    else setNoGpsOpen(true);
  }

  async function saveLocation(site: MapSite, loc: PickedLocation | null) {
    await api.patch(`/api/sites/${site.id}`, {
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
    });
    router.refresh();
    if (loc) {
      selectedRef.current = site.id;
      setSelectedId(site.id);
      const map = mapRef.current;
      map?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 11, offset: cardOffset(map), duration: 1200 });
    }
  }

  const pickerFallback: LngLatPoint[] | undefined = pickerSite
    ? countries.find((g) => g.key === (pickerSite.countryCode ?? pickerSite.country))?.points
    : undefined;

  return (
    <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] top-0 lg:bottom-0 lg:left-64">
      <BaseMap layer={layer} onReady={onReady} className="absolute inset-0" />

      {/* Kopfzeile */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-10 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3 px-3">
          <div className="pointer-events-auto rounded-2xl border border-black/5 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-xl">
            <h1 className="text-[20px] font-bold leading-tight tracking-tight">Dive Map</h1>
            <p className="text-[13px] text-muted-foreground">
              {pluralize(sites.length, "site")} · {pluralize(countries.length, "country", "countries")}
            </p>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <MapButton label="Show all dive sites" onClick={fitAll}>
              <Expand />
            </MapButton>
            <MapButton
              label={layer === "map" ? "Satellite view" : "Map view"}
              active={layer === "satellite"}
              onClick={() => setLayer((l) => (l === "map" ? "satellite" : "map"))}
            >
              <Layers />
            </MapButton>
          </div>
        </div>

        {(countries.length > 0 || withoutGps.length > 0) && (
          <div className="pointer-events-auto flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {countries.map((g) => (
              <Chip key={g.key} active={activeCountry === g.key} onClick={() => focusCountry(g)}>
                <span className="text-[15px] leading-none">{flagEmoji(g.countryCode) || "🌍"}</span>
                {g.country}
                <span className="tabular-nums opacity-60">{g.dives}</span>
              </Chip>
            ))}
            {withoutGps.length > 0 && (
              <Chip onClick={() => setNoGpsOpen(true)} warn>
                <MapPinOff className="size-3.5" />
                {withoutGps.length} without GPS
              </Chip>
            )}
          </div>
        )}
      </div>

      {sites.length === 0 && (
        <div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 rounded-3xl bg-background/95 p-6 text-center shadow-xl backdrop-blur-xl">
          <div className="text-[17px] font-semibold">No dive sites yet</div>
          <p className="mt-1 text-[14px] text-muted-foreground">Log a dive or sync from SSI – your sites show up here.</p>
          <Link href="/dives/new" className="mt-4 inline-block font-semibold text-primary">
            Log a dive →
          </Link>
        </div>
      )}

      {/* Ausgewählter Tauchplatz */}
      {selected && (
        <SiteCard
          key={selected.id}
          site={selected}
          onClose={() => select(null, false)}
          onEditLocation={() => setPickerSite(selected)}
        />
      )}

      <Dialog open={noGpsOpen} onOpenChange={setNoGpsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sites without GPS</DialogTitle>
            <DialogDescription>Set the position once – it applies to every dive at that site.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {withoutGps.length === 0 ? (
              <p className="py-6 text-center text-[15px] text-muted-foreground">All dive sites have a position. 🎉</p>
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {withoutGps.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{s.name}</div>
                      <div className="truncate text-[13px] text-muted-foreground">
                        {[s.country ? `${flagEmoji(s.countryCode)} ${s.country}` : "Unknown country", pluralize(s.diveCount, "dive")].join(" · ")}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setNoGpsOpen(false);
                        setPickerSite(s);
                      }}
                    >
                      Set location
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <LocationPicker
        open={!!pickerSite}
        onOpenChange={(o) => !o && setPickerSite(null)}
        title={pickerSite?.name ?? "Set location"}
        description="Move the map so the pin sits on the dive site. Applies to all dives here."
        initial={pickerSite && hasCoords(pickerSite) ? { latitude: pickerSite.latitude, longitude: pickerSite.longitude } : null}
        fallback={pickerFallback}
        onSave={(loc) => (pickerSite ? saveLocation(pickerSite, loc) : undefined)}
        onRemove={pickerSite && hasCoords(pickerSite) ? () => saveLocation(pickerSite, null) : undefined}
      />
    </div>
  );
}

function Chip({
  active,
  warn,
  onClick,
  children,
}: {
  active?: boolean;
  warn?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/5 px-3.5 text-[14px] font-medium shadow-md backdrop-blur-xl transition-colors active:scale-[0.97]",
        active ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground",
        warn && !active && "text-amber-700 dark:text-amber-300",
      )}
    >
      {children}
    </button>
  );
}

function SiteCard({ site, onClose, onEditLocation }: { site: MapSite; onClose: () => void; onEditLocation: () => void }) {
  const place = [site.country ? `${flagEmoji(site.countryCode)} ${site.country}` : null, site.location].filter(Boolean).join(" · ");
  const stats = [
    pluralize(site.diveCount, "dive"),
    site.maxDepth != null ? `max ${formatDepth(site.maxDepth)}` : null,
    site.speciesCount ? pluralize(site.speciesCount, "species", "species") : null,
  ].filter(Boolean);

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-md animate-sheet lg:bottom-auto lg:left-auto lg:right-4 lg:top-[calc(env(safe-area-inset-top)+128px)] lg:mx-0 lg:w-96">
      <div className="flex max-h-[min(52dvh,460px)] flex-col overflow-hidden rounded-3xl border border-black/5 bg-background/95 shadow-2xl backdrop-blur-xl">
        <div className="relative px-5 pb-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="size-4" />
          </button>
          {place && <div className="truncate pr-10 text-[13px] font-medium text-muted-foreground">{place}</div>}
          <h2 className="pr-10 text-[21px] font-bold leading-tight tracking-tight">{site.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stats.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold">
                {s}
              </span>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto border-y border-border/60">
          {site.dives.map((d) => (
            <li key={d.id}>
              <Link href={`/dives/${d.id}`} className="flex items-center gap-3 px-5 py-2.5 active:bg-accent">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[15px] font-medium">
                    {formatDateShort(d.date)}
                    {d.favorite && <Star className="size-3.5 fill-star text-star" />}
                  </div>
                  <div className="text-[13px] tabular-nums text-muted-foreground">
                    {[d.diveNumber != null ? `#${d.diveNumber}` : null, formatDepth(d.maxDepth), formatMinutes(d.duration)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-2 px-5 py-3">
          <span className="text-[12px] text-muted-foreground">{site.locationEdited ? "Position corrected by you" : "Position from logbook"}</span>
          <Button size="sm" variant="secondary" onClick={onEditLocation}>
            <Pencil /> Edit location
          </Button>
        </div>
      </div>
    </div>
  );
}
