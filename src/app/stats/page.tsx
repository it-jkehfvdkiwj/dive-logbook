import { countryLabel } from "@/lib/country-display";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { EmptyState } from "@/components/common/empty-state";
import { getCategory } from "@/lib/categories";
import { formatTotalTime } from "@/lib/format";
import { getOverviewStats } from "@/services/statsService";
import { requirePageUser } from "@/lib/current-user";
import { SpeciesName } from "@/components/species/species-lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistics" };

const oneDecimal = (v: number | null) => (v == null ? "–" : v.toFixed(1));

export default async function StatsPage() {
  const user = await requirePageUser();
  const s = await getOverviewStats(user.id);

  if (s.totalDives === 0) {
    return (
      <>
        <PageHeader title="Statistics" />
        <EmptyState icon={<BarChart3 />} title="No statistics yet" description="Log a few dives to see your numbers." />
      </>
    );
  }

  const maxCat = Math.max(...s.speciesByCategory.map((c) => c.count), 1);
  const maxCountry = Math.max(...s.divesByCountry.map((c) => c.count), 1);

  return (
    <>
      <PageHeader title="Statistics" subtitle="Your diving at a glance" />

      <Group title="Dives">
        <StatTile label="Total dives" value={s.totalDives} href="/dives" />
        <StatTile label="Total dive time" value={formatTotalTime(s.totalMinutes)} />
        <StatTile label="Avg duration" value={s.avgDuration != null ? Math.round(s.avgDuration) : "–"} unit="min" />
        <StatTile label="Max depth" value={oneDecimal(s.maxDepth)} unit="m" href={s.deepestDiveId ? `/dives/${s.deepestDiveId}` : undefined} />
        <StatTile label="Avg depth" value={oneDecimal(s.avgDepth)} unit="m" />
        <StatTile label="Avg max depth" value={oneDecimal(s.avgMaxDepth)} unit="m" />
      </Group>

      <Group title="Places">
        <StatTile label="Countries" value={s.countries} href="/map" />
        <StatTile label="Dive sites" value={s.diveSites} href="/map" />
      </Group>

      <Group title="Marine Life">
        <StatTile label="Total species" value={s.totalSpecies} href="/marine-life" />
        <StatTile label="Total sightings" value={s.totalSightings} />
        {["Shark", "Ray", "Fish"].map((cat) => (
          <StatTile
            key={cat}
            label={`${cat} species`}
            value={s.speciesByCategory.find((c) => c.category === cat)?.count ?? 0}
            href={`/marine-life?category=${cat}`}
          />
        ))}
      </Group>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {s.speciesByCategory.length > 0 && (
          <section>
            <h2 className="mb-3 text-[20px] font-bold tracking-tight">Species by category</h2>
            <ul className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card p-4">
              {s.speciesByCategory.map((c) => {
                const info = getCategory(c.category);
                return (
                  <li key={c.category}>
                    <Link href={`/marine-life?category=${encodeURIComponent(c.category)}`} className="block">
                      <div className="mb-1 flex justify-between text-[14px]">
                        <span>
                          <span aria-hidden>{info.emoji}</span> {c.category}
                        </span>
                        <span className="font-semibold tabular-nums">{c.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[20px] font-bold tracking-tight">Dives by country</h2>
          <ul className="flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-card p-4">
            {s.divesByCountry.map((c) => (
              <li key={c.country}>
                <Link href={`/dives?country=${encodeURIComponent(c.country)}`} className="block">
                  <div className="mb-1 flex justify-between text-[14px]">
                    <span>{countryLabel(c.country, c.countryCode)}</span>
                    <span className="font-semibold tabular-nums">{c.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {s.topSpecies.length > 0 && (
          <section>
            <h2 className="mb-3 text-[20px] font-bold tracking-tight">Most seen</h2>
            <ol className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {s.topSpecies.map((t, i) => (
                <li key={t.id}>
                  <Link href={`/marine-life/${t.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-accent">
                    <span className="w-5 text-[15px] font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                    <span aria-hidden className="text-xl">{getCategory(t.category).emoji}</span>
                    <span className="flex-1 truncate text-[15px] font-medium">
                      <SpeciesName species={t} />
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums">{t.count}×</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first-of-type:mt-0">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}
