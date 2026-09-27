import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-base text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "[&::-webkit-date-and-time-value]:text-left",
        className,
      )}
      {...props}
    />
  );
}
