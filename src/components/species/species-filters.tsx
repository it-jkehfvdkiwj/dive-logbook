"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Chip } from "@/components/dives/dive-filters";
import { SPECIES_CATEGORIES } from "@/lib/categories";

const SORTS = [
  { value: "recent", label: "Recently seen" },
  { value: "most_seen", label: "Most seen" },
  { value: "first_seen", label: "Newest additions" },
  { value: "name", label: "A–Z" },
];

export function SpeciesFilters({ countries, categoriesInUse }: { countries: string[]; categoriesInUse: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const view = searchParams.get("view") === "all" ? "all" : "seen";
  const category = searchParams.get("category") ?? "";
  const categories = SPECIES_CATEGORIES.filter((c) => view === "all" || categoriesInUse.includes(c.value));

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="View" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {[
          { value: "seen", label: "My Life List" },
          { value: "all", label: "All species" },
        ].map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={view === t.value}
            onClick={() => update("view", t.value === "seen" ? "" : t.value)}
            className={`h-9 rounded-lg text-sm font-medium transition-all ${view === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={!category} onClick={() => update("category", "")}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.value} active={category === c.value} onClick={() => update("category", category === c.value ? "" : c.value)}>
            <span aria-hidden>{c.emoji}</span> {c.label}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NativeSelect
          aria-label="Country"
          className="h-10 text-sm"
          value={searchParams.get("country") ?? ""}
          onChange={(e) => update("country", e.target.value)}
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Sort"
          className="h-10 text-sm"
          value={searchParams.get("sort") ?? "recent"}
          onChange={(e) => update("sort", e.target.value === "recent" ? "" : e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
