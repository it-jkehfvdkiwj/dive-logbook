import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dive Log – Logbook & Marine Life",
    short_name: "Dive Log",
    description: "Personal dive logbook & marine life tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1320",
    theme_color: "#0b1320",
    categories: ["sports", "lifestyle", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add dive", url: "/dives/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Marine Life", url: "/marine-life", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
