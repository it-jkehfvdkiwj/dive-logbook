"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  diveId: string;
  favorite: boolean;
  /** "overlay" = auf Cover-Bildern, "plain" = auf normalem Hintergrund */
  tone?: "overlay" | "plain";
  size?: "sm" | "md";
  className?: string;
}

/** Ein Tap → sofort Favorit. Optimistisch, bei Fehler wird zurückgesetzt. */
export function FavoriteButton({ diveId, favorite, tone = "plain", size = "md", className }: FavoriteButtonProps) {
  const router = useRouter();
  const [value, setValue] = useState(favorite);
  const [synced, setSynced] = useState(favorite);
  const [, startTransition] = useTransition();

  // Server-Wert übernehmen, wenn er sich ändert (z. B. nach router.refresh)
  if (favorite !== synced) {
    setSynced(favorite);
    setValue(favorite);
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !value;
    setValue(next);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
    try {
      await api.patch(`/api/dives/${diveId}/favorite`, { favorite: next });
      startTransition(() => router.refresh());
    } catch {
      setValue(!next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={value}
      aria-label={value ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-90",
        size === "md" ? "size-11" : "size-9",
        tone === "overlay" ? "bg-black/25 text-white backdrop-blur-md" : "text-muted-foreground hover:bg-accent",
        className,
      )}
    >
      <Star
        className={cn(size === "md" ? "size-[22px]" : "size-5", value && "fill-star text-star")}
        strokeWidth={value ? 1.5 : 2}
      />
    </button>
  );
}
