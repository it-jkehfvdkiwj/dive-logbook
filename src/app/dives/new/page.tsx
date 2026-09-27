import { PageHeader } from "@/components/layout/page-header";
import { DiveForm } from "@/components/dives/dive-form";
import { emptyDiveForm } from "@/lib/dive-form-values";
import { listDiveTypes, suggestNextDiveNumber } from "@/services/diveService";
import { listCountries, listLocations } from "@/services/diveSiteService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Dive" };

export default async function NewDivePage() {
  const [nextNumber, countries, locations, diveTypes] = await Promise.all([
    suggestNextDiveNumber(),
    listCountries(),
    listLocations(),
    listDiveTypes(),
  ]);
  return (
    <>
      <PageHeader title="Add Dive" back={{ href: "/dives", label: "Dives" }} />
      <DiveForm
        mode="create"
        initial={emptyDiveForm({ diveNumber: String(nextNumber) })}
        suggestions={{ countries, locations, diveTypes }}
      />
    </>
  );
}
