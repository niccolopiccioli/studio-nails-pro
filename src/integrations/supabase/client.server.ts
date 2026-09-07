// Client Supabase con service_role: bypassa la RLS.
// SOLO server: importarlo in file .server.ts o con import dinamico dentro
// gli handler delle server function. Mai nel bundle client.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function readServerEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

/** URL Supabase: SUPABASE_URL, con fallback alle VITE_* per il dev locale. */
function serverUrl(): string {
  return readServerEnv("SUPABASE_URL") ?? readServerEnv("VITE_SUPABASE_URL") ?? "";
}

/**
 * Chiave service_role. Per il dev locale aggiungi in .env:
 *   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
 * La trovi in Supabase Dashboard → Project Settings → API → Secret API key.
 * Senza questa chiave le server function pubbliche (prenotazioni) non funzionano.
 */
function serviceRoleKey(): string {
  return readServerEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function createAdminClient() {
  const url = serverUrl();
  const serviceKey = serviceRoleKey();
  const missing = [
    ...(!url ? ["SUPABASE_URL"] : []),
    ...(!serviceKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ];
  if (missing.length > 0) {
    throw new Error(
      `Manca la configurazione server Supabase: ${missing.join(", ")}. ` +
        "Vedi .env.example. Le prenotazioni pubbliche e il bootstrap staff richiedono la service_role key.",
    );
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: ReturnType<typeof createAdminClient> | undefined;

// Vedi nota in testa: importare solo lato server.
export const supabaseAdmin: ReturnType<typeof createAdminClient> = new Proxy(
  {} as ReturnType<typeof createAdminClient>,
  {
    get(_, prop, receiver) {
      if (!cached) cached = createAdminClient();
      return Reflect.get(cached, prop, receiver);
    },
  },
);
