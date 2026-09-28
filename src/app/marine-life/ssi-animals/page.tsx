import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { UnmappedList } from "@/components/species/unmapped-list";
import { requirePageUser } from "@/lib/current-user";
import { listUnmappedExternalSpecies } from "@/services/externalSpeciesService";

export const dynamic = "force-dynamic";
export const metadata = { title: "SSI animals" };

export default async function SsiAnimalsPage() {
  const user = await requirePageUser();
  const items = await listUnmappedExternalSpecies(user.id, "ssi");
  return (
    <>
      <PageHeader
        title="SSI animals"
        subtitle="SSI only sends animal numbers. Assign each number to a species once – it is then added to all dives and every future sync."
        back={{ href: "/marine-life", label: "Marine Life" }}
      />
      {items.length === 0 ? (
        <EmptyState icon={<CheckCircle2 />} title="All SSI animals assigned" description="Nothing left to do here." />
      ) : (
        <UnmappedList items={items} />
      )}
    </>
  );
}
