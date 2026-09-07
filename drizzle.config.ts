import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    // Connection string Postgres (Supabase Dashboard → Project Settings → Database).
    // Mantiene il fallback alla vecchia variabile Lovable se presente.
    url: process.env.DATABASE_URL ?? process.env.LOVABLE_DB_MIGRATION_URL ?? "",
  },
});
