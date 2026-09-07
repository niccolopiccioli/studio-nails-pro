import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getTenant, getTenantId, requestBaseUrl } from "./tenant";
import { dayKey, weekdayOf, zonedToUtc } from "./time";

/**
 * Area pubblica: prenotazione senza account.
 * Tutte le letture/scritture passano da qui con la service_role,
 * così i dati personali non sono mai esposti al ruolo anonimo del database.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Slot = { time: string; available: boolean };

const uuid = z.string().uuid();
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

export const getStudioAndServices = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const studioId = await getTenantId();
  const [{ data: studio }, { data: services }] = await Promise.all([
    sb.from("studios").select("*").eq("id", studioId).maybeSingle(),
    sb
      .from("services")
      .select("*")
      .eq("studio_id", studioId)
      .eq("active", true)
      .order("sort_order"),
  ]);
  return { studio, services: services ?? [] };
});

/** Elenco pubblico degli studi (landing piattaforma). Solo slug, nome, about, tema. */
export const getPublicStudios = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data: studios } = await sb
    .from("studios")
    .select("slug, name, about, theme")
    .order("name");
  return { studios: studios ?? [] };
});

/** Dati pubblici dello studio corrente (tenant by hostname). Per loader root: tema + brand. */
export const getPublicStudio = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const studioId = await getTenantId();
  const { data: studio } = await sb
    .from("studios")
    .select("id, slug, name, about, address, phone, instagram, theme, brand")
    .eq("id", studioId)
    .maybeSingle();
  if (!studio) throw new Error("Studio non configurato.");
  return { studio };
});

export const getMonthAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: { month: string }) =>
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, "Mese non valido") }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const studioId = await getTenantId();
    const start = `${data.month}-01`;
    const endDate = new Date(`${start}T12:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const [{ data: rules }, { data: closures }] = await Promise.all([
      sb.from("availability_rules").select("weekday, closed").eq("studio_id", studioId),
      sb.from("closures").select("day").eq("studio_id", studioId).gte("day", start).lt("day", end),
    ]);

    const closedDays = new Set((closures ?? []).map((c) => c.day as string));
    const openWeekdays = new Set(
      (rules ?? []).filter((r) => !r.closed).map((r) => r.weekday as number),
    );

    const today = dayKey(new Date());
    const days: { day: string; open: boolean }[] = [];
    const cursor = new Date(`${start}T12:00:00Z`);
    while (cursor.toISOString().slice(0, 10) < end) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({
        day: key,
        open: key >= today && openWeekdays.has(weekdayOf(key)) && !closedDays.has(key),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { days };
  });

export const getDaySlots = createServerFn({ method: "POST" })
  .inputValidator((input: { day: string; serviceId: string }) =>
    z.object({ day: dayString, serviceId: uuid }).parse(input),
  )
  .handler(async ({ data }): Promise<{ slots: Slot[] }> => {
    const sb = await admin();
    const studioId = await getTenantId();
    const weekday = weekdayOf(data.day);

    const [{ data: rule }, { data: closure }, { data: service }, { data: studio }] =
      await Promise.all([
        sb
          .from("availability_rules")
          .select("*")
          .eq("studio_id", studioId)
          .eq("weekday", weekday)
          .maybeSingle(),
        sb
          .from("closures")
          .select("id")
          .eq("studio_id", studioId)
          .eq("day", data.day)
          .maybeSingle(),
        sb
          .from("services")
          .select("duration_minutes")
          .eq("id", data.serviceId)
          .eq("studio_id", studioId)
          .maybeSingle(),
        sb.from("studios").select("slot_interval_minutes").eq("id", studioId).maybeSingle(),
      ]);

    if (!rule || rule.closed || closure || !service) return { slots: [] };

    const interval = studio?.slot_interval_minutes ?? 30;
    const durationMs = service.duration_minutes * 60_000;

    const dayStart = zonedToUtc(data.day, rule.start_time as string).getTime();
    const dayEnd = zonedToUtc(data.day, rule.end_time as string).getTime();
    const breakStart = rule.break_start
      ? zonedToUtc(data.day, rule.break_start as string).getTime()
      : null;
    const breakEnd = rule.break_end
      ? zonedToUtc(data.day, rule.break_end as string).getTime()
      : null;

    const { data: appts } = await sb
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("studio_id", studioId)
      .neq("status", "cancelled")
      .gte("starts_at", new Date(dayStart - 6 * 3600_000).toISOString())
      .lte("starts_at", new Date(dayEnd + 6 * 3600_000).toISOString());

    const busy: [number, number][] = (appts ?? []).map((a) => [
      new Date(a.starts_at).getTime(),
      new Date(a.ends_at).getTime(),
    ]);
    const now = Date.now();

    const slots: Slot[] = [];
    for (let t = dayStart; t + durationMs <= dayEnd; t += interval * 60_000) {
      const end = t + durationMs;
      const overlapsBreak =
        breakStart != null && breakEnd != null && t < breakEnd && end > breakStart;
      const overlapsAppt = busy.some(([s, e]) => t < e && end > s);
      slots.push({
        time: new Intl.DateTimeFormat("it-IT", {
          timeZone: "Europe/Rome",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(t)),
        available: !overlapsBreak && !overlapsAppt && t > now,
      });
    }
    return { slots };
  });

const emailString = z
  .string()
  .trim()
  .max(120)
  .default("")
  .refine((v) => v === "" || /.+@.+\..+/.test(v), "Email non valida");

const bookingSchema = z.object({
  serviceId: uuid,
  day: dayString,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido"),
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(80),
  phone: z.string().trim().min(6, "Inserisci un telefono valido").max(30),
  email: emailString,
  notes: z.string().trim().max(600).optional().default(""),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof bookingSchema>) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const sb = await admin();
    const tenant = await getTenant();
    const studioId = tenant.id;
    const { data: service } = await sb
      .from("services")
      .select("*")
      .eq("id", data.serviceId)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!service || !service.active) throw new Error("Servizio non disponibile");

    const startsAt = zonedToUtc(data.day, data.time);
    if (startsAt.getTime() < Date.now()) throw new Error("Orario non più disponibile");
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

    const { data: clash } = await sb
      .from("appointments")
      .select("id")
      .eq("studio_id", studioId)
      .neq("status", "cancelled")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (clash && clash.length > 0) throw new Error("Orario appena prenotato, scegline un altro");

    const { data: client } = await sb
      .from("clients")
      .upsert(
        { studio_id: studioId, full_name: data.name, phone: data.phone, email: data.email },
        { onConflict: "studio_id,phone" },
      )
      .select("id")
      .maybeSingle();

    const { data: appointment, error } = await sb
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
      .select("manage_token, starts_at, ends_at")
      .single();
    if (error) throw new Error("Prenotazione non riuscita, riprova.");

    // SOLA notifica del piano free: email di conferma (best-effort, non blocca).
    if (data.email) {
      const { sendBookingConfirmationEmail } = await import("@/lib/email.server");
      await sendBookingConfirmationEmail({
        to: data.email,
        clientName: data.name,
        serviceName: service.name as string,
        studioName: tenant.name,
        startsAt: appointment.starts_at as string,
        endsAt: appointment.ends_at as string,
        manageToken: appointment.manage_token as string,
        appUrl: await requestBaseUrl(),
      });
    }

    return { token: appointment.manage_token as string };
  });

const tokenSchema = z.object({ token: uuid });

export const getBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: appointment } = await sb
      .from("appointments")
      .select("*, services(name, duration_minutes, price_cents)")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!appointment) throw new Error("Appuntamento non trovato");
    return { appointment };
  });

export const cancelBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("manage_token", data.token);
    if (error) throw new Error("Cancellazione non riuscita, riprova.");
    return { ok: true };
  });

export const rescheduleBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; day: string; time: string }) =>
    z
      .object({
        token: uuid,
        day: dayString,
        time: z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const studioId = await getTenantId();
    const { data: appointment } = await sb
      .from("appointments")
      .select("id, services(duration_minutes)")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!appointment) throw new Error("Appuntamento non trovato");

    const duration = appointment.services?.duration_minutes ?? 60;
    const startsAt = zonedToUtc(data.day, data.time);
    if (startsAt.getTime() < Date.now()) throw new Error("Orario non più disponibile");
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    const { data: clash } = await sb
      .from("appointments")
      .select("id")
      .eq("studio_id", studioId)
      .neq("status", "cancelled")
      .neq("id", appointment.id)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);
    if (clash && clash.length > 0) throw new Error("Orario non disponibile");

    const { error } = await sb
      .from("appointments")
      .update({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "confirmed",
      })
      .eq("id", appointment.id);
    if (error) throw new Error("Spostamento non riuscito, riprova.");
    return { ok: true };
  });
