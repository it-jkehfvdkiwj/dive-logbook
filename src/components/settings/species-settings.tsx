"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SpeciesLang } from "@/lib/species-name";

interface Props {
  lang: SpeciesLang;
  missing: number;
}

export function SpeciesSettings({ lang, missing }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(lang);
  const [pending, setPending] = useState(false);
  const [left, setLeft] = useState(missing);
  const [message, setMessage] = useState<string | null>(null);

  async function setLang(next: SpeciesLang) {
    setCurrent(next);
    await api.put("/api/me", { speciesNameLang: next }).catch(() => setCurrent(current));
    router.refresh();
  }

  async function fetchAll() {
    setPending(true);
    setMessage(null);
    try {
      // In Etappen, bis alles erledigt ist (jede Etappe max. ~45 s)
      let remaining = left;
      let updated = 0;
      for (let round = 0; round < 10 && remaining > 0; round++) {
        const res = await api.post<{ updated: number; remaining: number; checked: number }>("/api/species/enrich");
        updated += res.updated;
        remaining = res.remaining;
        setLeft(remaining);
        setMessage(`${updated} species updated${remaining ? ` · ${remaining} left…` : ""}`);
        if (res.checked === 0) break;
      }
      setMessage(`Done: ${updated} species got a photo or German name.`);
      router.refresh();
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 text-sm font-medium">Animal names</div>
        <div role="radiogroup" aria-label="Animal names" className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(
            [
              { value: "de", label: "🇩🇪 Deutsch" },
              { value: "en", label: "🇬🇧 English" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={current === o.value}
              onClick={() => setLang(o.value)}
              className={cn(
                "h-11 rounded-xl text-sm font-medium transition-all",
                current === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">
          The other language is shown underneath. Search always works in both.
        </p>
      </div>

      <div className="border-t border-border/60 pt-3">
        <p className="mb-2 text-[13px] text-muted-foreground">
          Photos and German names come from iNaturalist.{" "}
          {left > 0 ? `${left} species not checked yet.` : "All species are checked."}
        </p>
        <Button variant="secondary" size="sm" onClick={fetchAll} disabled={pending || left === 0}>
          {pending ? <Loader2 className="animate-spin" /> : <ImageDown />}
          Fetch photos &amp; German names
        </Button>
        {message && <p className="mt-2 text-[13px] text-primary">{message}</p>}
      </div>
    </div>
  );
}
