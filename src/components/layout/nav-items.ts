import { BarChart3, Fish, Home, Settings, Star, Waves, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** In der Bottom Navigation anzeigen */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home, mobile: true },
  { href: "/dives", label: "Dives", icon: Waves, mobile: true },
  { href: "/marine-life", label: "Marine Life", icon: Fish, mobile: true },
  { href: "/favorites", label: "Favorites", icon: Star, mobile: true },
  { href: "/stats", label: "Statistics", icon: BarChart3, mobile: false },
  { href: "/settings", label: "Settings", icon: Settings, mobile: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
