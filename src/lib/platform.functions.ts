import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { zonedToUtc } from "./time";

/**
 * Console Veluna: opera su QUALSIASI studio dove l'utente ha un ruolo,
 * non solo sul tenant dell'hostname. Ogni chiamata verifica il ruolo
 * con la service_role e poi opera con la service_role (RLS bypassata
 * solo dopo il controllo, perché il profilo ha un solo studio_id).
 */
async function studioAdmin(userId: string, studioId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("studio_id", studioId)
    .limit(1);
  if (!data || data.length === 0) throw new Error("Non hai accesso a questo studio.");
  return supabaseAdmin;
}

const uuid = z.string().uuid();
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Orario non valido");
const studioInput = { studioId: uuid };

/** Studi gestiti dall'utente (ha almeno un ruolo). */
export const listManagedStudios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("studio_id, role")
      .eq("user_id", context.userId);
    const ids = [...new Set((roles ?? []).map((r) => r.studio_id as string))].filter(
      (id) => id !== "33333333-3333-3333-3333-333333333333",
    );
    if (ids.length === 0) return { studios: [] as { id: string; slug: string; name: string }[] };
    const { data: studios } = await supabaseAdmin
      .from("studios")
      .select("id, slug, name")
      .in("id", ids)
      .order("name");
    return { studios: studios ?? [] };
  });

export const platformListAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; from: string; to: string }) =>
    z.object({ ...studioInput, from: dayString, to: dayString }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const from = zonedToUtc(data.from, "00:00").toISOString();
    const to = zonedToUtc(data.to, "23:59").toISOString();
    const { data: appointments, error } = await sb
      .from("appointments")
      .select("*, services(name, duration_minutes)")
      .eq("studio_id", data.studioId)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at");
    if (error) throw new Error("Lettura dell'agenda non riuscita.");
    return { appointments: appointments ?? [] };
  });

const APPOINTMENT_STATUSES = ["confirmed", "cancelled", "completed", "pending"] as const;

export const platformUpdateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { studioId: string; id: string; status?: string; day?: string; time?: string }) =>
      z
        .object({
          ...studioInput,
          id: uuid,
          status: z.enum(APPOINTMENT_STATUSES).optional(),
          day: dayString.optional(),
          time: timeString.optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const patch: { status?: string; starts_at?: string; ends_at?: string } = {};
    if (data.status) patch.status = data.status;
    if (data.day && data.time) {
      const { data: appt } = await sb
        .from("appointments")
        .select("starts_at, ends_at")
        .eq("id", data.id)
        .eq("studio_id", data.studioId)
        .maybeSingle();
      const duration = appt
        ? new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()
        : 3600_000;
      const startsAt = zonedToUtc(data.day, data.time);
      patch.starts_at = startsAt.toISOString();
      patch.ends_at = new Date(startsAt.getTime() + duration).toISOString();
    }
    const { error } = await sb
      .from("appointments")
      .update(patch)
      .eq("id", data.id)
      .eq("studio_id", data.studioId);
    if (error) throw new Error("Aggiornamento non riuscito.");
    return { ok: true };
  });

const manualSchema = z.object({
  ...studioInput,
  serviceId: uuid,
  day: dayString,
  time: timeString,
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z
    .string()
    .trim()
    .max(120)
    .default("")
    .refine((v) => v === "" || /.+@.+\..+/.test(v), "Email non valida"),
  notes: z.string().trim().max(600).optional().default(""),
});

export const platformCreateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof manualSchema>) => manualSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const [{ data: service }, { data: studio }] = await Promise.all([
      sb
        .from("services")
        .select("id, name, duration_minutes, price_cents")
        .eq("id", data.serviceId)
        .eq("studio_id", data.studioId)
        .maybeSingle(),
      sb.from("studios").select("name").eq("id", data.studioId).maybeSingle(),
    ]);
    if (!service) throw new Error("Servizio non disponibile");

    const startsAt = zonedToUtc(data.day, data.time);
    if (startsAt.getTime() < Date.now() - 60_000) throw new Error("Orario nel passato");
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

    const { data: overlap } = await sb
      .from("appointments")
      .select("id")
      .eq("studio_id", data.studioId)
      .neq("status", "cancelled")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (overlap && overlap.length > 0) throw new Error("Orario già occupato");

    const { data: client } = await sb
      .from("clients")
      .upsert(
        { studio_id: data.studioId, full_name: data.name, phone: data.phone, email: data.email },
        { onConflict: "studio_id,phone" },
      )
      .select("id")
      .maybeSingle();

    const { data: appointment, error } = await sb
      .from("appointments")
      .insert({
        studio_id: data.studioId,
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

    if (data.email) {
      const { sendBookingConfirmationEmail } = await import("@/lib/email.server");
      const { requestBaseUrl } = await import("@/lib/tenant");
      await sendBookingConfirmationEmail({
        to: data.email,
        clientName: data.name,
        serviceName: service.name as string,
        studioName: (studio?.name as string) ?? "lo studio",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        manageToken: appointment.manage_token as string,
        appUrl: await requestBaseUrl(),
      });
    }
    return { ok: true };
  });

export const platformDeleteAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; id: string }) =>
    z.object({ ...studioInput, id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const { error } = await sb
      .from("appointments")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", data.studioId);
    if (error) throw new Error("Eliminazione non riuscita.");
    return { ok: true };
  });

export const platformListClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string }) => z.object({ ...studioInput }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, (data as { studioId: string }).studioId);
    const studioId = (data as { studioId: string }).studioId;
    const [{ data: clients }, { data: appointments }] = await Promise.all([
      sb.from("clients").select("*").eq("studio_id", studioId).order("created_at", {
        ascending: false,
      }),
      sb.from("appointments").select("client_phone, starts_at, status").eq("studio_id", studioId),
    ]);
    return { clients: clients ?? [], appointments: appointments ?? [] };
  });

export const platformDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; id: string }) =>
    z.object({ ...studioInput, id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const { data: client } = await sb
      .from("clients")
      .select("id, phone")
      .eq("id", data.id)
      .eq("studio_id", data.studioId)
      .maybeSingle();
    if (!client) throw new Error("Cliente non trovato.");
    await sb
      .from("appointments")
      .delete()
      .eq("client_id", client.id)
      .eq("studio_id", data.studioId);
    await sb
      .from("appointments")
      .delete()
      .eq("client_phone", client.phone)
      .eq("studio_id", data.studioId);
    const { error } = await sb
      .from("clients")
      .delete()
      .eq("id", client.id)
      .eq("studio_id", data.studioId);
    if (error) throw new Error("Eliminazione non riuscita.");
    return { ok: true };
  });

export const platformGetAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string }) => z.object({ ...studioInput }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const studioId = (data as { studioId: string }).studioId;
    const sb = await studioAdmin(context.userId, studioId);
    const [{ data: rules }, { data: closures }] = await Promise.all([
      sb.from("availability_rules").select("*").eq("studio_id", studioId).order("weekday"),
      sb.from("closures").select("*").eq("studio_id", studioId).order("day"),
    ]);
    return { rules: rules ?? [], closures: closures ?? [] };
  });

const availabilityRuleSchema = z.object({
  ...studioInput,
  weekday: z.number().int().min(0).max(6),
  start_time: timeString,
  end_time: timeString,
  break_start: timeString.nullable(),
  break_end: timeString.nullable(),
  closed: z.boolean(),
});

export const platformSaveAvailabilityRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof availabilityRuleSchema>) =>
    availabilityRuleSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    const { studioId, ...rule } = data;
    const sb = await studioAdmin(context.userId, studioId);
    const { error } = await sb
      .from("availability_rules")
      .upsert({ ...rule, studio_id: studioId }, { onConflict: "studio_id,weekday" });
    if (error) throw new Error("Salvataggio dell'orario non riuscito.");
    return { ok: true };
  });

export const platformAddClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; day: string; reason?: string }) =>
    z
      .object({
        ...studioInput,
        day: dayString,
        reason: z.string().trim().max(120).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const { error } = await sb
      .from("closures")
      .insert({ studio_id: data.studioId, day: data.day, reason: data.reason ?? "" });
    if (error) throw new Error("Aggiunta della chiusura non riuscita.");
    return { ok: true };
  });

export const platformRemoveClosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; id: string }) =>
    z.object({ ...studioInput, id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const { error } = await sb
      .from("closures")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", data.studioId);
    if (error) throw new Error("Rimozione della chiusura non riuscita.");
    return { ok: true };
  });

export const platformListServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string }) => z.object({ ...studioInput }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const studioId = (data as { studioId: string }).studioId;
    const sb = await studioAdmin(context.userId, studioId);
    const { data: services } = await sb
      .from("services")
      .select("*")
      .eq("studio_id", studioId)
      .order("sort_order");
    return { services: services ?? [] };
  });

const serviceSchema = z.object({
  ...studioInput,
  id: uuid.optional(),
  name: z.string().trim().min(2, "Nome troppo corto").max(80),
  description: z.string().trim().max(400).default(""),
  price_cents: z.number().int().min(0),
  duration_minutes: z.number().int().min(15).max(480),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const platformSaveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof serviceSchema>) => serviceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { studioId, id, ...fields } = data;
    const sb = await studioAdmin(context.userId, studioId);
    const payload = { ...fields, studio_id: studioId };
    const { error } = id
      ? await sb.from("services").update(payload).eq("id", id).eq("studio_id", studioId)
      : await sb.from("services").insert(payload);
    if (error) throw new Error("Salvataggio del servizio non riuscito.");
    return { ok: true };
  });

export const platformDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studioId: string; id: string }) =>
    z.object({ ...studioInput, id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await studioAdmin(context.userId, data.studioId);
    const { error } = await sb
      .from("services")
      .update({ active: false })
      .eq("id", data.id)
      .eq("studio_id", data.studioId);
    if (error) throw new Error("Disattivazione del servizio non riuscita.");
    return { ok: true };
  });
