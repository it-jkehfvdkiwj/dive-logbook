import Link from "next/link";
import { Plus, SearchX, Waves } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/common/search-input";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DiveCard } from "@/components/dives/dive-card";
import { DiveFilters } from "@/components/dives/dive-filters";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { diveFiltersSchema } from "@/lib/validation/dive";
import { countDives, listDiveTypes, listDives } from "@/services/diveService";
import { listCountries, listLocations } from "@/services/diveSiteService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dives" };

export default async function DivesPage({ searchParams }: PageProps<"/dives">) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const filters = diveFiltersSchema.parse(raw);
  const user = await requirePageUser();
  const [dives, total, countries, locations, diveTypes] = await Promise.all([
    listDives(user.id, filters),
    countDives(user.id),
    listCountries(user.id),
    listLocations(user.id),
    listDiveTypes(user.id),
  ]);
  const filtered = Boolean(
    filters.q || filters.favorite || filters.country || filters.location || filters.diveType || filters.from || filters.to || filters.minDepth != null || filters.maxDepth != null,
  );

  return (
    <>
      <PageHeader
        title="Dives"
        subtitle={total > 0 ? (filtered ? `${dives.length} of ${pluralize(total, "dive")}` : pluralize(total, "dive")) : undefined}
        actions={
          <Link href="/dives/new" className={cn(buttonVariants({ size: "icon" }), "rounded-full lg:hidden")} aria-label="Add dive">
            <Plus className="!size-6" />
          </Link>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<Waves />}
          title="No dives yet"
          description="Your logbook is empty. Log your first dive to get started."
          action={
            <Link href="/dives/new" className={buttonVariants()}>
              <Plus /> Add your first dive
            </Link>
          }
        />
      ) : (
        <>
          <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 flex flex-col gap-3 bg-background/90 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            <SearchInput placeholder="Search site, location, country, buddy" />
            <DiveFilters countries={countries} locations={locations} diveTypes={diveTypes} />
          </div>

          {dives.length === 0 ? (
            <EmptyState
              className="mt-2"
              icon={<SearchX />}
              title="No matching dives"
              description="Try a different search or clear your filters."
            />
          ) : (
            <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dives.map((dive) => (
                <DiveCard key={dive.id} dive={dive} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
