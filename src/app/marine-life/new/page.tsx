import { PageHeader } from "@/components/layout/page-header";
import { SpeciesForm } from "@/components/species/species-form";

export const metadata = { title: "Add Species" };

export default async function NewSpeciesPage({ searchParams }: PageProps<"/marine-life/new">) {
  const { name } = await searchParams;
  return (
    <>
      <PageHeader title="Add Species" back={{ href: "/marine-life", label: "Marine Life" }} />
      <SpeciesForm
        mode="create"
        cancelHref="/marine-life"
        initial={{
          commonName: typeof name === "string" ? name : "",
          scientificName: "",
          category: "Fish",
          description: "",
          imageUrl: "",
        }}
      />
    </>
  );
}
