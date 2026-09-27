import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  href?: string;
  className?: string;
}

export function StatTile({ label, value, unit, href, className }: StatTileProps) {
  const content = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[26px] font-bold leading-none tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
    </>
  );
  const cls = cn("block rounded-2xl border border-border/70 bg-card p-4", href && "transition-colors active:bg-accent hover:bg-accent/50", className);
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}
