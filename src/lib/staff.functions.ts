import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STUDIO_ID, zonedToUtc } from "./time";

/** Crea profilo + ruolo al primo accesso. Il primo utente in assoluto è il proprietario. */
export const ensureStaffProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName?: string }) =>
    z.object({ fullName: z.string().max(80).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        studio_id: STUDIO_ID,
        full_name: data.fullName?.trim() || "Membro dello staff",
      });
    } else if (data.fullName && !existingProfile.full_name) {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.fullName })
        .eq("id", userId);
    }

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role, user_id");
    const mine = (roles ?? []).filter((r) => r.user_id === userId);
    if (mine.length === 0) {
      const role = (roles ?? []).length === 0 ? "owner" : "artist";
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        studio_id: STUDIO_ID,
        role,
      });
    }

    const { data: finalRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    return { profile, roles: (finalRoles ?? []).map((r) => r.role as string) };
  });

export const getStaffSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: studio }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("studios").select("*").eq("id", STUDIO_ID).maybeSingle(),
    ]);
    return { profile, roles: (roles ?? []).map((r) => r.role as string), studio };
  });

export const listAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const from = zonedToUtc(data.from, "00:00").toISOString();
    const to = zonedToUtc(data.to, "23:59").toISOString();
    const { data: appointments, error } = await context.supabase
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .eq("studio_id", STUDIO_ID)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at");
    if (error) throw new Error(error.message);
    return { appointments: appointments ?? [] };
  });

export const updateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status?: string; day?: string; time?: string; notes?: string }) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["confirmed", "cancelled", "completed", "pending"]).optional(),
          day: z.string().optional(),
          time: z.string().optional(),
          notes: z.string().max(600).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      status?: string;
      notes?: string;
      starts_at?: string;
      ends_at?: string;
    } = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;


    if (data.day && data.time) {
      const { data: appt } = await context.supabase
        .from("appointments")
        .select("starts_at, ends_at")
        .eq("id", data.id)
        .maybeSingle();
      const duration = appt
        ? new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()
        : 3600_000;
      const startsAt = zonedToUtc(data.day, data.time);
      patch["starts_at"] = startsAt.toISOString();
      patch["ends_at"] = new Date(startsAt.getTime() + duration).toISOString();
    }

    const { error } = await context.supabase.from("appointments").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: clients }, { data: appointments }] = await Promise.all([
      context.supabase
        .from("clients")
        .select("*")
        .eq("studio_id", STUDIO_ID)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("appointments")
        .select("client_phone, starts_at, price_cents, status")
        .eq("studio_id", STUDIO_ID),
    ]);
    return { clients: clients ?? [], appointments: appointments ?? [] };
  });

export const getAvailabilitySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rules }, { data: closures }] = await Promise.all([
      context.supabase
        .from("availability_rules")
        .select("*")
        .eq("studio_id", STUDIO_ID)
        .order("weekday"),
      context.supabase.from("closures").select("*").eq("studio_id", STUDIO_ID).order("day"),
    ]);
    return { rules: rules ?? [], closures: closures ?? [] };
  });

export const saveAvailabilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      weekday: number;
      start_time: string;
      end_time: string;
      break_start: string | null;
      break_end: string | null;
      closed: boolean;
    }) =>
      z
        .object({
          weekday: z.number().min(0).max(6),
          start_time: z.string(),
          end_time: z.string(),
          break_start: z.string().nullable(),
          break_end: z.string().nullable(),
          closed: z.boolean(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("availability_rules")
      .upsert({ ...data, studio_id: STUDIO_ID }, { onConflict: "studio_id,weekday" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { day: string; reason?: string }) =>
    z.object({ day: z.string(), reason: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("closures")
      .insert({ studio_id: STUDIO_ID, day: data.day, reason: data.reason ?? "" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("closures").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Gestionale proprietario ---------------- */

export const listServicesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("services")
      .select("*")
      .eq("studio_id", STUDIO_ID)
      .order("sort_order");
    return { services: data ?? [] };
  });

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(400).default(""),
  price_cents: z.number().int().min(0),
  duration_minutes: z.number().int().min(15).max(480),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof serviceSchema>) => serviceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, studio_id: STUDIO_ID };
    const { error } = data.id
      ? await context.supabase.from("services").update(payload).eq("id", data.id)
      : await context.supabase.from("services").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("services")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateStudioSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      phone: string;
      address: string;
      instagram: string;
      about: string;
      slot_interval_minutes: number;
    }) =>
      z
        .object({
          name: z.string().min(2).max(80),
          phone: z.string().max(40),
          address: z.string().max(160),
          instagram: z.string().max(60),
          about: z.string().max(800),
          slot_interval_minutes: z.number().int().min(10).max(120),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("studios").update(data).eq("id", STUDIO_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("studio_id", STUDIO_ID),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    return { profiles: profiles ?? [], roles: roles ?? [] };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "owner" | "artist" }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["owner", "artist"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Solo il proprietario può gestire i ruoli");

    await context.supabase.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, studio_id: STUDIO_ID, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
