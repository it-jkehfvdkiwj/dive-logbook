"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Map as MlMap } from "maplibre-gl";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FALLBACK_STYLE, loadMapLibre, styleFor, type MapLayer, type MapLibre } from "./map-core";

interface BaseMapProps {
  className?: string;
  layer?: MapLayer;
  /** Start-Ansicht, falls onReady nichts anderes macht */
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  /** Wird einmal aufgerufen, sobald die Karte bereit ist. */
  onReady?: (map: MlMap, ml: MapLibre) => void;
  children?: React.ReactNode;
}

/** MapLibre-Karte mit hellem/dunklem Stil (folgt dem App-Theme) und Satellit-Option. */
export function BaseMap({ className, layer = "map", center = [15, 20], zoom = 1.3, interactive = true, onReady, children }: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const styleKey = `${layer}-${dark}`;
  const appliedStyle = useRef(styleKey);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current,
          style: styleFor(layer, dark),
          center,
          zoom,
          interactive,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          fadeDuration: 150,
        });
        map.touchZoomRotate?.disableRotation();
        mapRef.current = map;
        appliedStyle.current = styleKey;
        // Pins/Steuerung sofort bereitstellen – nicht auf alle Kacheln warten
        // (Vektorkarte lädt mobil teils langsam; "load" kommt erst danach).
        onReadyRef.current?.(map, ml);
        const markLoaded = () => !cancelled && setLoaded(true);
        map.once("styledata", markLoaded);
        map.once("load", markLoaded);
        // Nur wenn der Kartenstil selbst nicht geladen werden kann: einfacher Hintergrund
        map.on("error", (e) => {
          const url = (e.error as { url?: string } | undefined)?.url ?? "";
          if (!cancelled && url.includes("/styles/")) {
            console.warn("Map style failed, using fallback", e.error);
            map.setStyle(FALLBACK_STYLE);
            markLoaded();
          }
        });
        observer = new ResizeObserver(() => map.resize());
        observer.observe(containerRef.current);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Karte nur einmal erzeugen – Stilwechsel siehe unten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyle.current === styleKey) return;
    appliedStyle.current = styleKey;
    map.setStyle(styleFor(layer, dark));
  }, [styleKey, layer, dark]);

  return (
    <div className={cn("relative overflow-hidden bg-[#aad3df] dark:bg-[#0e1a26]", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-white/80" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
          Map could not be loaded. Check your connection.
        </div>
      )}
      {children}
    </div>
  );
}
