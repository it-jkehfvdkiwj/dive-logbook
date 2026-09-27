import { cn } from "@/lib/utils";

/** App-Logo: Tiefenverlauf mit aufsteigenden Luftblasen. Identisch mit dem PWA-Icon. */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="app-mark-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f9fc9" />
          <stop offset="1" stopColor="#0b2340" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#app-mark-bg)" />
      <circle cx="37" cy="44" r="8" fill="none" stroke="#fff" strokeWidth="3.2" />
      <circle cx="26" cy="27" r="5" fill="none" stroke="#fff" strokeWidth="3" opacity=".9" />
      <circle cx="35" cy="15" r="2.8" fill="#fff" opacity=".8" />
    </svg>
  );
}
