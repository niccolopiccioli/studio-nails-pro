import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  createBooking,
  getDaySlots,
  getMonthAvailability,
  getStudioAndServices,
} from "@/lib/booking.functions";
import { dayKey, formatDateLong, formatDuration, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/prenota")({
  validateSearch: (search: Record<string, unknown>) => ({
    servizio: typeof search["servizio"] === "string" ? (search["servizio"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Prenota online — Studio Nails" },
      {
        name: "description",
        content:
          "Scegli il trattamento, il giorno e l'orario disponibile. Prenotazione immediata senza creare un account.",
      },
      { property: "og:title", content: "Prenota online — Studio Nails" },
      {
        property: "og:description",
        content: "Disponibilità in tempo reale e conferma immediata.",
      },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { servizio } = Route.useSearch();
  const navigate = useNavigate();

  const fetchStudio = useServerFn(getStudioAndServices);
  const fetchMonth = useServerFn(getMonthAvailability);
  const fetchSlots = useServerFn(getDaySlots);
  const book = useServerFn(createBooking);

  const [serviceId, setServiceId] = useState<string | null>(servizio ?? null);
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const { data: studioData } = useQuery({ queryKey: ["studio"], queryFn: () => fetchStudio() });
  const services = studioData?.services ?? [];
  const service = services.find((s) => s.id === serviceId) ?? null;

  const { data: monthData, isFetching: loadingMonth } = useQuery({
    queryKey: ["availability", month],
    queryFn: () => fetchMonth({ data: { month } }),
  });

  const { data: slotData, isFetching: loadingSlots } = useQuery({
    queryKey: ["slots", day, serviceId],
    queryFn: () => fetchSlots({ data: { day: day!, serviceId: serviceId! } }),
    enabled: Boolean(day && serviceId),
    refetchOnWindowFocus: true,
  });

  const mutation = useMutation({
    mutationFn: () =>
      book({
        data: {
          serviceId: serviceId!,
          day: day!,
          time: time!,
          name,
          phone,
          notes: notes || undefined,
        },
      }),
    onSuccess: (res) => {
      navigate({ to: "/appuntamento/$token", params: { token: res.token } });
    },
    onError: (e: Error) => toast.error(e.message || "Prenotazione non riuscita"),
  });

  const canSubmit = serviceId && day && time && name.trim().length > 1 && phone.trim().length > 5;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow">Prenotazione</p>
        <h1 className="mt-2 font-display text-5xl">Il tuo appuntamento</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nessun account necessario: ti basta un minuto.
        </p>

        {/* 1. Servizio */}
        <div className="mt-10">
          <StepTitle n={1} title="Scegli il trattamento" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {services.map((s) => {
              const active = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setTime(null);
                  }}
                  className={[
                    "silk rounded-2xl border p-4 text-left",
                    active
                      ? "border-primary/70 bg-card shadow-[var(--shadow-soft)]"
                      : "border-border bg-card/50 hover:bg-card",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl">{s.name}</span>
                    {active && <Check className="size-4" />}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(s.duration_minutes)}</span>
                    <span>·</span>
                    <span>{formatPrice(s.price_cents)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Giorno */}
        <div className="mt-10">
          <StepTitle n={2} title="Scegli il giorno" />
          <div className="mt-4">
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
              loading={loadingMonth}
            />
          </div>
        </div>

        {/* 3. Orario */}
        <div className="mt-10">
          <StepTitle n={3} title="Scegli l'orario" />
          {!serviceId || !day ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Seleziona prima trattamento e giorno.
            </p>
          ) : loadingSlots ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Verifico la disponibilità…
            </p>
          ) : (slotData?.slots ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nessun orario disponibile in questa giornata.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slotData!.slots.map((s) => (
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
        </div>

        {/* 4. Dati */}
        <div className="mt-10">
          <StepTitle n={4} title="I tuoi dati" />
          <div className="mt-4 grid gap-3">
            <Field label="Nome e cognome">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
                placeholder="Giulia Rossi"
              />
            </Field>
            <Field label="Telefono">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
                placeholder="+39 333 1234567"
              />
            </Field>
            <Field label="Note (opzionale)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
                placeholder="Idee, colori preferiti, allergie…"
              />
            </Field>
          </div>
        </div>

        <div className="surface-card sticky bottom-4 mt-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-display text-lg">{service ? service.name : "Nessun trattamento"}</p>
            <p className="text-muted-foreground">
              {day ? formatDateLong(`${day}T12:00:00Z`) : "Giorno da scegliere"}
              {time ? ` · ${time}` : ""}
            </p>
          </div>
          <button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="silk rounded-full bg-primary px-7 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground disabled:opacity-40"
          >
            {mutation.isPending ? "Confermo…" : "Conferma prenotazione"}
          </button>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 items-center justify-center rounded-full border border-border font-display text-sm">
        {n}
      </span>
      <h2 className="font-display text-2xl">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
