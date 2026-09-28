import type { Metadata } from "next";
import { DiveMap } from "@/components/map/dive-map";
import { requirePageUser } from "@/lib/current-user";
import { getMapSites } from "@/services/mapService";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Map" };

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const user = await requirePageUser();
  const { site, edit } = await searchParams;
  const sites = await getMapSites(user.id);
  return <DiveMap sites={sites} initialSiteId={typeof site === "string" ? site : undefined} editInitial={edit === "1"} />;
}
