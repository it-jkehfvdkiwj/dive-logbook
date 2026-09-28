import { PageHeader } from "@/components/layout/page-header";
import { DiveForm } from "@/components/dives/dive-form";
import { emptyDiveForm } from "@/lib/dive-form-values";
import { listDiveTypes, suggestNextDiveNumber } from "@/services/diveService";
import { listCountries, listLocations } from "@/services/diveSiteService";
import { requirePageUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Dive" };

export default async function NewDivePage() {
  const user = await requirePageUser();
  const [nextNumber, countries, locations, diveTypes] = await Promise.all([
    suggestNextDiveNumber(user.id),
    listCountries(user.id),
    listLocations(user.id),
    listDiveTypes(user.id),
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
