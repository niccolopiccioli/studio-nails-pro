import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Phone, StickyNote } from "lucide-react";

import { StaffShell, StatCard } from "@/components/staff-shell";
import { useStaff } from "@/hooks/use-staff";
import { listAppointments, updateAppointment } from "@/lib/staff.functions";
import {
  addDaysKey,
  dayKey,
  formatDateLong,
  formatDateShort,
  formatPrice,
  formatTime,
  startOfWeekKey,
} from "@/lib/time";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Agenda — Studio Nails" },
      { name: "description", content: "Agenda giornaliera, settimanale e mensile della nail artist." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type View = "day" | "week" | "month";

function DashboardPage() {
  const { profile } = useStaff();
  const qc = useQueryClient();
  const fetchAppointments = useServerFn(listAppointments);
  const update = useServerFn(updateAppointment);

  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => dayKey(new Date()));
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveDay, setMoveDay] = useState("");
  const [moveTime, setMoveTime] = useState("");

  const monthStart = `${anchor.slice(0, 7)}-01`;
  const monthEnd = useMemo(() => {
    const d = new Date(`${monthStart}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    return d.toISOString().slice(0, 10);
  }, [monthStart]);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", monthStart, monthEnd],
    queryFn: () => fetchAppointments({ data: { from: monthStart, to: monthEnd } }),
  });

  const all = data?.appointments ?? [];

  const range = useMemo(() => {
    if (view === "day") return [anchor, anchor];
    if (view === "week") {
      const start = startOfWeekKey(anchor);
      return [start, addDaysKey(start, 6)];
    }
    return [monthStart, monthEnd];
  }, [view, anchor, monthStart, monthEnd]);

  const visible = all.filter((a) => {
    const k = dayKey(a.starts_at);
    return k >= range[0]! && k <= range[1]!;
  });

  const revenue = (from: string, to: string) =>
    all
      .filter((a) => {
        const k = dayKey(a.starts_at);
        return k >= from && k <= to && a.status !== "cancelled";
      })
      .reduce((sum, a) => sum + a.price_cents, 0);

  const today = dayKey(new Date());
  const weekStart = startOfWeekKey(today);

  const mutate = useMutation({
    mutationFn: (input: {
      id: string;
      status?: "confirmed" | "cancelled" | "completed";
      day?: string;
      time?: string;
    }) => update({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      setMovingId(null);
      toast.success("Appuntamento aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shift = (delta: number) => {
    if (view === "day") setAnchor(addDaysKey(anchor, delta));
    else if (view === "week") setAnchor(addDaysKey(anchor, delta * 7));
    else {
      const d = new Date(`${anchor}T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + delta);
      setAnchor(d.toISOString().slice(0, 10));
    }
  };

  return (
    <StaffShell title="Agenda" subtitle={profile?.full_name ?? undefined}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Fatturato oggi" value={formatPrice(revenue(today, today))} />
        <StatCard
          label="Questa settimana"
          value={formatPrice(revenue(weekStart, addDaysKey(weekStart, 6)))}
        />
        <StatCard label="Questo mese" value={formatPrice(revenue(monthStart, monthEnd))} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "silk rounded-full px-4 py-2 text-[0.65rem] tracking-[0.18em] uppercase",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {v === "day" ? "Giorno" : v === "week" ? "Settimana" : "Mese"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Precedente"
            onClick={() => shift(-1)}
            className="silk rounded-full border border-border p-2 hover:bg-accent/40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-[10rem] text-center text-sm capitalize">
            {view === "day"
              ? formatDateLong(`${anchor}T12:00:00Z`)
              : view === "week"
                ? `${formatDateShort(`${range[0]}T12:00:00Z`)} – ${formatDateShort(`${range[1]}T12:00:00Z`)}`
                : new Intl.DateTimeFormat("it-IT", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${monthStart}T12:00:00Z`))}
          </p>
          <button
            aria-label="Successivo"
            onClick={() => shift(1)}
            className="silk rounded-full border border-border p-2 hover:bg-accent/40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carico l'agenda…</p>}
        {!isLoading && visible.length === 0 && (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nessun appuntamento in questo periodo.
          </div>
        )}
        {visible.map((a) => (
          <article key={a.id} className="surface-card animate-rise p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow capitalize">{formatDateLong(a.starts_at)}</p>
                <p className="mt-1 font-display text-2xl">
                  {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
                </p>
                <p className="mt-1 text-sm">
                  {a.client_name} · {a.services?.name ?? "Trattamento"}
                </p>
                <a
                  href={`tel:${a.client_phone}`}
                  className="silk mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-3.5" /> {a.client_phone}
                </a>
                {a.notes && (
                  <p className="mt-2 inline-flex items-start gap-2 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 size-3.5" /> {a.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-2xl">{formatPrice(a.price_cents)}</p>
                <span
                  className={[
                    "mt-1 inline-block rounded-full px-3 py-1 text-[0.6rem] tracking-[0.16em] uppercase",
                    a.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : a.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent text-accent-foreground",
                  ].join(" ")}
                >
                  {a.status === "cancelled"
                    ? "Cancellato"
                    : a.status === "completed"
                      ? "Completato"
                      : "Confermato"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {a.status !== "confirmed" && (
                <ActionButton onClick={() => mutate.mutate({ id: a.id, status: "confirmed" })}>
                  Conferma
                </ActionButton>
              )}
              {a.status === "confirmed" && (
                <ActionButton onClick={() => mutate.mutate({ id: a.id, status: "completed" })}>
                  Completato
                </ActionButton>
              )}
              <ActionButton
                onClick={() => {
                  setMovingId(movingId === a.id ? null : a.id);
                  setMoveDay(dayKey(a.starts_at));
                  setMoveTime(formatTime(a.starts_at));
                }}
              >
                Sposta
              </ActionButton>
              {a.status !== "cancelled" && (
                <ActionButton
                  tone="danger"
                  onClick={() => mutate.mutate({ id: a.id, status: "cancelled" })}
                >
                  Cancella
                </ActionButton>
              )}
            </div>

            {movingId === a.id && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <label className="text-xs">
                  <span className="eyebrow">Data</span>
                  <input
                    type="date"
                    value={moveDay}
                    onChange={(e) => setMoveDay(e.target.value)}
                    className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="eyebrow">Ora</span>
                  <input
                    type="time"
                    value={moveTime}
                    onChange={(e) => setMoveTime(e.target.value)}
                    className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <ActionButton
                  onClick={() => mutate.mutate({ id: a.id, day: moveDay, time: moveTime })}
                >
                  Salva spostamento
                </ActionButton>
              </div>
            )}
          </article>
        ))}
      </div>
    </StaffShell>
  );
}

function ActionButton({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "silk rounded-full border px-4 py-2 text-[0.62rem] tracking-[0.18em] uppercase",
        tone === "danger"
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-border hover:bg-accent/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
