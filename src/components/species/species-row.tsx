import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import type { SpeciesListItem } from "@/types";
import { SpeciesAvatar } from "./species-avatar";

/** Eintrag der Life List. */
export function SpeciesRow({ species }: { species: SpeciesListItem }) {
  const seen = species.sightingCount > 0;
  return (
    <Link
      href={`/marine-life/${species.id}`}
      className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-accent hover:bg-accent/40"
    >
      <SpeciesAvatar category={species.category} imageUrl={species.imageUrl} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold">{species.commonName}</div>
        {species.scientificName && (
          <div className="truncate text-[13px] italic text-muted-foreground">{species.scientificName}</div>
        )}
        <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {seen && species.lastSeen
            ? `Last seen ${formatDateShort(species.lastSeen.date)} · ${species.lastSeen.siteName}`
            : "Not seen yet"}
        </div>
      </div>
      {seen && (
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[17px] font-bold tabular-nums leading-none">{species.sightingCount}×</span>
          <span className="mt-1 text-[11px] text-muted-foreground">seen</span>
        </div>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}
