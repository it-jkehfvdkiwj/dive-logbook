import Link from "next/link";
import { Clock, Fish, MapPin, TrendingDown } from "lucide-react";
import { formatDateLong, formatDepth, formatMinutes, pluralize } from "@/lib/format";
import type { DiveListItem } from "@/types";
import { DepthCover } from "./depth-cover";
import { FavoriteButton } from "./favorite-button";

/** Große Card für das Dive Log. */
export function DiveCard({ dive }: { dive: DiveListItem }) {
  const place = [dive.site.location, dive.site.country].filter(Boolean).join(", ");
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/70 bg-card transition-transform active:scale-[0.99]">
      <Link href={`/dives/${dive.id}`} className="block" aria-label={`${dive.site.name}, ${formatDateLong(dive.date)}`}>
        <DepthCover depth={dive.maxDepth} photoUrl={dive.coverPhotoUrl} className="h-28">
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute inset-x-4 bottom-3 text-white">
            <div className="flex items-baseline gap-2">
              {dive.diveNumber != null && <span className="text-xs font-semibold tabular-nums text-white/75">#{dive.diveNumber}</span>}
              <h3 className="truncate text-[19px] font-semibold tracking-tight">{dive.site.name}</h3>
            </div>
            {place && (
              <div className="mt-0.5 flex items-center gap-1 text-[13px] text-white/85">
                <MapPin className="size-3.5" />
                <span className="truncate">{place}</span>
              </div>
            )}
          </div>
        </DepthCover>
        <div className="px-4 pb-4 pt-3">
          <div className="text-[13px] font-medium text-muted-foreground">{formatDateLong(dive.date)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[15px]">
            {dive.maxDepth != null && (
              <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                <TrendingDown className="size-4 text-primary" />
                {formatDepth(dive.maxDepth)}
              </span>
            )}
            {dive.duration != null && (
              <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                <Clock className="size-4 text-primary" />
                {formatMinutes(dive.duration)}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Fish className="size-4" />
              {dive.speciesCount > 0 ? `${pluralize(dive.speciesCount, "species", "species")} seen` : "No sightings"}
            </span>
          </div>
        </div>
      </Link>
      <FavoriteButton diveId={dive.id} favorite={dive.favorite} tone="overlay" className="absolute right-2.5 top-2.5" />
    </article>
  );
}
