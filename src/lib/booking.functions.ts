import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { STUDIO_ID, dayKey, weekdayOf, zonedToUtc } from "./time";

/**
 * Area pubblica: prenotazione senza account.
 * Le letture/scritture passano da qui in modo che i dati personali dei clienti
 * non siano mai esposti al ruolo anonimo del database.
 */
async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Slot = { time: string; available: boolean };

export const getStudioAndServices = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const [{ data: studio }, { data: services }] = await Promise.all([
    sb.from("studios").select("*").eq("id", STUDIO_ID).maybeSingle(),
    sb
      .from("services")
      .select("*")
      .eq("studio_id", STUDIO_ID)
      .eq("active", true)
      .order("sort_order"),
  ]);
  return { studio, services: services ?? [] };
});

export const getMonthAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: { month: string }) => z.object({ month: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sb = await db();
    const start = `${data.month}-01`;
    const endDate = new Date(`${start}T12:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);

    const [{ data: rules }, { data: closures }] = await Promise.all([
      sb.from("availability_rules").select("*").eq("studio_id", STUDIO_ID),
      sb.from("closures").select("day").eq("studio_id", STUDIO_ID).gte("day", start).lt("day", end),
    ]);

    const closedDays = new Set((closures ?? []).map((c) => c.day));
    const openWeekdays = new Set(
      (rules ?? []).filter((r) => !r.closed).map((r) => r.weekday as number),
    );

    const days: { day: string; open: boolean }[] = [];
    const cursor = new Date(`${start}T12:00:00Z`);
    const today = dayKey(new Date());
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
    z.object({ day: z.string(), serviceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ slots: Slot[] }> => {
    const sb = await db();
    const weekday = weekdayOf(data.day);

    const [{ data: rule }, { data: closure }, { data: service }, { data: studio }] =
      await Promise.all([
        sb
          .from("availability_rules")
          .select("*")
          .eq("studio_id", STUDIO_ID)
          .eq("weekday", weekday)
          .maybeSingle(),
        sb
          .from("closures")
          .select("id")
          .eq("studio_id", STUDIO_ID)
          .eq("day", data.day)
          .maybeSingle(),
        sb.from("services").select("*").eq("id", data.serviceId).maybeSingle(),
        sb.from("studios").select("slot_interval_minutes").eq("id", STUDIO_ID).maybeSingle(),
      ]);

    if (!rule || rule.closed || closure || !service) return { slots: [] };

    const interval = studio?.slot_interval_minutes ?? 30;
    const duration = service.duration_minutes;

    const dayStart = zonedToUtc(data.day, rule.start_time).getTime();
    const dayEnd = zonedToUtc(data.day, rule.end_time).getTime();
    const breakStart = rule.break_start ? zonedToUtc(data.day, rule.break_start).getTime() : null;
    const breakEnd = rule.break_end ? zonedToUtc(data.day, rule.break_end).getTime() : null;

    const { data: appts } = await sb
      .from("appointments")
      .select("starts_at, ends_at, status")
      .eq("studio_id", STUDIO_ID)
      .neq("status", "cancelled")
      .gte("starts_at", new Date(dayStart - 6 * 3600_000).toISOString())
      .lte("starts_at", new Date(dayEnd + 6 * 3600_000).toISOString());

    const busy = (appts ?? []).map((a) => [
      new Date(a.starts_at).getTime(),
      new Date(a.ends_at).getTime(),
    ]);

    const now = Date.now();
    const slots: Slot[] = [];
    for (let t = dayStart; t + duration * 60_000 <= dayEnd; t += interval * 60_000) {
      const end = t + duration * 60_000;
      const overlapsBreak = breakStart && breakEnd ? t < breakEnd && end > breakStart : false;
      const overlapsAppt = busy.some(([s, e]) => t < (e as number) && end > (s as number));
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

const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  day: z.string(),
  time: z.string(),
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(30),
  notes: z.string().max(600).optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof bookingSchema>) => bookingSchema.parse(input))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: service } = await sb
      .from("services")
      .select("*")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (!service) throw new Error("Servizio non disponibile");

    const startsAt = zonedToUtc(data.day, data.time);
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
    if (startsAt.getTime() < Date.now()) throw new Error("Orario non più disponibile");

    const { data: clash } = await sb
      .from("appointments")
      .select("id, starts_at, ends_at")
      .eq("studio_id", STUDIO_ID)
      .neq("status", "cancelled")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (clash && clash.length > 0) throw new Error("Orario appena prenotato, scegline un altro");

    const phone = data.phone.trim();
    const { data: client } = await sb
      .from("clients")
      .upsert(
        { studio_id: STUDIO_ID, full_name: data.name.trim(), phone },
        { onConflict: "studio_id,phone" },
      )
      .select("id")
      .maybeSingle();

    const { data: appointment, error } = await sb
      .from("appointments")
      .insert({
        studio_id: STUDIO_ID,
        client_id: client?.id ?? null,
        service_id: service.id,
        client_name: data.name.trim(),
        client_phone: phone,
        notes: data.notes?.trim() ?? "",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        price_cents: service.price_cents,
        status: "confirmed",
      })
      .select("manage_token")
      .single();
    if (error) throw new Error(error.message);

    return { token: appointment.manage_token as string };
  });

export const getBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: appointment } = await sb
      .from("appointments")
      .select("*, services(name, duration_minutes, price_cents)")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!appointment) throw new Error("Appuntamento non trovato");
    return { appointment };
  });

export const cancelBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { error } = await sb
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("manage_token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rescheduleBookingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; day: string; time: string }) =>
    z.object({ token: z.string().uuid(), day: z.string(), time: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: appointment } = await sb
      .from("appointments")
      .select("id, service_id, services(duration_minutes)")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (!appointment) throw new Error("Appuntamento non trovato");

    const duration = appointment.services?.duration_minutes ?? 60;
    const startsAt = zonedToUtc(data.day, data.time);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    const { data: clash } = await sb
      .from("appointments")
      .select("id")
      .eq("studio_id", STUDIO_ID)
      .neq("status", "cancelled")
      .neq("id", appointment.id)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (clash && clash.length > 0) throw new Error("Orario non disponibile");

    const { error } = await sb
      .from("appointments")
      .update({
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "confirmed",
      })
      .eq("id", appointment.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
