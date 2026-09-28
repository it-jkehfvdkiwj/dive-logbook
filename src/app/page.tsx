import Link from "next/link";
import { Fish, Plus, Star, Waves } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Greeting } from "@/components/common/greeting";
import { StatTile } from "@/components/common/stat-tile";
import { SectionHeader } from "@/components/common/section-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DiveRow } from "@/components/dives/dive-row";
import { DiveMiniCard } from "@/components/dives/dive-mini-card";
import { SpeciesAvatar } from "@/components/species/species-avatar";
import { formatDateShort, formatTotalTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listDives, listFavoriteDives } from "@/services/diveService";
import { listRecentlySeen } from "@/services/speciesService";
import { getOverviewStats } from "@/services/statsService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [stats, recent, favorites, recentlySeen] = await Promise.all([
    getOverviewStats(user.id),
    listDives(user.id, {}, 5),
    listFavoriteDives(user.id, 12),
    listRecentlySeen(user.id, 8),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Dive Log"
        title={<Greeting name={user.name} />}
        actions={
          <Link href="/dives/new" className={cn(buttonVariants({ size: "icon" }), "rounded-full lg:hidden")} aria-label="Add dive">
            <Plus className="!size-6" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Dives" value={stats.totalDives} href="/dives" />
        <StatTile label="Dive time" value={formatTotalTime(stats.totalMinutes)} href="/stats" />
        <StatTile
          label="Max depth"
          value={stats.maxDepth != null ? stats.maxDepth.toFixed(1) : "–"}
          unit={stats.maxDepth != null ? "m" : undefined}
          href={stats.deepestDiveId ? `/dives/${stats.deepestDiveId}` : "/stats"}
        />
        <StatTile label="Marine life" value={stats.totalSpecies} unit="species" href="/marine-life" />
      </div>

      <section className="mt-8">
        <SectionHeader title="Recent Dives" href={recent.length ? "/dives" : undefined} />
        {recent.length === 0 ? (
          <EmptyState
            icon={<Waves />}
            title="No dives yet"
            description="Log your first dive to start your personal logbook."
            action={
              <Link href="/dives/new" className={buttonVariants()}>
                <Plus /> Add your first dive
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {recent.map((dive) => (
              <DiveRow key={dive.id} dive={dive} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeader title="Favorite Dives" href={favorites.length ? "/favorites" : undefined} />
        {favorites.length === 0 ? (
          <EmptyState
            icon={<Star />}
            title="No favorites yet"
            description="Star your favorite dives to see them here."
            className="py-8"
          />
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:px-0">
            {favorites.map((dive) => (
              <DiveMiniCard key={dive.id} dive={dive} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeader title="Recently Seen" href={recentlySeen.length ? "/marine-life" : undefined} />
        {recentlySeen.length === 0 ? (
          <EmptyState
            icon={<Fish />}
            title="No marine life sightings yet"
            description="Add species to a dive and they appear in your life list automatically."
            className="py-8"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentlySeen.map((s) => (
              <Link
                key={s.id}
                href={`/marine-life/${s.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-colors active:bg-accent hover:bg-accent/40"
              >
                <SpeciesAvatar category={s.category} imageUrl={s.imageUrl} size="sm" />
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[14px] font-semibold leading-tight">{s.commonName}</div>
                  <div className="truncate text-xs text-muted-foreground">{formatDateShort(s.lastSeen.date)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
