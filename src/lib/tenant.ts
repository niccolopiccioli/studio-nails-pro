import { STUDIO_ID as LEGACY_STUDIO_ID } from "./time";

export type Tenant = { id: string; slug: string; name: string };

const cache = new Map<string, Tenant>();

function envSlug(): string | null {
  if (typeof process !== "undefined" && typeof process.env?.["STUDIO_SLUG"] === "string") {
    const slug = (process.env["STUDIO_SLUG"] as string).trim();
    return slug ? slug : null;
  }
  return null;
}

async function requestHost(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const raw = req?.headers.get("x-forwarded-host") ?? req?.headers.get("host") ?? null;
    if (!raw) return null;
    return raw.split(",")[0]!.trim().toLowerCase().split(":")[0]!;
  } catch {
    return null;
  }
}

/**
 * Risolve lo studio di questa request (multisito, stesso backend).
 * Ordine: env STUDIO_SLUG (override, utile in locale) → hostname
 * (dominio esatto in studios.domains, altrimenti slug contenuto nell'host)
 * → fallback studio storico.
 *
 * Lo slug NON arriva mai dal client come parametro (sarebbe falsificabile).
 * SOLO server: chiamare dentro handler/loader.
 */
export async function getTenant(): Promise<Tenant> {
  const override = envSlug();
  const host = override ? null : await requestHost();
  const key = override ? `slug:${override}` : `host:${host ?? "default"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (override) {
    const { data, error } = await supabaseAdmin
      .from("studios")
      .select("id, slug, name")
      .eq("slug", override)
      .maybeSingle();
    if (error || !data) {
      throw new Error(`Studio non configurato: nessuno studio con slug "${override}".`);
    }
    const tenant = {
      id: data.id as string,
      slug: data.slug as string,
      name: data.name as string,
    };
    cache.set(key, tenant);
    return tenant;
  }

  if (host) {
    const { data: studios } = await supabaseAdmin.from("studios").select("id, slug, name, domains");
    const rows = (studios ?? []) as {
      id: string;
      slug: string;
      name: string;
      domains: string[];
    }[];
    const exact = rows.find((s) => (s.domains ?? []).includes(host));
    const bySlug = exact ?? rows.find((s) => s.slug && host.includes(s.slug));
    if (bySlug) {
      const tenant = { id: bySlug.id, slug: bySlug.slug, name: bySlug.name };
      cache.set(key, tenant);
      return tenant;
    }
  }

  const fallback = { id: LEGACY_STUDIO_ID, slug: "studio-nails", name: "Studio Nails" };
  cache.set(key, fallback);
  return fallback;
}

export async function getTenantId(): Promise<string> {
  return (await getTenant()).id;
}

/**
 * Base URL pubblica del sito corrente (per link email): da request host,
 * con fallback a env APP_URL (utile in locale) e stringa vuota.
 */
export async function requestBaseUrl(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const host = req?.headers.get("x-forwarded-host") ?? req?.headers.get("host") ?? null;
    if (host) {
      const clean = host.split(",")[0]!.trim();
      const proto =
        req?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        (clean.startsWith("localhost") ? "http" : "https");
      return `${proto}://${clean}`;
    }
  } catch {
    /* fallback sotto */
  }
  if (typeof process !== "undefined" && typeof process.env?.["APP_URL"] === "string") {
    return (process.env["APP_URL"] as string).replace(/\/$/, "");
  }
  return "";
}
