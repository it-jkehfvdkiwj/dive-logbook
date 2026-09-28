"use client";

import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { formatCoordinate } from "@/lib/format";
import { BaseMap } from "./base-map";

/** Kleine Kartenvorschau eines Tauchplatzes – tippen öffnet die große Karte. */
export function SiteMiniMap({ siteId, latitude, longitude }: { siteId: string; latitude: number; longitude: number }) {
  return (
    <Link
      href={`/map?site=${siteId}`}
      className="group block overflow-hidden rounded-2xl border border-border/70 bg-card active:opacity-90"
      aria-label="Open on map"
    >
      <BaseMap center={[longitude, latitude]} zoom={9.5} interactive={false} className="pointer-events-none h-44">
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <MapPin className="size-9 fill-primary stroke-white drop-shadow-lg" strokeWidth={1.5} />
        </div>
      </BaseMap>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Show on map</div>
          <div className="truncate text-[13px] tabular-nums text-muted-foreground">
            {formatCoordinate(latitude, "lat")}, {formatCoordinate(longitude, "lng")}
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground/50" />
      </div>
    </Link>
  );
}
