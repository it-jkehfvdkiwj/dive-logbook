"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 pb-safe backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[58px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground",
                )}
              >
                <Icon className={cn("size-[23px]", active && item.href === "/favorites" && "fill-current")} strokeWidth={active ? 2.3 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
