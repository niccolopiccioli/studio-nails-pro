import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function readEnv(name: string): string | undefined {
  // Vite inietta le VITE_* nel client; process.env copre la SSR.
  if (typeof import.meta !== "undefined" && import.meta.env?.[name]) {
    return import.meta.env[name] as string;
  }
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

function supabaseUrl(): string {
  return readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL") ?? "";
}

function supabaseAnonKey(): string {
  return readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? readEnv("SUPABASE_PUBLISHABLE_KEY") ?? "";
}

/** Client pubblico: usa SEMPRE la chiave anonima, mai la service_role. */
function createPublicClient() {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Manca la configurazione Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). " +
        "Copia .env.example in .env e compila i valori.",
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let cached: ReturnType<typeof createPublicClient> | undefined;

export const supabase: ReturnType<typeof createPublicClient> = new Proxy(
  {} as ReturnType<typeof createPublicClient>,
  {
    get(_, prop, receiver) {
      if (!cached) cached = createPublicClient();
      return Reflect.get(cached, prop, receiver);
    },
  },
);
