"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import type { SpeciesSummary } from "@/types";
import { SpeciesAvatar } from "./species-avatar";
import { SpeciesName, SpeciesSubtitle } from "./species-lang";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onPick: (species: SpeciesSummary) => Promise<void>;
}

/** Art suchen (deutsch/englisch/wissenschaftlich) oder schnell neu anlegen. */
export function SpeciesPickerSheet({ open, onOpenChange, title, description, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpeciesSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++req.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<{ species: SpeciesSummary[] }>(`/api/species?search=${encodeURIComponent(query)}`);
        if (id === req.current) setResults(res.species);
      } catch (err) {
        if (id === req.current) setError(errorMessage(err));
      } finally {
        if (id === req.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  async function pick(s: SpeciesSummary) {
    setBusy(true);
    setError(null);
    try {
      await onPick(s);
      onOpenChange(false);
      setQuery("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAndPick() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<SpeciesSummary>("/api/species", { commonName: query.trim(), category: "Fish" });
      await pick(created);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[85dvh] sm:h-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. Manta / Riffmanta"
              aria-label="Search species"
              className="h-12 w-full rounded-xl bg-secondary pl-10 pr-10 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {(loading || busy) && (
              <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        <DialogBody className="px-2">
          {error && <p className="px-3 py-2 text-sm text-destructive">{error}</p>}
          <ul>
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-accent hover:bg-accent/50"
                >
                  <SpeciesAvatar category={s.category} imageUrl={s.imageUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">
                      <SpeciesName species={s} />
                    </div>
                    <SpeciesSubtitle species={s} className="truncate text-[13px]" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {query.trim() && !loading && (
            <div className="px-3 pt-2">
              <Button variant="outline" className="w-full" onClick={createAndPick} disabled={busy}>
                <Plus /> Create “{query.trim()}”
              </Button>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
