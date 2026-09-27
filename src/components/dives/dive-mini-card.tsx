import Link from "next/link";
import { Star } from "lucide-react";
import { formatDateShort, formatDepth } from "@/lib/format";
import type { DiveListItem } from "@/types";
import { DepthCover } from "./depth-cover";

/** Kleine Card für horizontale Listen (Favorite Dives). */
export function DiveMiniCard({ dive }: { dive: DiveListItem }) {
  return (
    <Link href={`/dives/${dive.id}`} className="block w-40 shrink-0 snap-start active:opacity-80">
      <DepthCover depth={dive.maxDepth} photoUrl={dive.coverPhotoUrl} className="aspect-[4/5] rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <Star className="absolute right-2.5 top-2.5 size-4 fill-star text-star" aria-hidden />
        <div className="absolute inset-x-3 bottom-3 text-white">
          <div className="line-clamp-2 text-[15px] font-semibold leading-tight">{dive.site.name}</div>
          <div className="mt-1 text-xs text-white/80">
            {formatDateShort(dive.date)}
            {dive.maxDepth != null && ` · ${formatDepth(dive.maxDepth)}`}
          </div>
        </div>
      </DepthCover>
    </Link>
  );
}
