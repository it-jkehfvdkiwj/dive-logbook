import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { formatDateShort, formatDepth, formatMinutes } from "@/lib/format";
import type { DiveListItem } from "@/types";
import { DepthCover } from "./depth-cover";

/** Kompakte Zeile (Dashboard "Recent Dives"). */
export function DiveRow({ dive }: { dive: DiveListItem }) {
  const metrics = [formatDepth(dive.maxDepth), formatMinutes(dive.duration)].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/dives/${dive.id}`}
      className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-accent hover:bg-accent/40"
    >
      <DepthCover depth={dive.maxDepth} photoUrl={dive.coverPhotoUrl} className="flex size-14 shrink-0 items-center justify-center rounded-xl">
        {!dive.coverPhotoUrl && dive.maxDepth != null && (
          <span className="relative text-[13px] font-bold tabular-nums text-white">{Math.round(dive.maxDepth)}m</span>
        )}
      </DepthCover>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[16px] font-semibold">{dive.site.name}</span>
          {dive.favorite && <Star className="size-3.5 shrink-0 fill-star text-star" aria-label="Favorite" />}
        </div>
        <div className="truncate text-[13px] text-muted-foreground">
          {formatDateShort(dive.date)}
          {dive.site.location || dive.site.country ? ` · ${dive.site.location ?? dive.site.country}` : ""}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[13px]">
          {metrics && <span className="font-medium tabular-nums">{metrics}</span>}
          {dive.speciesCount > 0 && <span className="text-muted-foreground">🐠 {dive.speciesCount} species</span>}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}
