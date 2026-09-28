import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { ServiceWorkerRegister } from "@/components/common/sw-register";
import { AppShell } from "@/components/layout/app-shell";
import { SpeciesLangProvider } from "@/components/species/species-lang";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: { default: "Dive Log", template: "%s · Dive Log" },
  description: "Personal dive logbook & marine life tracker",
  applicationName: "Dive Log",
  appleWebApp: {
    capable: true,
    title: "Dive Log",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1320" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser().catch(() => null);
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SpeciesLangProvider lang={user?.speciesNameLang ?? "en"}>
            <AppShell>{children}</AppShell>
          </SpeciesLangProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
