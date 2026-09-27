import { Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { DiveCard } from "@/components/dives/dive-card";
import { pluralize } from "@/lib/format";
import { listFavoriteDives } from "@/services/diveService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const dives = await listFavoriteDives();
  return (
    <>
      <PageHeader title="Favorites" subtitle={dives.length ? pluralize(dives.length, "favorite dive") : undefined} />
      <h2 className="mb-3 text-[20px] font-bold tracking-tight">Favorite Dives</h2>
      {dives.length === 0 ? (
        <EmptyState icon={<Star />} title="No favorites yet" description="Star your favorite dives to see them here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dives.map((dive) => (
            <DiveCard key={dive.id} dive={dive} />
          ))}
        </div>
      )}
    </>
  );
}
