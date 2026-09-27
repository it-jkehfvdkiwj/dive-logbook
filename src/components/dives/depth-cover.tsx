import { cn } from "@/lib/utils";

/**
 * Cover eines Dives: Foto, falls vorhanden – sonst ein ruhiger Verlauf,
 * der mit zunehmender Tiefe dunkler wird.
 */
export function DepthCover({
  depth,
  photoUrl,
  className,
  children,
}: {
  depth: number | null;
  photoUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = Math.min(Math.max((depth ?? 15) / 40, 0), 1); // 0 = flach, 1 = ≥ 40 m
  const top = `color-mix(in oklch, var(--ocean-1) ${Math.round((1 - t) * 100)}%, var(--ocean-2))`;
  const bottom = `color-mix(in oklch, var(--ocean-2) ${Math.round((1 - t) * 100)}%, var(--ocean-3))`;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={photoUrl ? undefined : { backgroundImage: `linear-gradient(165deg, ${top}, ${bottom})` }}
    >
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- beliebige externe Foto-URLs
        <img src={photoUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      )}
      {children}
    </div>
  );
}
