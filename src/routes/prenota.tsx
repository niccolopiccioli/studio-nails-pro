import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { BRAND_NAME } from "@/lib/brand";
import { BookingCalendar } from "@/components/booking-calendar";
import {
  createBooking,
  getDaySlots,
  getMonthAvailability,
  getStudioAndServices,
} from "@/lib/booking.functions";
import { dayKey, formatDateLong, formatDuration, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/prenota")({
  validateSearch: (search: Record<string, unknown>): { servizio?: string } =>
    typeof search["servizio"] === "string" ? { servizio: search["servizio"] } : {},

  head: () => ({
    meta: [
      { title: `Prenota online — ${BRAND_NAME}` },
      {
        name: "description",
        content:
          "Scegli il trattamento, il giorno e l'orario disponibile. Prenotazione immediata senza creare un account.",
      },
      { property: "og:title", content: `Prenota online — ${BRAND_NAME}` },
      {
        property: "og:description",
        content: "Disponibilità in tempo reale e conferma immediata.",
      },
    ],
  }),
  component: BookingPage,
});

type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Trattamento" },
  { n: 2, label: "Giorno" },
  { n: 3, label: "Orario" },
  { n: 4, label: "I tuoi dati" },
];

/** Breve pausa per far gustare il feedback di selezione prima del cambio step. */
const ADVANCE_DELAY = 420;

function BookingPage() {
  const { servizio } = Route.useSearch();
  const navigate = useNavigate();

  const fetchStudio = useServerFn(getStudioAndServices);
  const fetchMonth = useServerFn(getMonthAvailability);
  const fetchSlots = useServerFn(getDaySlots);
  const book = useServerFn(createBooking);

  const [step, setStep] = useState<Step>(servizio ? 2 : 1);
  const [dir, setDir] = useState<1 | -1>(1);
  const [serviceId, setServiceId] = useState<string | null>(servizio ?? null);
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const go = (n: Step) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          email: email || undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: (res) => {
      navigate({ to: "/appuntamento/$token", params: { token: res.token } });
    },
    onError: (e: Error) => toast.error(e.message || "Prenotazione non riuscita"),
  });

  const emailOk = !email || /.+@.+\..+/.test(email.trim());
  const canSubmit =
    serviceId && day && time && name.trim().length > 1 && phone.trim().length > 5 && emailOk;

  const pickService = (id: string) => {
    setServiceId(id);
    setTime(null);
    window.setTimeout(() => go(2), ADVANCE_DELAY);
  };

  const pickDay = (d: string) => {
    setDay(d);
    setTime(null);
    window.setTimeout(() => go(3), ADVANCE_DELAY);
  };

  const pickTime = (t: string) => {
    setTime(t);
    window.setTimeout(() => go(4), ADVANCE_DELAY);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 pt-7 pb-4 md:py-12">
        <p className="eyebrow">Prenotazione</p>
        <h1 className="mt-2 font-display text-5xl">Il tuo appuntamento</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nessun account necessario: ti basta un minuto. Riceverai la conferma via email.
        </p>

        <ProgressBar step={step} onJump={go} />

        {/* Riepilogo delle scelte già fatte, con modifica rapida */}
        <div className="mt-6 flex min-h-[2rem] flex-wrap gap-2">
          {step >= 2 && service && (
            <RecapChip label={service.name} onEdit={() => go(1)} delay={0} />
          )}
          {step >= 3 && day && (
            <RecapChip label={formatDateLong(`${day}T12:00:00Z`)} onEdit={() => go(2)} delay={80} />
          )}
          {step >= 4 && time && (
            <RecapChip label={`ore ${time}`} onEdit={() => go(3)} delay={160} />
          )}
        </div>

        <div
          key={step}
          className={dir === 1 ? "animate-wizard-next mt-6" : "animate-wizard-back mt-6"}
        >
          {step === 1 && (
            <StepShell
              n={1}
              title="Scegli il trattamento"
              subtitle="Cosa facciamo oggi alle tue mani?"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s, i) => {
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => pickService(s.id)}
                      style={{ animationDelay: `${i * 70}ms` }}
                      className={[
                        "animate-pop-in silk group rounded-2xl border p-5 text-left",
                        active
                          ? "border-primary/70 bg-card shadow-[var(--shadow-lift)]"
                          : "border-border bg-card/50 hover:-translate-y-1 hover:bg-card hover:shadow-[var(--shadow-soft)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-2xl">{s.name}</span>
                        <span
                          className={[
                            "silk flex size-6 items-center justify-center rounded-full",
                            active
                              ? "scale-110 bg-primary text-primary-foreground"
                              : "border border-border text-transparent group-hover:border-primary/50",
                          ].join(" ")}
                        >
                          <Check className="size-3.5" />
                        </span>
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
            </StepShell>
          )}

          {step === 2 && (
            <StepShell n={2} title="Scegli il giorno" subtitle="I giorni accesi sono disponibili.">
              {!service && (
                <div className="animate-pop-in surface-card mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
                  <p className="text-sm text-muted-foreground">
                    Prima dimmi quale trattamento desideri.
                  </p>
                  <NavButton label="Scegli il trattamento" onClick={() => go(1)} />
                </div>
              )}
              <div className="animate-pop-in" style={{ animationDelay: "90ms" }}>
                <BookingCalendar
                  month={month}
                  onMonthChange={(m) => {
                    setMonth(m);
                    setDay(null);
                    setTime(null);
                  }}
                  days={monthData?.days ?? []}
                  selected={day}
                  onSelect={pickDay}
                  loading={loadingMonth}
                />
              </div>
              <StepNav back={() => go(1)} />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell n={3} title="Scegli l'orario" subtitle="Disponibilità in tempo reale.">
              {!service || !day ? (
                <div className="animate-pop-in surface-card flex flex-wrap items-center justify-between gap-3 p-5">
                  <p className="text-sm text-muted-foreground">
                    Seleziona prima trattamento e giorno.
                  </p>
                  <NavButton label="Ricomincia" onClick={() => go(1)} />
                </div>
              ) : loadingSlots ? (
                <p className="animate-pop-in mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Verifico la disponibilità…
                </p>
              ) : (slotData?.slots ?? []).length === 0 ? (
                <div className="animate-pop-in surface-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nessun orario disponibile in questa giornata.
                  </p>
                  <div className="mt-4">
                    <NavButton label="Scegli un altro giorno" onClick={() => go(2)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slotData!.slots.map((s, i) => (
                    <button
                      key={s.time}
                      disabled={!s.available}
                      onClick={() => pickTime(s.time)}
                      style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}
                      className={[
                        "animate-pop-in silk rounded-xl py-3 text-sm",
                        time === s.time
                          ? "scale-105 bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                          : s.available
                            ? "bg-accent/40 hover:scale-105 hover:bg-accent"
                            : "bg-muted/40 text-muted-foreground/40 line-through",
                      ].join(" ")}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
              <StepNav back={() => go(2)} />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell n={4} title="I tuoi dati" subtitle="Quasi fatto, promesso.">
              <div
                className="animate-pop-in surface-card gradient-blush p-6"
                style={{ animationDelay: "60ms" }}
              >
                <p className="eyebrow">Riepilogo</p>
                <p className="mt-2 font-display text-3xl">{service?.name}</p>
                <p className="mt-1 text-sm text-muted-foreground capitalize">
                  {day ? formatDateLong(`${day}T12:00:00Z`) : ""} · ore {time}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {service ? `${formatDuration(service.duration_minutes)} · ` : ""}
                  {service ? formatPrice(service.price_cents) : ""}
                </p>
              </div>

              <div className="animate-pop-in mt-4 grid gap-3" style={{ animationDelay: "150ms" }}>
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
                <Field label="Email (per la conferma)">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
                    placeholder="giulia@email.it"
                  />
                </Field>
                <Field label="Note (opzionale)">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
                    placeholder="Idee, colori preferiti…"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Evita dati sanitari: bastano idee e colori.
                  </p>
                </Field>
              </div>

              <div className="animate-pop-in mt-6" style={{ animationDelay: "240ms" }}>
                <button
                  disabled={!canSubmit || mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="silk group relative w-full overflow-hidden rounded-full bg-primary px-7 py-4 text-[0.72rem] tracking-[0.24em] uppercase text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
                >
                  <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <span className="relative inline-flex items-center gap-2">
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Confermo…
                      </>
                    ) : (
                      <>
                        Conferma prenotazione{" "}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
                <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                  Confermando accetti i{" "}
                  <Link
                    to="/termini"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Termini
                  </Link>{" "}
                  e l'{" "}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    informativa privacy
                  </Link>
                  . Usiamo i tuoi dati solo per l'appuntamento.
                </p>
                <StepNav back={() => go(3)} />
              </div>
            </StepShell>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressBar({ step, onJump }: { step: Step; onJump: (n: Step) => void }) {
  return (
    <div className="mt-8">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <div key={s.n} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => done && onJump(s.n)}
                disabled={!done}
                aria-label={s.label}
                className="group flex flex-col items-center gap-2"
              >
                <span
                  className={[
                    "silk flex size-9 items-center justify-center rounded-full border font-display text-base",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : current
                        ? "animate-ring-pulse scale-110 border-primary bg-card"
                        : "border-border bg-card/60 text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? <Check className="size-4" /> : s.n}
                </span>
                <span
                  className={[
                    "hidden text-[0.62rem] tracking-[0.2em] uppercase sm:block",
                    current ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="relative mx-2 mb-0 h-0.5 flex-1 overflow-hidden rounded-full bg-muted sm:mb-7">
                  <div
                    className="silk absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: s.n < step ? "100%" : "0%" }}
                  />
                  {s.n === step - 1 && (
                    <div className="animate-shimmer absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecapChip({ label, onEdit, delay }: { label: string; onEdit: () => void; delay: number }) {
  return (
    <button
      onClick={onEdit}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-pop-in silk inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-1.5 text-xs capitalize hover:shadow-[var(--shadow-soft)]"
    >
      <Check className="size-3.5 text-primary" />
      {label}
      <Pencil className="size-3 text-muted-foreground" />
    </button>
  );
}

function StepShell({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-base text-primary-foreground shadow-[var(--shadow-soft)]">
          {n}
        </span>
        <div>
          <h2 className="font-display text-4xl leading-none">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function StepNav({ back }: { back: () => void }) {
  return (
    <button
      onClick={back}
      className="silk mt-6 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Indietro
    </button>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="silk inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-[0.65rem] tracking-[0.2em] uppercase hover:bg-accent/40"
    >
      {label} <ArrowRight className="size-3.5" />
    </button>
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
