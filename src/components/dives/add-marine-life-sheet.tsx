"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { SpeciesAvatar } from "@/components/species/species-avatar";
import { CategorySelect } from "@/components/species/category-select";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { SpeciesSummary } from "@/types";

type SearchResult = SpeciesSummary & { sightingCount: number };
type Step = { name: "search" } | { name: "details"; species: SpeciesSummary } | { name: "create" };

interface AddMarineLifeSheetProps {
  diveId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bereits beim Dive vorhandene Arten */
  existingSpeciesIds: string[];
}

export function AddMarineLifeSheet({ diveId, open, onOpenChange, existingSpeciesIds }: AddMarineLifeSheetProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "search" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details
  const [count, setCount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Neue Art
  const [newSpecies, setNewSpecies] = useState({ commonName: "", scientificName: "", category: "Fish" });
  const [createErrors, setCreateErrors] = useState<Record<string, string[] | undefined>>({});

  const requestId = useRef(0);

  function reset() {
    setStep({ name: "search" });
    setQuery("");
    setCount("");
    setNotes("");
    setError(null);
    setCreateErrors({});
  }

  // Suche (debounced)
  useEffect(() => {
    if (!open || step.name !== "search") return;
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ species: SearchResult[] }>(`/api/species?search=${encodeURIComponent(query)}`);
        if (id === requestId.current) {
          setResults(res.species);
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) setError(errorMessage(err));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open, step.name]);

  function choose(species: SpeciesSummary) {
    setCount("");
    setNotes("");
    setError(null);
    setStep({ name: "details", species });
  }

  async function addSighting(species: SpeciesSummary) {
    setSaving(true);
    setError(null);
    try {
      const n = count.trim() ? Number(count) : null;
      await api.post("/api/sightings", { diveId, speciesId: species.id, count: n, notes: notes || null });
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function createSpecies() {
    setSaving(true);
    setError(null);
    setCreateErrors({});
    try {
      const created = await api.post<SpeciesSummary>("/api/species", {
        commonName: newSpecies.commonName,
        scientificName: newSpecies.scientificName || null,
        category: newSpecies.category,
      });
      choose(created);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setCreateErrors(err.fieldErrors);
        const details = err.details as { field?: string; existingId?: string } | undefined;
        if (err.code === "conflict" && details?.field) setCreateErrors({ [details.field]: [err.message] });
      }
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const countNumber = Number(count) || 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="h-[88dvh] sm:h-[640px]" onOpenAutoFocus={(e) => step.name !== "search" && e.preventDefault()}>
        {step.name === "search" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Marine Life</DialogTitle>
            </DialogHeader>
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search species, e.g. hammer"
                  aria-label="Search species"
                  className="h-12 w-full rounded-xl bg-secondary pl-10 pr-10 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                {loading && (
                  <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            <DialogBody className="px-2">
              {error && <p className="px-3 py-2 text-sm text-destructive">{error}</p>}
              <ul>
                {results.map((s) => {
                  const added = existingSpeciesIds.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => choose(s)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-accent hover:bg-accent/50"
                      >
                        <SpeciesAvatar category={s.category} imageUrl={s.imageUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-semibold">{s.commonName}</div>
                          <div className="truncate text-[13px] text-muted-foreground">
                            {s.scientificName ? <i>{s.scientificName}</i> : s.category}
                            {s.sightingCount > 0 && ` · seen ${s.sightingCount}×`}
                          </div>
                        </div>
                        {added ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-primary">
                            <Check className="size-4" /> Added
                          </span>
                        ) : (
                          <Plus className="size-5 text-muted-foreground" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!loading && results.length === 0 && query.trim() && (
                <p className="px-3 py-6 text-center text-[15px] text-muted-foreground">No species found for “{query}”.</p>
              )}
              {query.trim() && (
                <div className="px-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewSpecies({ commonName: query.trim(), scientificName: "", category: "Fish" });
                      setError(null);
                      setStep({ name: "create" });
                    }}
                  >
                    <Plus /> Create “{query.trim()}”
                  </Button>
                </div>
              )}
            </DialogBody>
          </>
        )}

        {step.name === "details" && (
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => setStep({ name: "search" })}
                className="-ml-1 mb-1 flex w-fit items-center text-[15px] font-medium text-primary"
              >
                <ChevronLeft className="size-5" /> Search
              </button>
              <div className="flex items-center gap-3">
                <SpeciesAvatar category={step.species.category} imageUrl={step.species.imageUrl} size="lg" />
                <div className="min-w-0">
                  <DialogTitle className="truncate">{step.species.commonName}</DialogTitle>
                  {step.species.scientificName && (
                    <p className="truncate text-sm italic text-muted-foreground">{step.species.scientificName}</p>
                  )}
                </div>
              </div>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4 pt-2">
              <Field id="sighting-count" label="Count (optional)">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Decrease"
                    onClick={() => setCount(countNumber > 1 ? String(countNumber - 1) : "")}
                  >
                    <Minus />
                  </Button>
                  <Input
                    id="sighting-count"
                    inputMode="numeric"
                    className="text-center text-lg font-semibold"
                    placeholder="–"
                    value={count}
                    onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                  <Button variant="secondary" size="icon" aria-label="Increase" onClick={() => setCount(String(countNumber + 1))}>
                    <Plus />
                  </Button>
                </div>
              </Field>
              <Field id="sighting-notes" label="Note (optional)">
                <Textarea
                  id="sighting-notes"
                  rows={3}
                  placeholder="e.g. Large school at around 18 m."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              {existingSpeciesIds.includes(step.species.id) && (
                <p className="text-[13px] text-muted-foreground">
                  Already logged on this dive – saving updates the count and note.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </DialogBody>
            <DialogFooter>
              <Button className="w-full sm:w-auto" size="lg" onClick={() => addSighting(step.species)} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Add to dive
              </Button>
            </DialogFooter>
          </>
        )}

        {step.name === "create" && (
          <>
            <DialogHeader>
              <button
                type="button"
                onClick={() => setStep({ name: "search" })}
                className="-ml-1 mb-1 flex w-fit items-center text-[15px] font-medium text-primary"
              >
                <ChevronLeft className="size-5" /> Search
              </button>
              <DialogTitle>New species</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4 pt-2">
              <Field id="ns-common" label="Common name" error={createErrors.commonName}>
                <Input
                  id="ns-common"
                  autoCapitalize="words"
                  value={newSpecies.commonName}
                  onChange={(e) => setNewSpecies((s) => ({ ...s, commonName: e.target.value }))}
                />
              </Field>
              <Field id="ns-scientific" label="Scientific name (optional)" error={createErrors.scientificName}>
                <Input
                  id="ns-scientific"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="italic"
                  value={newSpecies.scientificName}
                  onChange={(e) => setNewSpecies((s) => ({ ...s, scientificName: e.target.value }))}
                />
              </Field>
              <Field id="ns-category" label="Category" error={createErrors.category}>
                <CategorySelect
                  id="ns-category"
                  value={newSpecies.category}
                  onChange={(e) => setNewSpecies((s) => ({ ...s, category: e.target.value }))}
                />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </DialogBody>
            <DialogFooter>
              <Button className="w-full sm:w-auto" size="lg" onClick={createSpecies} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create & continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
