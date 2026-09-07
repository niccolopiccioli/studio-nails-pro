import { STUDIO_ID as LEGACY_STUDIO_ID } from "./time";

export type Tenant = { id: string; slug: string };

let cached: Tenant | null = null;

function configuredSlug(): string | null {
  if (typeof process !== "undefined" && typeof process.env?.["STUDIO_SLUG"] === "string") {
    const slug = (process.env["STUDIO_SLUG"] as string).trim();
    return slug ? slug : null;
  }
  return null;
}

/**
 * Risolve lo studio di questo deploy (multisito, stesso backend).
 * - Con `STUDIO_SLUG` impostato: lookup in `studios` (con cache in memoria).
 * - Senza: fallback allo studio storico (compatibilità deploy esistente).
 *
 * SOLO server: chiamare dentro gli handler delle server function.
 * Lo slug NON arriva mai dal client (sarebbe falsificabile tra studi).
 */
export async function getTenant(): Promise<Tenant> {
  if (cached) return cached;
  const slug = configuredSlug();
  if (!slug) {
    cached = { id: LEGACY_STUDIO_ID, slug: "studio-nails" };
    return cached;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("studios")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`Studio non configurato: nessuno studio con slug "${slug}".`);
  }
  cached = { id: data.id as string, slug: data.slug as string };
  return cached;
}

export async function getTenantId(): Promise<string> {
  return (await getTenant()).id;
}
