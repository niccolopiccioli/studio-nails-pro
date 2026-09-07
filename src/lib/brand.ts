import { createContext, useContext, useEffect } from "react";

/**
 * Brand runtime del sito corrente (multisito, stesso backend).
 * Valori dal DB (studios.brand) con fallback ai default nails.
 * Niente più VITE_BRAND_*: nuovo sito = riga DB, zero env per-sito.
 */
export type Brand = {
  theme: string;
  name: string;
  tagline: string;
  desc: string;
  eyebrow: string;
  hero1: string;
  hero2: string;
  hero3: string;
  cta1: string;
  cta2: string;
  rating: string;
  badgeK: string;
  badgeV: string;
  workLabels: string[];
  address: string;
  phone: string;
};

export const DEFAULT_BRAND: Brand = {
  theme: "nails",
  name: "Studio Nails",
  tagline: "Nail art su misura",
  desc: "Atelier di nail art a Milano: manicure, gel e nail art su misura.",
  eyebrow: "Milano · Atelier su appuntamento",
  hero1: "La cura",
  hero2: "delle mani,",
  hero3: "come un rituale.",
  cta1: "Le tue mani",
  cta2: "se lo meritano.",
  rating: "4.9 · 300+ recensioni",
  badgeK: "Da oltre 8 anni",
  badgeV: "+1.200 clienti",
  workLabels: ["Nude couture", "Rosé minimal", "Dettagli oro", "French moderno"],
  address: "Via della Bellezza 12, Milano",
  phone: "+39 333 1234567",
};

type StudioRow = {
  name?: unknown;
  theme?: unknown;
  brand?: unknown;
  address?: unknown;
  phone?: unknown;
} | null;

function str(v: unknown, fb: string): string {
  return typeof v === "string" && v.trim() ? v : fb;
}

function strArray(v: unknown, fb: string[]): string[] {
  if (!Array.isArray(v)) return fb;
  const parts = v.filter((x): x is string => typeof x === "string" && !!x.trim());
  return parts.length > 0 ? parts : fb;
}

export function brandFromStudio(studio: StudioRow): Brand {
  const b = (studio?.brand ?? {}) as Record<string, unknown>;
  return {
    theme: str(studio?.theme, DEFAULT_BRAND.theme),
    name: str(studio?.name, DEFAULT_BRAND.name),
    tagline: str(b["tagline"], DEFAULT_BRAND.tagline),
    desc: str(b["desc"], DEFAULT_BRAND.desc),
    eyebrow: str(b["eyebrow"], DEFAULT_BRAND.eyebrow),
    hero1: str(b["hero"] && (b["hero"] as unknown[])[0], DEFAULT_BRAND.hero1),
    hero2: str(b["hero"] && (b["hero"] as unknown[])[1], DEFAULT_BRAND.hero2),
    hero3: str(b["hero"] && (b["hero"] as unknown[])[2], DEFAULT_BRAND.hero3),
    cta1: str(b["cta"] && (b["cta"] as unknown[])[0], DEFAULT_BRAND.cta1),
    cta2: str(b["cta"] && (b["cta"] as unknown[])[1], DEFAULT_BRAND.cta2),
    rating: str(b["rating"], DEFAULT_BRAND.rating),
    badgeK: str(b["badgeK"], DEFAULT_BRAND.badgeK),
    badgeV: str(b["badgeV"], DEFAULT_BRAND.badgeV),
    workLabels: strArray(b["workLabels"], DEFAULT_BRAND.workLabels).slice(0, 4),
    address: str(studio?.address, DEFAULT_BRAND.address),
    phone: str(studio?.phone, DEFAULT_BRAND.phone),
  };
}

/** "Estetica Pura" → { first: "ESTETICA", rest: "Pura", initial: "E" } */
export function splitName(name: string): { first: string; rest: string; initial: string } {
  const [first, ...rest] = name.split(/\s+/);
  const head = first ?? name;
  return { first: head.toUpperCase(), rest: rest.join(" "), initial: head.charAt(0).toUpperCase() };
}

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export const BrandProvider = BrandContext.Provider;

export function useBrand(): Brand {
  return useContext(BrandContext);
}

/** Titolo scheda dinamico per-sito (il meta statico resta come fallback). */
export function useDocTitle(title: string): void {
  const { name } = useBrand();
  useEffect(() => {
    document.title = `${title} — ${name}`;
  }, [title, name]);
}
