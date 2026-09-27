import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function SpeciesAvatar({
  category,
  imageUrl,
  size = "md",
  className,
}: {
  category: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const cat = getCategory(category);
  const sizes = {
    sm: "size-9 rounded-lg text-lg",
    md: "size-12 rounded-xl text-2xl",
    lg: "size-16 rounded-2xl text-3xl",
    xl: "size-24 rounded-3xl text-5xl",
  };
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-accent to-secondary",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- beliebige externe Bild-URLs
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      ) : (
        <span className="leading-none">{cat.emoji}</span>
      )}
    </div>
  );
}
