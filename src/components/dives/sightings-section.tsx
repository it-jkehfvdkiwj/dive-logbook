"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Fish, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { SpeciesAvatar } from "@/components/species/species-avatar";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import type { SightingWithSpecies } from "@/types";
import { AddMarineLifeSheet } from "./add-marine-life-sheet";

export function SightingsSection({ diveId, sightings }: { diveId: string; sightings: SightingWithSpecies[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SightingWithSpecies | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[20px] font-bold tracking-tight">
          Marine Life
          {sightings.length > 0 && <span className="ml-2 text-muted-foreground">{sightings.length}</span>}
        </h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus /> Add Marine Life
        </Button>
      </div>

      {sightings.length === 0 ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full flex-col items-center rounded-2xl border border-dashed border-border px-6 py-8 text-center transition-colors active:bg-accent"
        >
          <Fish className="mb-2 size-7 text-muted-foreground" />
          <span className="text-[15px] font-semibold">No marine life logged yet</span>
          <span className="text-[13px] text-muted-foreground">Tap to add species you saw on this dive</span>
        </button>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {sightings.map((s) => (
            <li key={s.id} className="flex items-center">
              <Link
                href={`/marine-life/${s.species.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 transition-colors active:bg-accent"
              >
                <SpeciesAvatar category={s.species.category} imageUrl={s.species.imageUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-semibold">{s.species.commonName}</span>
                    {s.count != null && (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums">
                        ×{s.count}
                      </span>
                    )}
                  </div>
                  {s.notes ? (
                    <p className="line-clamp-2 text-[13px] text-muted-foreground">“{s.notes}”</p>
                  ) : (
                    s.species.scientificName && (
                      <p className="truncate text-[13px] italic text-muted-foreground">{s.species.scientificName}</p>
                    )
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
              </Link>
              <button
                type="button"
                onClick={() => setEditing(s)}
                aria-label={`Edit ${s.species.commonName} sighting`}
                className="flex size-12 shrink-0 items-center justify-center text-muted-foreground active:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddMarineLifeSheet
        diveId={diveId}
        open={adding}
        onOpenChange={setAdding}
        existingSpeciesIds={sightings.map((s) => s.species.id)}
      />
      {editing && <EditSightingSheet key={editing.id} sighting={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function EditSightingSheet({ sighting, onClose }: { sighting: SightingWithSpecies; onClose: () => void }) {
  const router = useRouter();
  const [count, setCount] = useState(sighting.count?.toString() ?? "");
  const [notes, setNotes] = useState(sighting.notes ?? "");
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "save" | "delete") {
    setPending(kind);
    setError(null);
    try {
      if (kind === "save") {
        await api.put(`/api/sightings/${sighting.id}`, { count: count ? Number(count) : null, notes: notes || null });
      } else {
        await api.delete(`/api/sightings/${sighting.id}`);
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(null);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <SpeciesAvatar category={sighting.species.category} imageUrl={sighting.species.imageUrl} />
            <DialogTitle className="truncate">{sighting.species.commonName}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Field id="edit-count" label="Count">
            <Input
              id="edit-count"
              inputMode="numeric"
              placeholder="–"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
          <Field id="edit-notes" label="Note">
            <Textarea id="edit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="destructive-ghost" onClick={() => run("delete")} disabled={!!pending}>
            {pending === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Remove from dive
          </Button>
          <Button onClick={() => run("save")} disabled={!!pending}>
            {pending === "save" && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
