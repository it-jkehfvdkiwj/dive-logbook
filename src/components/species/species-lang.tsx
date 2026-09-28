"use client";

import { createContext, useContext } from "react";
import { speciesNames, type SpeciesLang } from "@/lib/species-name";
import { cn } from "@/lib/utils";

const SpeciesLangContext = createContext<SpeciesLang>("en");

export function SpeciesLangProvider({ lang, children }: { lang: SpeciesLang; children: React.ReactNode }) {
  return <SpeciesLangContext.Provider value={lang}>{children}</SpeciesLangContext.Provider>;
}

export function useSpeciesLang(): SpeciesLang {
  return useContext(SpeciesLangContext);
}

interface SpeciesNameProps {
  species: { commonName: string; commonNameDe?: string | null };
  className?: string;
  /** Zweitnamen (andere Sprache) anzeigen */
  secondary?: "inline" | "below" | "none";
  secondaryClassName?: string;
}

/** Tiername in der gewählten Sprache (Deutsch/Englisch), optional mit dem jeweils anderen Namen. */
export function SpeciesName({ species, className, secondary = "none", secondaryClassName }: SpeciesNameProps) {
  const lang = useSpeciesLang();
  const n = speciesNames(species, lang);
  if (secondary === "none" || !n.secondary) return <span className={className}>{n.primary}</span>;
  if (secondary === "inline") {
    return (
      <span className={className}>
        {n.primary} <span className={cn("font-normal text-muted-foreground", secondaryClassName)}>· {n.secondary}</span>
      </span>
    );
  }
  return (
    <>
      <span className={className}>{n.primary}</span>
      <span className={cn("block text-muted-foreground", secondaryClassName)}>{n.secondary}</span>
    </>
  );
}

/** Nur der Text (für title/aria-label etc.) */
export function useSpeciesPrimaryName(species: { commonName: string; commonNameDe?: string | null }): string {
  return speciesNames(species, useSpeciesLang()).primary;
}

/** Untertitel: Name in der anderen Sprache · wissenschaftlicher Name (kursiv). */
export function SpeciesSubtitle({
  species,
  className,
}: {
  species: { commonName: string; commonNameDe?: string | null; scientificName?: string | null };
  className?: string;
}) {
  const n = speciesNames(species, useSpeciesLang());
  if (!n.secondary && !species.scientificName) return null;
  return (
    <div className={cn("text-muted-foreground", className)}>
      {n.secondary}
      {n.secondary && species.scientificName && " · "}
      {species.scientificName && <i>{species.scientificName}</i>}
    </div>
  );
}
