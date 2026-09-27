import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pt-4 lg:pt-8" aria-busy="true" aria-label="Loading dive">
      <Skeleton className="mb-3 h-10 w-24" />
      <Skeleton className="h-56 rounded-3xl" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mb-3 mt-8 h-6 w-36" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
