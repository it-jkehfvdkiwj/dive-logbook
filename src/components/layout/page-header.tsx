import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}

/** iOS-artiger Large Title Header. */
export function PageHeader({ title, subtitle, eyebrow, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("pb-4 pt-4 lg:pt-10", className)}>
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-1 inline-flex h-10 items-center gap-0.5 rounded-lg pr-3 text-[15px] font-medium text-primary active:opacity-60"
        >
          <ChevronLeft className="size-6" />
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
      </div>
    </header>
  );
}
