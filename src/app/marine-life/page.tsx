import Link from "next/link";
import { Fish, Plus, SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/common/search-input";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { SpeciesRow } from "@/components/species/species-row";
import { SpeciesFilters } from "@/components/species/species-filters";
import { pluralize } from "@/lib/format";
import { speciesFiltersSchema } from "@/lib/validation/species";
import { listSpecies, listSpeciesCountries } from "@/services/speciesService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marine Life" };

export default async function MarineLifePage({ searchParams }: PageProps<"/marine-life">) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const filters = speciesFiltersSchema.parse(raw);
  const user = await requirePageUser();
  const [species, lifeList, countries] = await Promise.all([
    listSpecies(user.id, filters),
    listSpecies(user.id, { view: "seen", sort: "name" }),
    listSpeciesCountries(user.id),
  ]);
  const categoriesInUse = [...new Set(lifeList.map((s) => s.category))];
  const hasQuery = Boolean(filters.q || filters.category || filters.country);

  return (
    <>
      <PageHeader
        title="Marine Life"
        subtitle={lifeList.length ? `${pluralize(lifeList.length, "species", "species")} in your life list` : "Your personal life list"}
        actions={
          <Link href="/marine-life/new" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Plus /> Add Species
          </Link>
        }
      />

      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 flex flex-col gap-3 bg-background/90 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <SearchInput placeholder="Search name, scientific name, category" />
        <SpeciesFilters countries={countries} categoriesInUse={categoriesInUse} />
      </div>

      {species.length === 0 ? (
        filters.view === "seen" && !hasQuery ? (
          <EmptyState
            icon={<Fish />}
            title="No marine life sightings yet"
            description="Add species to a dive – they appear here automatically."
            action={
              <Link href="/dives" className={buttonVariants()}>
                Add species to a dive
              </Link>
            }
          />
        ) : (
          <EmptyState icon={<SearchX />} title="No species found" description="Try a different search or filter." />
        )
      ) : (
        <div className="mt-1 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {species.map((s) => (
            <SpeciesRow key={s.id} species={s} />
          ))}
        </div>
      )}
    </>
  );
}
