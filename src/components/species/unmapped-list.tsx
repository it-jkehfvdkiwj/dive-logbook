"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { formatDateShort, pluralize } from "@/lib/format";
import type { UnmappedExternalSpecies } from "@/services/externalSpeciesService";
import { SpeciesPickerSheet } from "./species-picker-sheet";

export function UnmappedList({ items }: { items: UnmappedExternalSpecies[] }) {
  const router = useRouter();
  const [active, setActive] = useState<UnmappedExternalSpecies | null>(null);
  const [done, setDone] = useState<string | null>(null);

  return (
    <>
      {done && <p className="mb-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">{done}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.externalId} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <HelpCircle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">SSI animal #{item.externalId}</div>
                <div className="text-[13px] text-muted-foreground">Logged on {pluralize(item.diveCount, "dive")}</div>
              </div>
              <Button size="sm" onClick={() => setActive(item)}>
                Assign
              </Button>
            </div>
            <ul className="mt-3 flex flex-col gap-1 border-t border-border/60 pt-2 text-[13px]">
              {item.dives.slice(0, 4).map((d) => (
                <li key={d.id}>
                  <Link href={`/dives/${d.id}`} className="text-primary">
                    {d.diveNumber != null && `#${d.diveNumber} · `}
                    {d.siteName} · {formatDateShort(d.date)}
                  </Link>
                </li>
              ))}
              {item.dives.length > 4 && <li className="text-muted-foreground">+ {item.dives.length - 4} more</li>}
            </ul>
            {item.seenWith.length > 0 && (
              <p className="mt-2 text-[12px] text-muted-foreground">Also seen on these dives: {item.seenWith.join(", ")}</p>
            )}
          </li>
        ))}
      </ul>

      <SpeciesPickerSheet
        open={!!active}
        onOpenChange={(o) => !o && setActive(null)}
        title={active ? `SSI animal #${active.externalId}` : ""}
        description="Which species is this? Check one of the listed dives in your SSI app."
        onPick={async (species) => {
          if (!active) return;
          const res = await api.post<{ updatedDives: number }>("/api/external-species", {
            source: "ssi",
            externalId: active.externalId,
            speciesId: species.id,
          });
          setDone(`${species.commonName} added to ${pluralize(res.updatedDives, "dive")}. Future syncs will use it automatically.`);
          router.refresh();
        }}
      />
    </>
  );
}
