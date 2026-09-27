import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SpeciesForm } from "@/components/species/species-form";
import { getSpeciesForEdit } from "@/services/speciesService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Species" };

export default async function EditSpeciesPage({ params }: PageProps<"/marine-life/[id]/edit">) {
  const { id } = await params;
  const s = await getSpeciesForEdit(id);
  if (!s) notFound();
  return (
    <>
      <PageHeader title="Edit Species" back={{ href: `/marine-life/${s.id}`, label: s.commonName }} />
      <SpeciesForm
        mode="edit"
        speciesId={s.id}
        cancelHref={`/marine-life/${s.id}`}
        initial={{
          commonName: s.commonName,
          scientificName: s.scientificName ?? "",
          category: s.category,
          description: s.description ?? "",
          imageUrl: s.imageUrl ?? "",
        }}
      />
    </>
  );
}
