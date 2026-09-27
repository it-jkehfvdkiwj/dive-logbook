// Erzeugt die PWA-Icons aus einer SVG-Vorlage.  Aufruf: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT = new URL("../public/icons/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// scale < 1 lässt Rand für "maskable" (Safe Zone) bzw. für abgerundete iOS-Ecken
const svg = ({ rounded, scale = 1 }) => {
  const s = scale;
  const c = (v) => 32 + (v - 32) * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2f9fc9"/><stop offset="1" stop-color="#0b2340"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="${rounded ? 15 : 0}" fill="url(#g)"/>
  <circle cx="${c(37)}" cy="${c(44)}" r="${8 * s}" fill="none" stroke="#fff" stroke-width="${3.2 * s}"/>
  <circle cx="${c(26)}" cy="${c(27)}" r="${5 * s}" fill="none" stroke="#fff" stroke-width="${3 * s}" opacity=".9"/>
  <circle cx="${c(35)}" cy="${c(15)}" r="${2.8 * s}" fill="#fff" opacity=".8"/>
</svg>`;
};

const render = (markup, size, file) =>
  sharp(Buffer.from(markup), { density: 72 * (size / 64) * 1.2 })
    .resize(size, size)
    .png()
    .toFile(new URL(file, OUT).pathname);

writeFileSync(new URL("icon.svg", OUT), svg({ rounded: true }));
await render(svg({ rounded: false }), 192, "icon-192.png");
await render(svg({ rounded: false }), 512, "icon-512.png");
await render(svg({ rounded: false, scale: 0.8 }), 512, "icon-maskable-512.png");
await render(svg({ rounded: false }), 180, "apple-touch-icon.png");
console.log("Icons written to public/icons/");
