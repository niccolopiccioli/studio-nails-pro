import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Phone, Plus, StickyNote } from "lucide-react";

import { StaffShell, StatCard } from "@/components/staff-shell";
import { useStaff } from "@/hooks/use-staff";
import {
  createAppointmentManual,
  deleteAppointment,
  listAppointments,
  listServicesAdmin,
  updateAppointment,
} from "@/lib/staff.functions";
import {
  addDaysKey,
  dayKey,
  formatDateLong,
  formatDateShort,
  formatTime,
  startOfWeekKey,
} from "@/lib/time";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Agenda" },
      { name: "description", content: "Agenda giornaliera e settimanale dello studio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type View = "day" | "week";

function DashboardPage() {
  const { profile } = useStaff();
  const qc = useQueryClient();
  const fetchAppointments = useServerFn(listAppointments);
  const fetchServices = useServerFn(listServicesAdmin);
  const update = useServerFn(updateAppointment);
  const createManual = useServerFn(createAppointmentManual);
  const removeFn = useServerFn(deleteAppointment);

  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => dayKey(new Date()));
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveDay, setMoveDay] = useState("");
  const [moveTime, setMoveTime] = useState("");
  const [creating, setCreating] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return [anchor, anchor] as const;
    const start = startOfWeekKey(anchor);
    return [start, addDaysKey(start, 6)] as const;
  }, [view, anchor]);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", range[0], range[1]],
    queryFn: () => fetchAppointments({ data: { from: range[0], to: range[1] } }),
  });
  const { data: servicesData } = useQuery({
    queryKey: ["services-admin"],
    queryFn: () => fetchServices(),
  });

  const all = useMemo(
    () => [...(data?.appointments ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [data],
  );

  // Piano free: unico dato mostrato, numero di appuntamenti di oggi.
  const today = dayKey(new Date());
  const todayCount = all.filter(
    (a) => dayKey(a.starts_at) === today && a.status !== "cancelled",
  ).length;

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

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Appuntamento eliminato definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shift = (delta: number) => {
    if (view === "day") setAnchor(addDaysKey(anchor, delta));
    else setAnchor(addDaysKey(anchor, delta * 7));
  };

  return (
    <StaffShell title="Agenda" subtitle={profile?.full_name ?? undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Appuntamenti oggi" value={String(todayCount)} />
        <div className="surface-card flex items-center justify-between gap-3 p-5">
          <div>
            <p className="eyebrow">Nuovo</p>
            <p className="mt-2 text-sm text-muted-foreground">Telefono o walk-in, senza link.</p>
          </div>
          <button
            onClick={() => setCreating((v) => !v)}
            className="silk inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase text-primary-foreground"
          >
            <Plus className="size-3.5" /> {creating ? "Chiudi" : "Crea"}
          </button>
        </div>
      </div>

      {creating && (
        <CreateForm
          services={servicesData?.services ?? []}
          defaultDay={anchor}
          onDone={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["appointments"] });
            qc.invalidateQueries({ queryKey: ["clients"] });
          }}
          create={(input) => createManual({ data: input })}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["day", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "silk rounded-full px-4 py-2 text-[0.65rem] tracking-[0.18em] uppercase",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {v === "day" ? "Giorno" : "Settimana"}
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
              : `${formatDateShort(`${range[0]}T12:00:00Z`)} – ${formatDateShort(`${range[1]}T12:00:00Z`)}`}
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
        {!isLoading && all.length === 0 && (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nessun appuntamento in questo periodo.
          </div>
        )}
        {all.map((a) => (
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
              <ActionButton
                tone="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Eliminare definitivamente questo appuntamento? L'operazione non si può annullare.",
                    )
                  )
                    remove.mutate(a.id);
                }}
              >
                Elimina
              </ActionButton>
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

function CreateForm({
  services,
  defaultDay,
  onDone,
  create,
}: {
  services: { id: string; name: string }[];
  defaultDay: string;
  onDone: () => void;
  create: (input: {
    serviceId: string;
    day: string;
    time: string;
    name: string;
    phone: string;
    email?: string | undefined;
    notes?: string | undefined;
  }) => Promise<unknown>;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    serviceId && day && time && name.trim().length > 1 && phone.trim().length > 5 && !saving;

  const submit = async () => {
    setSaving(true);
    try {
      await create({
        serviceId,
        day,
        time,
        name,
        phone,
        email: email || undefined,
        notes: notes || undefined,
      });
      toast.success("Appuntamento creato");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Creazione non riuscita");
      setSaving(false);
    }
  };

  return (
    <div className="surface-card mt-4 space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="eyebrow">Servizio</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="eyebrow">Cliente</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome e cognome"
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Telefono</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="+39 333 1234567"
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Email (per la conferma)</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            placeholder="cliente@email.it"
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Data</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Ora</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-xs">
        <span className="eyebrow">Note</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opzionale"
          className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </label>
      <button
        disabled={!canSave}
        onClick={submit}
        className="silk rounded-full bg-primary px-6 py-3 text-[0.65rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
      >
        {saving ? "Salvo…" : "Salva appuntamento"}
      </button>
    </div>
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
