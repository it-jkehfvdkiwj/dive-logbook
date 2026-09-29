import { countryLabel } from "@/lib/country-display";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Pencil, Quote } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DepthCover } from "@/components/dives/depth-cover";
import { FavoriteButton } from "@/components/dives/favorite-button";
import { SiteMiniMap } from "@/components/map/site-mini-map";
import { DepthProfileChart } from "@/components/dives/depth-profile-chart";
import { SightingsSection } from "@/components/dives/sightings-section";
import { PhotosSection } from "@/components/dives/photos-section";
import {
  formatCoordinate,
  formatDateLong,
  formatDepth,
  formatMinutes,
  formatTemperature,
  formatWeekday,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { getDive } from "@/services/diveService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/dives/[id]">): Promise<Metadata> {
  const user = await requirePageUser();
  const dive = await getDive(user.id, (await params).id);
  return { title: dive ? dive.site.name : "Dive" };
}

export default async function DiveDetailPage({ params }: PageProps<"/dives/[id]">) {
  const { id } = await params;
  const user = await requirePageUser();
  const dive = await getDive(user.id, id);
  if (!dive) notFound();

  const place = [dive.site.location, countryLabel(dive.site.country, dive.site.countryCode)].filter(Boolean).join(", ");
  const hasCoords = dive.site.latitude != null && dive.site.longitude != null;

  const keyStats = [
    { label: "Max depth", value: formatDepth(dive.maxDepth) },
    { label: "Duration", value: formatMinutes(dive.duration) },
    { label: "Avg depth", value: formatDepth(dive.avgDepth) },
    { label: "Water", value: formatTemperature(dive.waterTemperature) },
    { label: "Visibility", value: formatDepth(dive.visibility) },
  ].filter((s): s is { label: string; value: string } => s.value !== null);

  const details = [
    { label: "Date", value: `${formatWeekday(dive.date)}, ${formatDateLong(dive.date)}` },
    { label: "Time", value: dive.startTime },
    { label: "Dive number", value: dive.diveNumber != null ? `#${dive.diveNumber}` : null },
    { label: "Dive site", value: dive.site.name },
    { label: "Location", value: dive.site.location },
    { label: "Country", value: countryLabel(dive.site.country, dive.site.countryCode) },
    { label: "Latitude", value: dive.site.latitude != null ? formatCoordinate(dive.site.latitude, "lat") : null },
    { label: "Longitude", value: dive.site.longitude != null ? formatCoordinate(dive.site.longitude, "lng") : null },
    { label: "Water conditions", value: dive.conditions },
    { label: "Current", value: dive.current },
    { label: "Weather", value: dive.weather },
    { label: "Entry type", value: dive.entryType },
    { label: "Dive type", value: dive.diveType },
    { label: "Buddy", value: dive.buddy },
    { label: "Dive center", value: dive.diveCenter },
    { label: "Source", value: dive.source !== "manual" ? dive.source.toUpperCase() : null },
  ].filter((d): d is { label: string; value: string } => !!d.value);

  return (
    <div className="pb-4 pt-3 lg:pt-8">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/dives"
          className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-lg pr-3 text-[15px] font-medium text-primary active:opacity-60"
        >
          <ChevronLeft className="size-6" /> Dives
        </Link>
        <Link href={`/dives/${dive.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Pencil /> Edit
        </Link>
      </div>

      <DepthCover depth={dive.maxDepth} photoUrl={dive.coverPhotoUrl} className="min-h-56 rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <div className="relative flex min-h-56 flex-col justify-end p-5 text-white">
          <div className="text-[13px] font-medium text-white/80">
            {dive.diveNumber != null && <span className="mr-2 tabular-nums">Dive #{dive.diveNumber}</span>}
            {formatDateLong(dive.date)}
            {dive.startTime && ` · ${dive.startTime}`}
          </div>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight">{dive.site.name}</h1>
          {place && (
            <div className="mt-1 flex items-center gap-1 text-[15px] text-white/85">
              <MapPin className="size-4" /> {place}
            </div>
          )}
        </div>
        <FavoriteButton diveId={dive.id} favorite={dive.favorite} tone="overlay" className="absolute right-3 top-3 z-10" />
      </DepthCover>

      {keyStats.length > 0 && (
        <div className={cn("mt-4 grid gap-2", keyStats.length >= 3 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2")}>
          {keyStats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/70 bg-card px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-[19px] font-bold tabular-nums tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {dive.notes && (
        <div className="mt-4 rounded-2xl bg-accent/60 p-4">
          <Quote className="mb-1 size-5 text-primary" />
          <p className="whitespace-pre-line text-[16px] leading-relaxed">{dive.notes}</p>
        </div>
      )}

      {dive.profile && (
        <div className="mt-8">
          <DepthProfileChart samples={dive.profile.samples} source={dive.profile.source} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <SightingsSection diveId={dive.id} sightings={dive.sightings} pendingSpeciesCount={dive.pendingSpeciesCount} />
          <PhotosSection diveId={dive.id} photos={dive.photos} />
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <h2 className="mb-3 text-[20px] font-bold tracking-tight">Details</h2>
            <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
              {details.map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 text-[15px] text-muted-foreground">{d.label}</dt>
                  <dd className="text-right text-[15px] font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {hasCoords ? (
            <SiteMiniMap siteId={dive.site.id} latitude={dive.site.latitude!} longitude={dive.site.longitude!} />
          ) : (
            <Link
              href={`/map?site=${dive.site.id}&edit=1`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 active:bg-accent"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <MapPin className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">No GPS position</div>
                <div className="text-[13px] text-muted-foreground">Tap to set it on the map – applies to all dives here</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
