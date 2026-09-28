"use client";

import { useState } from "react";

/** Großes Artfoto mit Bildnachweis – blendet sich aus, wenn das Bild nicht lädt. */
export function SpeciesPhoto({ url, alt, attribution }: { url: string; alt: string; attribution: string | null }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="mb-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- externe Bild-URL */}
      <img
        src={url}
        alt={alt}
        className="max-h-80 w-full rounded-3xl bg-muted object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {attribution && (
        <figcaption className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Photo: {attribution} · via iNaturalist
        </figcaption>
      )}
    </figure>
  );
}
