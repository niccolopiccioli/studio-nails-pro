import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function serverEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function resolveUrl(): string {
  return serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL") ?? "";
}

function resolveAnonKey(): string {
  return serverEnv("SUPABASE_PUBLISHABLE_KEY") ?? serverEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";
}

/**
 * Protegge una server function: richiede un JWT Supabase valido
 * nell'header Authorization (inviato in automatico da attachSupabaseAuth).
 * Mette a disposizione nel context: supabase (autenticato come utente),
 * userId e claims.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const url = resolveUrl();
    const anonKey = resolveAnonKey();
    if (!url || !anonKey) {
      throw new Error(
        "Manca la configurazione server Supabase (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY). Vedi .env.example.",
      );
    }

    const request = getRequest();
    const authHeader = request?.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token || token.split(".").length !== 3) {
      throw new Error("Non autorizzato: effettua di nuovo l'accesso.");
    }

    const supabase = createClient<Database>(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Non autorizzato: sessione non valida o scaduta.");
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub as string,
        claims: data.claims,
      },
    });
  },
);
