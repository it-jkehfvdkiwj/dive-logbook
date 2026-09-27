"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/common/field";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "depth_desc", label: "Deepest" },
  { value: "duration_desc", label: "Longest" },
  { value: "number_desc", label: "Dive number" },
];

const FILTER_KEYS = ["favorite", "country", "location", "diveType", "from", "to", "minDepth", "maxDepth"] as const;
type FilterKey = (typeof FILTER_KEYS)[number] | "sort";
type FilterState = Record<FilterKey, string>;

interface DiveFiltersProps {
  countries: string[];
  locations: string[];
  diveTypes: string[];
}

export function DiveFilters({ countries, locations, diveTypes }: DiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const read = (): FilterState => ({
    favorite: searchParams.get("favorite") ?? "",
    country: searchParams.get("country") ?? "",
    location: searchParams.get("location") ?? "",
    diveType: searchParams.get("diveType") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    minDepth: searchParams.get("minDepth") ?? "",
    maxDepth: searchParams.get("maxDepth") ?? "",
    sort: searchParams.get("sort") ?? "",
  });
  const [draft, setDraft] = useState<FilterState>(read);

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;
  const favoritesOnly = searchParams.get("favorite") === "1";

  function apply(next: Partial<FilterState>, close = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    if (close) setOpen(false);
  }

  function clearAll() {
    const cleared = Object.fromEntries([...FILTER_KEYS, "sort"].map((k) => [k, ""])) as FilterState;
    setDraft(cleared);
    apply(cleared);
  }

  const set = (key: FilterKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Button
          variant={activeCount ? "default" : "secondary"}
          size="sm"
          onClick={() => {
            setDraft(read());
            setOpen(true);
          }}
        >
          <SlidersHorizontal />
          Filter{activeCount ? ` · ${activeCount}` : ""}
        </Button>
        <Chip active={favoritesOnly} onClick={() => apply({ favorite: favoritesOnly ? "" : "1" }, false)}>
          <Star className={cn("size-3.5", favoritesOnly && "fill-current")} /> Favorites
        </Chip>
        {SORT_OPTIONS.slice(0, 3).map((o) => {
          const active = (searchParams.get("sort") || "date_desc") === o.value;
          return (
            <Chip key={o.value} active={active} onClick={() => apply({ sort: o.value === "date_desc" ? "" : o.value }, false)}>
              {o.label}
            </Chip>
          );
        })}
        {activeCount > 0 && (
          <Chip active={false} onClick={clearAll}>
            <X className="size-3.5" /> Clear
          </Chip>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter dives</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <label className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <Star className="size-5 text-star" /> Favorites only
              </span>
              <Switch
                checked={draft.favorite === "1"}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, favorite: v ? "1" : "" }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field id="f-country" label="Country">
                <NativeSelect id="f-country" value={draft.country} onChange={set("country")}>
                  <option value="">All</option>
                  {countries.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="f-location" label="Location">
                <NativeSelect id="f-location" value={draft.location} onChange={set("location")}>
                  <option value="">All</option>
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="f-from" label="From">
                <Input id="f-from" type="date" value={draft.from} onChange={set("from")} />
              </Field>
              <Field id="f-to" label="To">
                <Input id="f-to" type="date" value={draft.to} onChange={set("to")} />
              </Field>
              <Field id="f-min" label="Min depth (m)">
                <Input id="f-min" inputMode="decimal" value={draft.minDepth} onChange={set("minDepth")} placeholder="0" />
              </Field>
              <Field id="f-max" label="Max depth (m)">
                <Input id="f-max" inputMode="decimal" value={draft.maxDepth} onChange={set("maxDepth")} placeholder="40" />
              </Field>
              <Field id="f-type" label="Dive type">
                <NativeSelect id="f-type" value={draft.diveType} onChange={set("diveType")}>
                  <option value="">All</option>
                  {diveTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="f-sort" label="Sort by">
                <NativeSelect id="f-sort" value={draft.sort || "date_desc"} onChange={set("sort")}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={clearAll}>
              Reset
            </Button>
            <Button onClick={() => apply({ ...draft, sort: draft.sort === "date_desc" ? "" : draft.sort })}>
              Show results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border bg-transparent text-foreground/80 active:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
