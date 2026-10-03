import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Abschnitt mit Überschrift (einheitlich auf der Statistik-Seite). */
export function StatSection({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
        {aside && <span className="text-[13px] text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export interface Column {
  key: string;
  label: string;
  value: number;
  href?: string;
  active?: boolean;
  title?: string;
}

/**
 * Säulendiagramm (z. B. Dives pro Jahr). Wenige Säulen → Werte direkt beschriftet,
 * jede Säule ist antippbar (Link zur gefilterten Liste).
 */
export function ColumnChart({ columns, height = 150, compactLabels = false }: { columns: Column[]; height?: number; compactLabels?: boolean }) {
  const max = Math.max(...columns.map((c) => c.value), 1);
  const anyActive = columns.some((c) => c.active);
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3 pb-3 pt-4">
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {columns.map((c) => {
          const pct = (c.value / max) * 100;
          const bar = (
            <div className="flex h-full flex-col items-center justify-end gap-1" title={c.title ?? `${c.label}: ${c.value}`}>
              <span
                className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  c.value ? "text-foreground" : "text-transparent",
                  anyActive && !c.active && "text-muted-foreground",
                )}
              >
                {c.value}
              </span>
              <div
                className={cn(
                  "w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity",
                  anyActive && !c.active && "opacity-35",
                  c.value === 0 && "bg-border",
                )}
                style={{ height: c.value ? `max(${pct * 0.82}%, 3px)` : 2 }}
              />
            </div>
          );
          return (
            <div key={c.key} className="h-full min-w-0 flex-1">
              {c.href ? (
                <Link href={c.href} className="block h-full rounded-md active:opacity-70" aria-label={`${c.label}: ${c.value}`}>
                  {bar}
                </Link>
              ) : (
                bar
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] border-t border-border/70 pt-1.5">
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn(
              "min-w-0 flex-1 truncate text-center text-[11px] tabular-nums",
              c.active ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            {compactLabels ? c.label.slice(0, 1) : c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarRow {
  key: string;
  label: React.ReactNode;
  value: number;
  sub?: string;
  href?: string;
}

/** Rangliste mit Balken (Buddies, Plätze, Tiefen …). */
export function BarList({ rows, empty, unit }: { rows: BarRow[]; empty?: string; unit?: string }) {
  if (!rows.length) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted-foreground">{empty ?? "No data yet"}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate text-[15px] font-medium">{r.label}</span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {r.value}
                  {unit && <span className="ml-0.5 text-[12px] font-medium text-muted-foreground">{unit}</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
              {r.sub && <div className="mt-1 truncate text-[12px] text-muted-foreground">{r.sub}</div>}
            </div>
            {r.href && <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />}
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className="flex items-center gap-3 px-4 py-3 active:bg-accent">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
