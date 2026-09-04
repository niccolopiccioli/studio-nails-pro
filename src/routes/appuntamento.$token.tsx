import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarX2, Clock3, Phone, Sparkles } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  cancelBookingByToken,
  getBookingByToken,
  getDaySlots,
  getMonthAvailability,
  rescheduleBookingByToken,
} from "@/lib/booking.functions";
import { dayKey, formatDateLong, formatPrice, formatTime } from "@/lib/time";

export const Route = createFileRoute("/appuntamento/$token")({
  head: () => ({
    meta: [
      { title: "Il tuo appuntamento — Studio Nails" },
      {
        name: "description",
        content: "Consulta, sposta o cancella il tuo appuntamento da Studio Nails.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppointmentPage,
});

function AppointmentPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();

  const fetchBooking = useServerFn(getBookingByToken);
  const fetchMonth = useServerFn(getMonthAvailability);
  const fetchSlots = useServerFn(getDaySlots);
  const cancelFn = useServerFn(cancelBookingByToken);
  const rescheduleFn = useServerFn(rescheduleBookingByToken);

  const [moving, setMoving] = useState(false);
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", token],
    queryFn: () => fetchBooking({ data: { token } }),
    retry: false,
  });
  const appt = data?.appointment;

  const { data: monthData } = useQuery({
    queryKey: ["availability", month],
    queryFn: () => fetchMonth({ data: { month } }),
    enabled: moving,
  });

  const { data: slotData } = useQuery({
    queryKey: ["slots", day, appt?.service_id],
    queryFn: () => fetchSlots({ data: { day: day!, serviceId: appt!.service_id! } }),
    enabled: Boolean(moving && day && appt?.service_id),
  });

  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { token } }),
    onSuccess: () => {
      toast.success("Appuntamento cancellato");
      qc.invalidateQueries({ queryKey: ["booking", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reschedule = useMutation({
    mutationFn: () => rescheduleFn({ data: { token, day: day!, time: time! } }),
    onSuccess: () => {
      toast.success("Appuntamento spostato");
      setMoving(false);
      setDay(null);
      setTime(null);
      qc.invalidateQueries({ queryKey: ["booking", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 py-12">
        {isLoading && <p className="text-sm text-muted-foreground">Carico l'appuntamento…</p>}
        {isError && (
          <div className="surface-card p-8 text-center">
            <h1 className="font-display text-3xl">Appuntamento non trovato</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Il link potrebbe non essere più valido.
            </p>
            <Link
              to="/prenota"
              className="silk mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground"
            >
              Prenota di nuovo
            </Link>
          </div>
        )}

        {appt && (
          <div className="animate-rise">
            <div
              className={[
                "surface-card p-8",
                appt.status === "cancelled" ? "opacity-70" : "gradient-blush",
              ].join(" ")}
            >
              <p className="eyebrow inline-flex items-center gap-2">
                {appt.status === "cancelled" ? (
                  <>
                    <CalendarX2 className="size-3.5" /> Appuntamento cancellato
                  </>
                ) : (
                  <>
                    <CalendarCheck className="size-3.5" /> Appuntamento confermato
                  </>
                )}
              </p>
              <h1 className="mt-3 font-display text-4xl capitalize">
                {formatDateLong(appt.starts_at)}
              </h1>
              <p className="mt-1 inline-flex items-center gap-2 font-display text-2xl">
                <Clock3 className="size-4" /> {formatTime(appt.starts_at)} –{" "}
                {formatTime(appt.ends_at)}
              </p>

              <div className="mt-6 space-y-2 text-sm">
                <p className="inline-flex items-center gap-2">
                  <Sparkles className="size-4" /> {appt.services?.name ?? "Trattamento"} ·{" "}
                  {formatPrice(appt.price_cents)}
                </p>
                <p className="inline-flex items-center gap-2">
                  <Phone className="size-4" /> {appt.client_name} — {appt.client_phone}
                </p>
                {appt.notes && <p className="text-muted-foreground">Note: {appt.notes}</p>}
              </div>
            </div>

            {appt.status !== "cancelled" && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setMoving((v) => !v)}
                  className="silk rounded-full border border-border bg-card px-6 py-3 text-[0.68rem] tracking-[0.24em] uppercase hover:bg-accent/40"
                >
                  {moving ? "Chiudi" : "Sposta appuntamento"}
                </button>
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="silk rounded-full border border-destructive/40 px-6 py-3 text-[0.68rem] tracking-[0.24em] uppercase text-destructive hover:bg-destructive/10"
                >
                  Cancella
                </button>
              </div>
            )}

            {moving && appt.status !== "cancelled" && (
              <div className="mt-6 space-y-5">
                <BookingCalendar
                  month={month}
                  onMonthChange={(m) => {
                    setMonth(m);
                    setDay(null);
                    setTime(null);
                  }}
                  days={monthData?.days ?? []}
                  selected={day}
                  onSelect={(d) => {
                    setDay(d);
                    setTime(null);
                  }}
                />
                {day && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {(slotData?.slots ?? []).map((s) => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setTime(s.time)}
                        className={[
                          "silk rounded-xl py-3 text-sm",
                          time === s.time
                            ? "bg-primary text-primary-foreground"
                            : s.available
                              ? "bg-accent/40 hover:bg-accent"
                              : "bg-muted/40 text-muted-foreground/40 line-through",
                        ].join(" ")}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  disabled={!day || !time || reschedule.isPending}
                  onClick={() => reschedule.mutate()}
                  className="silk w-full rounded-full bg-primary px-6 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground disabled:opacity-40"
                >
                  Conferma nuovo orario
                </button>
              </div>
            )}

            <p className="mt-8 text-xs text-muted-foreground">
              Conserva questo link: ti permette di gestire l'appuntamento in qualsiasi momento.
            </p>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
