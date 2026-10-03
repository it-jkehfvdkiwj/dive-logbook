import { countryLabel } from "@/lib/country-display";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { EmptyState } from "@/components/common/empty-state";
import { getCategory } from "@/lib/categories";
import { formatTotalTime } from "@/lib/format";
import { getOverviewStats } from "@/services/statsService";
import { getDiveInsights } from "@/services/insightsService";
import { BarList, ColumnChart, StatSection } from "@/components/stats/stat-charts";
import { flagEmoji } from "@/lib/country-display";
import { cn } from "@/lib/utils";
import { requirePageUser } from "@/lib/current-user";
import { SpeciesName } from "@/components/species/species-lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistics" };

const oneDecimal = (v: number | null) => (v == null ? "–" : v.toFixed(1));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const user = await requirePageUser();
  const yearParam = Number((await searchParams).year);
  const insightsAll = await getDiveInsights(user.id);
  const year = insightsAll.years.includes(yearParam) ? yearParam : undefined;
  const [s, ins] = await Promise.all([
    getOverviewStats(user.id, year),
    year ? getDiveInsights(user.id, year) : Promise.resolve(insightsAll),
  ]);

  if (insightsAll.perYear.length === 0) {
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
      <PageHeader title="Statistics" subtitle={year ? `Your diving in ${year}` : "Your diving at a glance"} />

      {ins.years.length > 1 || year ? (
        <nav aria-label="Year" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
          {[undefined, ...[...insightsAll.years].reverse()].map((y) => (
            <Link
              key={y ?? "all"}
              href={y ? `/stats?year=${y}` : "/stats"}
              scroll={false}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold tabular-nums transition-colors",
                y === year ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground active:opacity-70",
              )}
            >
              {y ?? "All time"}
            </Link>
          ))}
        </nav>
      ) : null}

      <Group title="Dives">
        <StatTile label="Total dives" value={s.totalDives} href="/dives" />
        <StatTile label="Total dive time" value={formatTotalTime(s.totalMinutes)} />
        <StatTile label="Avg duration" value={s.avgDuration != null ? Math.round(s.avgDuration) : "–"} unit="min" />
        <StatTile label="Max depth" value={oneDecimal(s.maxDepth)} unit="m" href={s.deepestDiveId ? `/dives/${s.deepestDiveId}` : undefined} />
        <StatTile label="Avg depth" value={oneDecimal(s.avgDepth)} unit="m" />
        <StatTile label="Avg max depth" value={oneDecimal(s.avgMaxDepth)} unit="m" />
        <StatTile label="Diving days" value={ins.divingDays} />
        <StatTile label="Buddies" value={ins.buddyCount} />
        <StatTile label="Dive centers" value={ins.diveCenterCount} />
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

      {/* Zeitverlauf */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {insightsAll.perYear.length > 0 && (
          <StatSection title="Dives per year" aside={year ? undefined : `${insightsAll.perYear.length} ${insightsAll.perYear.length === 1 ? "year" : "years"}`}>
            <ColumnChart
              columns={insightsAll.perYear.map((y) => ({
                key: String(y.year),
                label: insightsAll.perYear.length > 8 ? `’${String(y.year).slice(2)}` : String(y.year),
                value: y.dives,
                active: y.year === year,
                href: y.year === year ? "/stats" : `/stats?year=${y.year}`,
                title: `${y.year}: ${y.dives} dives · ${formatTotalTime(y.minutes)}`,
              }))}
            />
          </StatSection>
        )}
        <StatSection title="Season" aside={year ? `${year}` : "all years"}>
          <ColumnChart
            compactLabels
            columns={ins.perMonth.map((v, i) => ({ key: MONTHS[i], label: MONTHS[i], value: v, title: `${MONTHS[i]}: ${v} dives` }))}
          />
        </StatSection>
      </div>

      {/* Menschen & Orte */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <StatSection title="Dive buddies" aside={ins.soloDives ? `${ins.soloDives} without buddy` : undefined}>
          <BarList
            rows={ins.buddies.map((b) => ({ key: b.key, label: b.label, value: b.count, sub: b.sub, href: b.href }))}
            empty="No buddies logged yet"
            unit="×"
          />
        </StatSection>

        <StatSection title="Records">
          {ins.records.length ? (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {ins.records.map((r) => (
                <li key={r.label}>
                  <Link href={`/dives/${r.diveId}`} className="flex items-center gap-3 px-4 py-3 active:bg-accent">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-medium">{r.label}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{r.sub}</div>
                    </div>
                    <span className="shrink-0 text-[17px] font-bold tabular-nums">{r.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <BarList rows={[]} />
          )}
        </StatSection>

        <StatSection title="Favourite sites">
          <BarList
            rows={ins.topSites.map((x) => ({
              key: x.key,
              label: (
                <>
                  {x.code && <span aria-hidden className="mr-1.5">{flagEmoji(x.code)}</span>}
                  {x.label}
                </>
              ),
              value: x.count,
              sub: x.sub,
              href: x.href,
            }))}
            unit="×"
          />
        </StatSection>

        <StatSection title="Max depth">
          <BarList rows={ins.depthBuckets.map((b) => ({ key: b.label, label: b.label, value: b.count }))} unit=" dives" />
        </StatSection>

        {ins.diveCenters.length > 0 && (
          <StatSection title="Dive centers">
            <BarList rows={ins.diveCenters.map((c) => ({ key: c.key, label: c.label, value: c.count, href: c.href }))} unit="×" />
          </StatSection>
        )}

        {ins.timeOfDay.some((t) => t.count) && (
          <StatSection title="Time of day">
            <div className="grid grid-cols-4 gap-2">
              {ins.timeOfDay.map((t) => (
                <div key={t.label} className="rounded-2xl border border-border/70 bg-card px-2 py-3 text-center">
                  <div aria-hidden className="text-xl">{{ Morning: "🌅", Midday: "☀️", Afternoon: "🌤️", Night: "🌙" }[t.label]}</div>
                  <div className="mt-1 text-[20px] font-bold tabular-nums">{t.count}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          </StatSection>
        )}
      </div>

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
                <Link href={`/dives?country=${encodeURIComponent(c.country)}${year ? `&from=${year}-01-01&to=${year}-12-31` : ""}`} className="block">
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
