import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SpeciesAvatar } from "@/components/species/species-avatar";
import { DeleteSpeciesButton } from "@/components/species/delete-species-button";
import { getCategory } from "@/lib/categories";
import { formatDateShort } from "@/lib/format";
import { getSpecies } from "@/services/speciesService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/marine-life/[id]">): Promise<Metadata> {
  const user = await requirePageUser();
  const s = await getSpecies(user.id, (await params).id);
  return { title: s?.commonName ?? "Species" };
}

export default async function SpeciesDetailPage({ params }: PageProps<"/marine-life/[id]">) {
  const { id } = await params;
  const user = await requirePageUser();
  const species = await getSpecies(user.id, id);
  if (!species) notFound();

  const category = getCategory(species.category);
  const { stats } = species;

  return (
    <div className="pb-4 pt-3 lg:pt-8">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/marine-life"
          className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-lg pr-3 text-[15px] font-medium text-primary active:opacity-60"
        >
          <ChevronLeft className="size-6" /> Marine Life
        </Link>
        <Link href={`/marine-life/${species.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Pencil /> Edit
        </Link>
      </div>

      <header className="flex flex-col items-center py-4 text-center">
        <SpeciesAvatar category={species.category} imageUrl={species.imageUrl} size="xl" />
        <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight">{species.commonName}</h1>
        {species.scientificName && <p className="mt-0.5 text-[16px] italic text-muted-foreground">{species.scientificName}</p>}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
          <span aria-hidden>{category.emoji}</span> {species.category}
        </span>
      </header>

      {species.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- externe Bild-URL
        <img src={species.imageUrl} alt={species.commonName} className="mb-4 max-h-80 w-full rounded-3xl object-cover" />
      )}

      {species.description && <p className="mx-auto mb-6 max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground">{species.description}</p>}

      <section className="mt-2">
        <h2 className="mb-3 text-[20px] font-bold tracking-tight">Statistics</h2>
        {stats.sightings === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[15px] text-muted-foreground">
            Not seen yet. Add it to a dive to start tracking.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Seen" value={`${stats.sightings}×`} />
            <Stat label="Dives" value={String(stats.dives)} />
            <Stat label="First seen" value={formatDateShort(species.firstSeen!.date)} sub={species.firstSeen!.siteName} />
            <Stat label="Last seen" value={formatDateShort(species.lastSeen!.date)} sub={species.lastSeen!.siteName} />
            {stats.individuals != null && <Stat label="Individuals" value={String(stats.individuals)} />}
            <Stat label="Locations" value={String(stats.locations.length)} sub={stats.locations.join(", ")} />
            <Stat label="Countries" value={String(stats.countries.length)} sub={stats.countries.join(", ")} />
          </div>
        )}
      </section>

      {species.sightings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[20px] font-bold tracking-tight">Sightings</h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {species.sightings.map((s) => (
              <li key={s.id}>
                <Link href={`/dives/${s.dive.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-accent hover:bg-accent/40">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-muted-foreground">{formatDateShort(s.dive.date)}</div>
                    <div className="truncate text-[16px] font-semibold">{s.dive.siteName}</div>
                    {s.dive.favorite && (
                      <div className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-star">
                        <Star className="size-3.5 fill-current" /> Favorite Dive
                      </div>
                    )}
                    {s.notes && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">“{s.notes}”</p>}
                  </div>
                  {s.count != null && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums">×{s.count}</span>
                  )}
                  <ChevronRight className="size-5 text-muted-foreground/50" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex justify-center">
        <DeleteSpeciesButton speciesId={species.id} name={species.commonName} sightingCount={stats.sightings} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[19px] font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
