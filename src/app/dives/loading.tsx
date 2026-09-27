import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pt-6 lg:pt-12" aria-busy="true" aria-label="Loading dives">
      <Skeleton className="mb-6 h-9 w-32" />
      <Skeleton className="mb-3 h-11 w-full" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[196px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
