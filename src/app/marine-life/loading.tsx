import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="pt-6 lg:pt-12" aria-busy="true" aria-label="Loading marine life">
      <Skeleton className="mb-6 h-9 w-48" />
      <Skeleton className="mb-3 h-11 w-full" />
      <Skeleton className="mb-3 h-11 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
