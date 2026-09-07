/**
 * Configurazione brand/tema del deploy (multisito, stesso backend).
 * Ogni sito è un deploy con le sue VITE_* : nome, testi, immagini, tema.
 * Default = Studio Nails (deploy esistente invariato).
 */
function vite(key: string): string | undefined {
  try {
    const v: unknown = import.meta.env[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

export const THEME = vite("VITE_THEME") ?? "nails";

export const BRAND_NAME = vite("VITE_BRAND_NAME") ?? "Studio Nails";
export const BRAND_TAGLINE = vite("VITE_BRAND_TAGLINE") ?? "Nail art su misura";
export const BRAND_DESC =
  vite("VITE_BRAND_DESC") ?? "Atelier di nail art a Milano: manicure, gel e nail art su misura.";
export const BRAND_EYEBROW = vite("VITE_BRAND_EYEBROW") ?? "Milano · Atelier su appuntamento";

const [first, ...rest] = BRAND_NAME.split(/\s+/);
export const BRAND_FIRST = (first ?? BRAND_NAME).toUpperCase();
export const BRAND_REST = rest.join(" ");
export const BRAND_INITIAL = (first ?? "S").charAt(0).toUpperCase();

/** Hero: tre righe (titolo, seconda riga, accento corsivo). */
export const BRAND_HERO_1 = vite("VITE_BRAND_HERO_1") ?? "La cura";
export const BRAND_HERO_2 = vite("VITE_BRAND_HERO_2") ?? "delle mani,";
export const BRAND_HERO_3 = vite("VITE_BRAND_HERO_3") ?? "come un rituale.";

/** CTA finale: due righe. */
export const BRAND_CTA_1 = vite("VITE_BRAND_CTA_1") ?? "Le tue mani";
export const BRAND_CTA_2 = vite("VITE_BRAND_CTA_2") ?? "se lo meritano.";

export const BRAND_RATING = vite("VITE_BRAND_RATING") ?? "4.9 · 300+ recensioni";
export const BRAND_BADGE_K = vite("VITE_BRAND_BADGE_K") ?? "Da oltre 8 anni";
export const BRAND_BADGE_V = vite("VITE_BRAND_BADGE_V") ?? "+1.200 clienti";

const DEFAULT_WORK_LABELS = ["Nude couture", "Rosé minimal", "Dettagli oro", "French moderno"];
export const BRAND_WORK_LABELS: string[] = (() => {
  const raw = vite("VITE_BRAND_WORK_LABELS");
  if (!raw) return DEFAULT_WORK_LABELS;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...parts, ...DEFAULT_WORK_LABELS].slice(0, 4);
})();
