import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getTenantId } from "./tenant";
import { zonedToUtc } from "./time";

const uuid = z.string().uuid();
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Orario non valido");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Crea profilo + ruolo al primo accesso. Il primo utente DELLO STUDIO è il proprietario.
 * Piano free: 1 solo operatore. Non esiste UI di gestione utenti: eventuali
 * account aggiuntivi restano senza permessi operativi (ruolo artist di default).
 */
export const ensureStaffProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName?: string }) =>
    z.object({ fullName: z.string().trim().max(80).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await admin();
    const userId = context.userId;
    const studioId = await getTenantId();

    const { data: existingProfile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error } = await sb.from("profiles").insert({
        id: userId,
        studio_id: studioId,
        full_name: data.fullName || "Membro dello staff",
      });
      if (error) throw new Error("Creazione del profilo non riuscita.");
    } else if (data.fullName && !existingProfile.full_name) {
      await sb.from("profiles").update({ full_name: data.fullName }).eq("id", userId);
    }

    const { data: roles } = await sb
      .from("user_roles")
      .select("role, user_id")
      .eq("studio_id", studioId);
    const mine = (roles ?? []).filter((r) => r.user_id === userId);
    if (mine.length === 0) {
      const role = (roles ?? []).length === 0 ? "owner" : "artist";
      const { error } = await sb
        .from("user_roles")
        .insert({ user_id: userId, studio_id: studioId, role });
      if (error) throw new Error("Assegnazione del ruolo non riuscita.");
    }

    const [{ data: finalRoles }, { data: profile }] = await Promise.all([
      sb.from("user_roles").select("role").eq("user_id", userId),
      sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    return { profile, roles: (finalRoles ?? []).map((r) => r.role as string) };
  });

export const getStaffSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const studioId = await getTenantId();
    const [{ data: profile }, { data: roles }, { data: studio }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("studios").select("*").eq("id", studioId).maybeSingle(),
    ]);
    return { profile, roles: (roles ?? []).map((r) => r.role as string), studio };
  });

export const listAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) =>
    z.object({ from: dayString, to: dayString }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const from = zonedToUtc(data.from, "00:00").toISOString();
    const to = zonedToUtc(data.to, "23:59").toISOString();
    const { data: appointments, error } = await context.supabase
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .eq("studio_id", studioId)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at");
    if (error) throw new Error("Lettura dell'agenda non riuscita.");
    return { appointments: appointments ?? [] };
  });

const APPOINTMENT_STATUSES = ["confirmed", "cancelled", "completed", "pending"] as const;

export const updateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status?: string; day?: string; time?: string; notes?: string }) =>
      z
        .object({
          id: uuid,
          status: z.enum(APPOINTMENT_STATUSES).optional(),
          day: dayString.optional(),
          time: timeString.optional(),
          notes: z.string().trim().max(600).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { status?: string; notes?: string; starts_at?: string; ends_at?: string } = {};
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
      patch.starts_at = startsAt.toISOString();
      patch.ends_at = new Date(startsAt.getTime() + duration).toISOString();
    }

    const { error } = await context.supabase.from("appointments").update(patch).eq("id", data.id);
    if (error) throw new Error("Aggiornamento non riuscito.");
    return { ok: true };
  });

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const studioId = await getTenantId();
    const [{ data: clients }, { data: appointments }] = await Promise.all([
      context.supabase
        .from("clients")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("appointments")
        .select("client_phone, starts_at, status")
        .eq("studio_id", studioId),
    ]);
    return { clients: clients ?? [], appointments: appointments ?? [] };
  });

export const getAvailabilitySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const studioId = await getTenantId();
    const [{ data: rules }, { data: closures }] = await Promise.all([
      context.supabase
        .from("availability_rules")
        .select("*")
        .eq("studio_id", studioId)
        .order("weekday"),
      context.supabase.from("closures").select("*").eq("studio_id", studioId).order("day"),
    ]);
    return { rules: rules ?? [], closures: closures ?? [] };
  });

const availabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: timeString,
  end_time: timeString,
  break_start: timeString.nullable(),
  break_end: timeString.nullable(),
  closed: z.boolean(),
});

export const saveAvailabilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof availabilityRuleSchema>) =>
    availabilityRuleSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { error } = await context.supabase
      .from("availability_rules")
      .upsert({ ...data, studio_id: studioId }, { onConflict: "studio_id,weekday" });
    if (error) throw new Error("Salvataggio dell'orario non riuscito.");
    return { ok: true };
  });

export const addClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { day: string; reason?: string }) =>
    z
      .object({ day: dayString, reason: z.string().trim().max(120).optional().default("") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { error } = await context.supabase
      .from("closures")
      .insert({ studio_id: studioId, day: data.day, reason: data.reason ?? "" });
    if (error) throw new Error("Aggiunta della chiusura non riuscita.");
    return { ok: true };
  });

export const removeClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("closures").delete().eq("id", data.id);
    if (error) throw new Error("Rimozione della chiusura non riuscita.");
    return { ok: true };
  });

const manualAppointmentSchema = z.object({
  serviceId: uuid,
  day: dayString,
  time: timeString,
  name: z.string().trim().min(2, "Inserisci il nome del cliente").max(80),
  phone: z.string().trim().min(6, "Inserisci un telefono valido").max(30),
  email: z
    .string()
    .trim()
    .max(120)
    .default("")
    .refine((v) => v === "" || /.+@.+\..+/.test(v), "Email non valida"),
  notes: z.string().trim().max(600).optional().default(""),
});

/** Crea un appuntamento dallo studio (telefono, walk-in). Stesse regole anti-overlap del booking pubblico. */
export const createAppointmentManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof manualAppointmentSchema>) =>
    manualAppointmentSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { data: service } = await context.supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("id", data.serviceId)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!service) throw new Error("Servizio non disponibile");

    const startsAt = zonedToUtc(data.day, data.time);
    if (startsAt.getTime() < Date.now() - 60_000) throw new Error("Orario nel passato");
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

    const { data: overlap } = await context.supabase
      .from("appointments")
      .select("id")
      .eq("studio_id", studioId)
      .neq("status", "cancelled")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (overlap && overlap.length > 0) throw new Error("Orario già occupato");

    const { data: client } = await context.supabase
      .from("clients")
      .upsert(
        { studio_id: studioId, full_name: data.name, phone: data.phone, email: data.email },
        { onConflict: "studio_id,phone" },
      )
      .select("id")
      .maybeSingle();

    const { data: appointment, error } = await context.supabase
      .from("appointments")
      .insert({
        studio_id: studioId,
        client_id: client?.id ?? null,
        service_id: service.id,
        client_name: data.name,
        client_phone: data.phone,
        client_email: data.email,
        notes: data.notes ?? "",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        price_cents: service.price_cents,
        status: "confirmed",
      })
      .select("manage_token")
      .single();
    if (error || !appointment) throw new Error("Creazione non riuscita, riprova.");

    // SOLA notifica del piano free: email di conferma se il cliente ha un'email.
    if (data.email) {
      const { sendBookingConfirmationEmail } = await import("@/lib/email.server");
      await sendBookingConfirmationEmail({
        to: data.email,
        clientName: data.name,
        serviceName: service.name as string,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        manageToken: appointment.manage_token as string,
      });
    }

    return { ok: true };
  });

/* Eliminazione definitiva di un appuntamento (GDPR, su richiesta del cliente). */
export const deleteAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { error } = await context.supabase
      .from("appointments")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error("Eliminazione non riuscita.");
    return { ok: true };
  });

/* Eliminazione definitiva di un cliente + suoi appuntamenti (diritto all'oblio). */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { data: client } = await context.supabase
      .from("clients")
      .select("id, phone")
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!client) throw new Error("Cliente non trovato.");
    await context.supabase
      .from("appointments")
      .delete()
      .eq("client_id", client.id)
      .eq("studio_id", studioId);
    await context.supabase
      .from("appointments")
      .delete()
      .eq("client_phone", client.phone)
      .eq("studio_id", studioId);
    const { error } = await context.supabase
      .from("clients")
      .delete()
      .eq("id", client.id)
      .eq("studio_id", studioId);
    if (error) throw new Error("Eliminazione non riuscita.");
    return { ok: true };
  });

/* ---------------- Gestione base (piano free: niente analytics, 1 operatore) ---------------- */

export const listServicesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const studioId = await getTenantId();
    const { data } = await context.supabase
      .from("services")
      .select("*")
      .eq("studio_id", studioId)
      .order("sort_order");
    return { services: data ?? [] };
  });

const serviceSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Nome troppo corto").max(80),
  description: z.string().trim().max(400).default(""),
  price_cents: z.number().int().min(0),
  duration_minutes: z.number().int().min(15).max(480),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof serviceSchema>) => serviceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { id, ...fields } = data;
    const payload = { ...fields, studio_id: studioId };
    const { error } = id
      ? await context.supabase.from("services").update(payload).eq("id", id)
      : await context.supabase.from("services").insert(payload);
    if (error) throw new Error("Salvataggio del servizio non riuscito.");
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("services")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error("Disattivazione del servizio non riuscita.");
    return { ok: true };
  });

const studioSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).default(""),
  address: z.string().trim().max(160).default(""),
  instagram: z.string().trim().max(60).default(""),
  about: z.string().trim().max(800).default(""),
  slot_interval_minutes: z.number().int().min(10).max(120),
});

export const updateStudioSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof studioSettingsSchema>) =>
    studioSettingsSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const studioId = await getTenantId();
    const { error } = await context.supabase.from("studios").update(data).eq("id", studioId);
    if (error) throw new Error("Salvataggio delle impostazioni non riuscito.");
    return { ok: true };
  });

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const studioId = await getTenantId();
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("studio_id", studioId),
      context.supabase.from("user_roles").select("user_id, role").eq("studio_id", studioId),
    ]);
    return { profiles: profiles ?? [], roles: roles ?? [] };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "owner" | "artist" }) =>
    z.object({ userId: uuid, role: z.enum(["owner", "artist"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Solo il proprietario può gestire i ruoli");

    await context.supabase.from("user_roles").delete().eq("user_id", data.userId);
    const studioId = await getTenantId();
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, studio_id: studioId, role: data.role });
    if (error) throw new Error("Cambio ruolo non riuscito.");
    return { ok: true };
  });
