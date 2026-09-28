"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MlMap } from "maplibre-gl";
import { Crosshair, Layers, Loader2, LocateFixed, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import { flagEmoji } from "@/lib/country-display";
import { formatCoordinate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BaseMap } from "./base-map";
import type { LngLatPoint, MapLayer } from "./map-core";

export interface PickedLocation {
  latitude: number;
  longitude: number;
  country: string | null;
  countryCode: string | null;
}

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initial: LngLatPoint | null;
  /** Wo die Karte startet, wenn es noch keine Position gibt (z. B. andere Plätze im selben Land) */
  fallback?: LngLatPoint[];
  onSave: (loc: PickedLocation) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** "-23.85, 35.55" · "23°51'S 35°33'E" (nur Dezimal) · Google-Maps-Links mit @lat,lng */
function parseCoordinates(text: string): LngLatPoint | null {
  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = at ?? text.match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1].replace(",", "."));
  const lng = Number(m[2].replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Standortwahl wie in Apple Karten: Die Nadel bleibt in der Mitte, man schiebt
 * die Karte darunter. Dazu "Mein Standort" (GPS) und Koordinaten einfügen.
 */
export function LocationPicker({ open, onOpenChange, title = "Set location", description, initial, fallback, onSave, onRemove }: LocationPickerProps) {
  const mapRef = useRef<MlMap | null>(null);
  const [center, setCenter] = useState<LngLatPoint | null>(initial);
  const [moving, setMoving] = useState(false);
  const [layer, setLayer] = useState<MapLayer>("satellite");
  const [country, setCountry] = useState<{ country: string | null; countryCode: string | null } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coordText, setCoordText] = useState("");
  const lookupSeq = useRef(0);
  const [zoom, setZoom] = useState(0);
  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  const lookupCountry = useCallback(async (p: LngLatPoint) => {
    const seq = ++lookupSeq.current;
    try {
      const res = await api.get<{ country: string | null; countryCode: string | null }>(
        `/api/geo/country?lat=${p.latitude}&lng=${p.longitude}`,
      );
      if (seq === lookupSeq.current) setCountry(res);
    } catch {
      if (seq === lookupSeq.current) setCountry(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const start = initialRef.current;
    setCenter(start);
    setError(null);
    setCoordText("");
    setCountry(null);
    setZoom(start ? 13 : 0);
    if (start) void lookupCountry(start);
  }, [open, lookupCountry]);

  const onReady = useCallback(
    (map: MlMap) => {
      mapRef.current = map;
      map.on("movestart", () => setMoving(true));
      map.on("moveend", () => {
        setMoving(false);
        const c = map.getCenter();
        const p = { latitude: round(c.lat), longitude: round(c.lng) };
        setCenter(p);
        setZoom(map.getZoom());
        if (map.getZoom() >= 4) void lookupCountry(p);
      });
      const start = initial ?? null;
      if (start) {
        map.jumpTo({ center: [start.longitude, start.latitude], zoom: 13 });
      } else if (fallback?.length) {
        const lat = fallback.reduce((s, p) => s + p.latitude, 0) / fallback.length;
        const lng = fallback.reduce((s, p) => s + p.longitude, 0) / fallback.length;
        map.jumpTo({ center: [lng, lat], zoom: fallback.length > 1 ? 8 : 11 });
      } else {
        map.jumpTo({ center: [20, 10], zoom: 1.5 });
      }
    },
    [initial, fallback, lookupCountry],
  );

  function flyTo(p: LngLatPoint, zoom = 14) {
    mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom, duration: 1200 });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        flyTo({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, 15);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Allow it in iOS Settings → Privacy → Location Services → Safari Websites."
            : "Could not get your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function applyCoordText() {
    const p = parseCoordinates(coordText);
    if (!p) {
      setError("Paste coordinates like -23.8512, 35.5431");
      return;
    }
    setError(null);
    flyTo(p, 13);
  }

  async function run(kind: "save" | "remove") {
    setPending(kind);
    setError(null);
    try {
      if (kind === "remove") await onRemove?.();
      else if (center) await onSave({ ...center, country: country?.country ?? null, countryCode: country?.countryCode ?? null });
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  }

  const zoomedIn = zoom >= 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "Move the map so the pin sits on the dive site."}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <BaseMap layer={layer} onReady={onReady} className="h-[38dvh] min-h-56 rounded-2xl sm:h-[400px]">
            {/* Nadel in der Mitte */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <div className={cn("transition-transform duration-200", moving && "-translate-y-2")}>
                <MapPin className="size-10 fill-primary stroke-white drop-shadow-lg" strokeWidth={1.5} />
              </div>
            </div>
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 transition-transform",
                moving && "scale-150",
              )}
            />
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-2">
              <MapButton label="My location" onClick={useMyLocation}>
                {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
              </MapButton>
              <MapButton label="Switch map / satellite" onClick={() => setLayer((l) => (l === "map" ? "satellite" : "map"))}>
                <Layers />
              </MapButton>
            </div>
          </BaseMap>

          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-3">
            <Crosshair className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">
                {country?.country ? `${flagEmoji(country.countryCode)} ${country.country}` : zoomedIn ? "Open water" : "Zoom in to your dive site"}
              </div>
              <div className="truncate text-[13px] tabular-nums text-muted-foreground">
                {center ? `${formatCoordinate(center.latitude, "lat")}, ${formatCoordinate(center.longitude, "lng")}` : "No position yet"}
              </div>
            </div>
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyCoordText();
            }}
          >
            <Input
              value={coordText}
              onChange={(e) => setCoordText(e.target.value)}
              placeholder="Paste coordinates (lat, lng)"
              inputMode="text"
              className="h-10 text-[15px]"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-10" disabled={!coordText.trim()}>
              Go
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-4">
          {onRemove && initial && (
            <Button variant="destructive-ghost" onClick={() => run("remove")} disabled={!!pending} className="sm:mr-auto">
              {pending === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove location
            </Button>
          )}
          <Button onClick={() => run("save")} disabled={!!pending || !center || !zoomedIn}>
            {pending === "save" && <Loader2 className="animate-spin" />}
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MapButton({
  label,
  onClick,
  active,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-11 items-center justify-center rounded-2xl border border-black/5 bg-background/90 text-foreground shadow-lg backdrop-blur-xl transition-transform active:scale-95 [&_svg]:size-5",
        active && "text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}
