import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, href, linkLabel = "See all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center text-[15px] font-medium text-primary active:opacity-60">
          {linkLabel}
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
