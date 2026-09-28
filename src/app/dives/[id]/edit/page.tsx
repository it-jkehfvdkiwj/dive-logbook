import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DiveForm } from "@/components/dives/dive-form";
import type { DiveFormValues } from "@/lib/dive-form-values";
import { toDateInputValue } from "@/lib/format";
import { getDive, listDiveTypes } from "@/services/diveService";
import { listCountries, listLocations } from "@/services/diveSiteService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Dive" };

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export default async function EditDivePage({ params }: PageProps<"/dives/[id]/edit">) {
  const { id } = await params;
  const user = await requirePageUser();
  const [dive, countries, locations, diveTypes] = await Promise.all([
    getDive(user.id, id),
    listCountries(user.id),
    listLocations(user.id),
    listDiveTypes(user.id),
  ]);
  if (!dive) notFound();

  const initial: DiveFormValues = {
    date: toDateInputValue(dive.date),
    startTime: str(dive.startTime),
    diveNumber: str(dive.diveNumber),
    siteName: dive.site.name,
    location: str(dive.site.location),
    country: str(dive.site.country),
    latitude: str(dive.site.latitude),
    longitude: str(dive.site.longitude),
    maxDepth: str(dive.maxDepth),
    avgDepth: str(dive.avgDepth),
    duration: str(dive.duration),
    waterTemperature: str(dive.waterTemperature),
    visibility: str(dive.visibility),
    conditions: str(dive.conditions),
    current: str(dive.current),
    weather: str(dive.weather),
    entryType: str(dive.entryType),
    diveType: str(dive.diveType),
    buddy: str(dive.buddy),
    diveCenter: str(dive.diveCenter),
    notes: str(dive.notes),
    favorite: dive.favorite,
  };

  return (
    <>
      <PageHeader title="Edit Dive" subtitle={dive.site.name} back={{ href: `/dives/${dive.id}`, label: "Dive" }} />
      <DiveForm mode="edit" diveId={dive.id} initial={initial} suggestions={{ countries, locations, diveTypes }} />
    </>
  );
}
