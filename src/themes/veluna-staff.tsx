import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogOut,
  Phone,
  Plus,
  Scissors,
  Search,
  Settings2,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  listManagedStudios,
  platformAddClosure,
  platformCreateAppointment,
  platformDeleteAppointment,
  platformDeleteClient,
  platformDeleteService,
  platformGetAvailability,
  platformListAppointments,
  platformListClients,
  platformListServices,
  platformRemoveClosure,
  platformSaveAvailabilityRule,
  platformSaveService,
  platformUpdateAppointment,
} from "@/lib/platform.functions";
import {
  WEEKDAY_LABELS,
  addDaysKey,
  dayKey,
  formatDateLong,
  formatDateShort,
  formatPrice,
  formatTime,
  startOfWeekKey,
} from "@/lib/time";

export type PlatformSection = "agenda" | "clienti" | "orari" | "servizi";

type ManagedStudio = { id: string; slug: string; name: string };

const SECTION_META: Record<PlatformSection, { title: string; to: string; icon: typeof Users }> = {
  agenda: { title: "Agenda", to: "/dashboard", icon: CalendarDays },
  clienti: { title: "Clienti", to: "/clienti", icon: Users },
  orari: { title: "Orari", to: "/disponibilita", icon: Settings2 },
  servizi: { title: "Servizi", to: "/gestionale", icon: Scissors },
};

/* ------------------------------- hook ------------------------------- */

function usePlatform() {
  const fetchStudios = useServerFn(listManagedStudios);
  const studiosQuery = useQuery({ queryKey: ["managed-studios"], queryFn: () => fetchStudios() });
  const studios = (studiosQuery.data?.studios ?? []) as ManagedStudio[];
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem("veluna-studio-id") : null;
    } catch {
      return null;
    }
  });
  const selected = studios.find((s) => s.id === selectedId) ?? studios[0] ?? null;

  const selectStudio = (id: string) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem("veluna-studio-id", id);
    } catch {
      /* noop */
    }
  };

  return { studios, selected, selectStudio, isLoading: studiosQuery.isLoading };
}

/* ------------------------------- shell ------------------------------- */

function VelunaShell({
  section,
  studioName,
  studios,
  selectedId,
  onSelectStudio,
  children,
}: {
  section: PlatformSection;
  studioName: string | null;
  studios?: ManagedStudio[];
  selectedId?: string | null;
  onSelectStudio?: (id: string) => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const items = (Object.keys(SECTION_META) as PlatformSection[]).map((k) => ({
    key: k,
    ...SECTION_META[k],
  }));

  return (
    <div className="min-h-screen pb-28 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="eyebrow">Veluna · Console</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="font-display text-2xl leading-tight">{SECTION_META[section].title}</h1>
              {studios && studios.length > 1 && onSelectStudio ? (
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => onSelectStudio(e.target.value)}
                  aria-label="Seleziona studio"
                  className="border border-border bg-card px-3 py-1.5 text-sm outline-none"
                >
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                studioName && (
                  <span className="border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                    {studioName}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className={[
                    "silk px-4 py-2 text-xs tracking-[0.16em] uppercase",
                    item.key === section
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <button
              onClick={signOut}
              aria-label="Esci"
              className="silk border border-border p-2.5 hover:bg-accent/40"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={[
                "silk flex flex-col items-center gap-1 py-3 text-[0.6rem] tracking-[0.14em] uppercase",
                item.key === section ? "text-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------- entry ------------------------------- */

export function VelunaGestionale({ section }: { section: PlatformSection }) {
  const { studios, selected, selectStudio, isLoading } = usePlatform();

  if (isLoading) {
    return (
      <VelunaShell section={section} studioName={null}>
        <p className="text-sm text-muted-foreground">Carico il tuo studio…</p>
      </VelunaShell>
    );
  }

  if (studios.length === 0 || !selected) {
    return (
      <VelunaShell section={section} studioName={null}>
        <div className="border border-border bg-card p-8 text-center">
          <h2 className="font-display text-3xl font-light">Nessuno studio collegato</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Accedi prima dal sito del tuo studio (registrazione o login): il tuo ruolo verrà creato
            lì e poi ritroverai lo studio qui nella console Veluna.
          </p>
        </div>
      </VelunaShell>
    );
  }

  return (
    <VelunaShell
      section={section}
      studioName={selected.name}
      studios={studios}
      selectedId={selected.id}
      onSelectStudio={selectStudio}
    >
      {section === "agenda" && <VelunaAgenda studioId={selected.id} />}
      {section === "clienti" && <VelunaClienti studioId={selected.id} />}
      {section === "orari" && <VelunaOrari studioId={selected.id} />}
      {section === "servizi" && <VelunaServizi studioId={selected.id} />}
    </VelunaShell>
  );
}

/* ------------------------------- agenda ------------------------------- */

type View = "day" | "week";

function VelunaAgenda({ studioId }: { studioId: string }) {
  const qc = useQueryClient();
  const fetchAppointments = useServerFn(platformListAppointments);
  const fetchServices = useServerFn(platformListServices);
  const update = useServerFn(platformUpdateAppointment);
  const createManual = useServerFn(platformCreateAppointment);
  const removeFn = useServerFn(platformDeleteAppointment);

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
    queryKey: ["platform-appointments", studioId, range[0], range[1]],
    queryFn: () => fetchAppointments({ data: { studioId, from: range[0], to: range[1] } }),
  });
  const { data: servicesData } = useQuery({
    queryKey: ["platform-services", studioId],
    queryFn: () => fetchServices({ data: { studioId } }),
  });

  const all = useMemo(
    () => [...(data?.appointments ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [data],
  );
  const today = dayKey(new Date());
  const todayCount = all.filter(
    (a) => dayKey(a.starts_at) === today && a.status !== "cancelled",
  ).length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform-appointments", studioId] });
    qc.invalidateQueries({ queryKey: ["platform-clients", studioId] });
  };

  const mutate = useMutation({
    mutationFn: (input: {
      id: string;
      status?: "confirmed" | "cancelled" | "completed";
      day?: string;
      time?: string;
    }) => update({ data: { studioId, ...input } }),
    onSuccess: () => {
      invalidate();
      setMovingId(null);
      toast.success("Appuntamento aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { studioId, id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Appuntamento eliminato definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shift = (delta: number) => {
    setAnchor(addDaysKey(anchor, view === "day" ? delta : delta * 7));
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-border bg-card p-5">
          <p className="eyebrow">Appuntamenti oggi</p>
          <p className="mt-2 font-display text-3xl font-light">{todayCount}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Telefono o walk-in, senza link.</p>
          <button
            onClick={() => setCreating((v) => !v)}
            className="silk inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase text-primary-foreground"
          >
            <Plus className="size-3.5" /> {creating ? "Chiudi" : "Crea"}
          </button>
        </div>
      </div>

      {creating && (
        <VelunaCreateForm
          studioId={studioId}
          services={servicesData?.services ?? []}
          defaultDay={anchor}
          onDone={() => {
            setCreating(false);
            invalidate();
          }}
          create={(input) => createManual({ data: { studioId, ...input } })}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border border-border bg-card p-1">
          {(["day", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                "silk px-4 py-2 text-[0.65rem] tracking-[0.18em] uppercase",
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
            className="silk border border-border p-2 hover:bg-accent/40"
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
            className="silk border border-border p-2 hover:bg-accent/40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carico l'agenda…</p>}
        {!isLoading && all.length === 0 && (
          <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nessun appuntamento in questo periodo.
          </div>
        )}
        {all.map((a) => (
          <article key={a.id} className="animate-rise border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow capitalize">{formatDateLong(a.starts_at)}</p>
                <p className="mt-1 font-display text-2xl font-light">
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
                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 size-3.5" /> {a.notes}
                  </p>
                )}
              </div>
              <span
                className={[
                  "inline-block px-3 py-1 text-[0.6rem] tracking-[0.16em] uppercase",
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

            <div className="mt-4 flex flex-wrap gap-2">
              {a.status !== "confirmed" && (
                <MiniButton onClick={() => mutate.mutate({ id: a.id, status: "confirmed" })}>
                  Conferma
                </MiniButton>
              )}
              {a.status === "confirmed" && (
                <MiniButton onClick={() => mutate.mutate({ id: a.id, status: "completed" })}>
                  Completato
                </MiniButton>
              )}
              <MiniButton
                onClick={() => {
                  setMovingId(movingId === a.id ? null : a.id);
                  setMoveDay(dayKey(a.starts_at));
                  setMoveTime(formatTime(a.starts_at));
                }}
              >
                Sposta
              </MiniButton>
              {a.status !== "cancelled" && (
                <MiniButton
                  tone="danger"
                  onClick={() => mutate.mutate({ id: a.id, status: "cancelled" })}
                >
                  Cancella
                </MiniButton>
              )}
              <MiniButton
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
              </MiniButton>
            </div>

            {movingId === a.id && (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <label className="text-xs">
                  <span className="eyebrow">Data</span>
                  <input
                    type="date"
                    value={moveDay}
                    onChange={(e) => setMoveDay(e.target.value)}
                    className="mt-1 block border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs">
                  <span className="eyebrow">Ora</span>
                  <input
                    type="time"
                    value={moveTime}
                    onChange={(e) => setMoveTime(e.target.value)}
                    className="mt-1 block border border-border bg-card px-3 py-2 text-sm"
                  />
                </label>
                <MiniButton
                  onClick={() => mutate.mutate({ id: a.id, day: moveDay, time: moveTime })}
                >
                  Salva spostamento
                </MiniButton>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function VelunaCreateForm({
  studioId: _studioId,
  services,
  defaultDay,
  onDone,
  create,
}: {
  studioId: string;
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

  const inputCls = "mt-1 block w-full border border-border bg-card px-3 py-2 text-sm outline-none";

  return (
    <div className="mt-4 space-y-3 border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="eyebrow">Servizio</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={inputCls}
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
            className={inputCls}
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Telefono</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="+39 333 1234567"
            className={inputCls}
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Email (per la conferma)</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            placeholder="cliente@email.it"
            className={inputCls}
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Data</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Ora</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block text-xs">
        <span className="eyebrow">Note</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opzionale"
          className={inputCls}
        />
      </label>
      <button
        disabled={!canSave}
        onClick={submit}
        className="silk bg-primary px-6 py-3 text-[0.65rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
      >
        {saving ? "Salvo…" : "Salva appuntamento"}
      </button>
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "silk border px-4 py-2 text-[0.62rem] tracking-[0.18em] uppercase",
        tone === "danger"
          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
          : "border-border hover:bg-accent/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------- clienti ------------------------------- */

function VelunaClienti({ studioId }: { studioId: string }) {
  const fetchClients = useServerFn(platformListClients);
  const removeFn = useServerFn(platformDeleteClient);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-clients", studioId],
    queryFn: () => fetchClients({ data: { studioId } }),
  });
  const [q, setQ] = useState("");

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { studioId, id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-clients", studioId] });
      qc.invalidateQueries({ queryKey: ["platform-appointments", studioId] });
      toast.success("Cliente eliminato definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const clients = data?.clients ?? [];
    const appts = data?.appointments ?? [];
    return clients
      .map((c) => {
        const mine = appts.filter((a) => a.client_phone === c.phone && a.status !== "cancelled");
        const last =
          mine
            .map((a) => a.starts_at)
            .sort()
            .at(-1) ?? null;
        return { ...c, visits: mine.length, last };
      })
      .filter(
        (c) => !q || c.full_name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q),
      )
      .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  }, [data, q]);

  return (
    <div>
      <div className="flex items-center gap-3 border border-border bg-card px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome o telefono"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      {q && (
        <p className="mt-3 text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "cliente trovato" : "clienti trovati"}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carico i clienti…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nessun cliente trovato.
          </div>
        )}
        {rows.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-5"
          >
            <div>
              <p className="font-display text-xl font-light">{c.full_name}</p>
              <a
                href={`tel:${c.phone}`}
                className="silk mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Phone className="size-3.5" /> {c.phone}
              </a>
              {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Eliminare definitivamente ${c.full_name} e tutti i suoi appuntamenti? L'operazione non si può annullare.`,
                    )
                  )
                    remove.mutate(c.id);
                }}
                aria-label={`Elimina ${c.full_name}`}
                title="Elimina definitivamente (GDPR)"
                className="silk border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
              <div className="text-right text-sm">
                <p>
                  {c.visits} {c.visits === 1 ? "visita" : "visite"}
                </p>
                {c.last && (
                  <p className="text-xs text-muted-foreground">Ultima: {formatDateShort(c.last)}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- orari ------------------------------- */

const ORDER = [1, 2, 3, 4, 5, 6, 0];

function VelunaOrari({ studioId }: { studioId: string }) {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(platformGetAvailability);
  const saveRule = useServerFn(platformSaveAvailabilityRule);
  const addDay = useServerFn(platformAddClosure);
  const delDay = useServerFn(platformRemoveClosure);

  const { data } = useQuery({
    queryKey: ["platform-availability", studioId],
    queryFn: () => fetchSettings({ data: { studioId } }),
  });
  const [closureDay, setClosureDay] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform-availability", studioId] });
    qc.invalidateQueries({ queryKey: ["platform-appointments", studioId] });
  };

  const ruleMutation = useMutation({
    mutationFn: (input: {
      weekday: number;
      start_time: string;
      end_time: string;
      break_start: string | null;
      break_end: string | null;
      closed: boolean;
    }) => saveRule({ data: { studioId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Orari aggiornati");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closureMutation = useMutation({
    mutationFn: () => addDay({ data: { studioId, day: closureDay, reason: closureReason } }),
    onSuccess: () => {
      setClosureDay("");
      setClosureReason("");
      invalidate();
      toast.success("Chiusura aggiunta");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => delDay({ data: { studioId, id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Chiusura rimossa");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rules = data?.rules ?? [];

  return (
    <div>
      <div className="space-y-3">
        {ORDER.map((wd) => {
          const rule = rules.find((r) => r.weekday === wd);
          return (
            <VelunaRuleRow
              key={`${studioId}-${wd}`}
              weekday={wd}
              rule={rule}
              onSave={(payload) => ruleMutation.mutate(payload)}
            />
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-light">Giorni di chiusura</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3 border border-border bg-card p-5">
          <label className="text-xs">
            <span className="eyebrow">Data</span>
            <input
              type="date"
              value={closureDay}
              onChange={(e) => setClosureDay(e.target.value)}
              className="mt-1 block border border-border bg-card px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="eyebrow">Motivo</span>
            <input
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="Ferie, corso, festivo…"
              className="mt-1 block border border-border bg-card px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={!closureDay || closureMutation.isPending}
            onClick={() => closureMutation.mutate()}
            className="silk bg-primary px-5 py-2.5 text-[0.65rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
          >
            Aggiungi
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {(data?.closures ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border border-border bg-card px-5 py-4"
            >
              <div>
                <p className="text-sm capitalize">{formatDateLong(`${c.day}T12:00:00Z`)}</p>
                {c.reason && <p className="text-xs text-muted-foreground">{c.reason}</p>}
              </div>
              <button
                onClick={() => removeMutation.mutate(c.id)}
                aria-label="Rimuovi chiusura"
                className="silk border border-border p-2 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type AvailabilityRule = {
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  closed: boolean;
};

function VelunaRuleRow({
  weekday,
  rule,
  onSave,
}: {
  weekday: number;
  rule: AvailabilityRule | undefined;
  onSave: (payload: AvailabilityRule) => void;
}) {
  const [state, setState] = useState<AvailabilityRule>(() => ({
    weekday,
    start_time: (rule?.start_time ?? "09:30").slice(0, 5),
    end_time: (rule?.end_time ?? "19:00").slice(0, 5),
    break_start: rule?.break_start ? rule.break_start.slice(0, 5) : null,
    break_end: rule?.break_end ? rule.break_end.slice(0, 5) : null,
    closed: rule?.closed ?? false,
  }));

  // Sincronizza il form quando arrivano i dati dal server o si cambia studio.
  useEffect(() => {
    setState({
      weekday,
      start_time: (rule?.start_time ?? "09:30").slice(0, 5),
      end_time: (rule?.end_time ?? "19:00").slice(0, 5),
      break_start: rule?.break_start ? rule.break_start.slice(0, 5) : null,
      break_end: rule?.break_end ? rule.break_end.slice(0, 5) : null,
      closed: rule?.closed ?? false,
    });
  }, [weekday, rule?.start_time, rule?.end_time, rule?.break_start, rule?.break_end, rule?.closed]);

  return (
    <div className="border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-xl font-light">
          {WEEKDAY_LABELS[weekday] ?? `Giorno ${weekday}`}
        </p>
        <label className="flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-muted-foreground">
          <input
            type="checkbox"
            checked={state.closed}
            onChange={(e) => setState({ ...state, closed: e.target.checked })}
          />
          Chiuso
        </label>
      </div>

      {!state.closed && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <VelunaTimeInput
            label="Apertura"
            value={state.start_time}
            onChange={(v) => setState({ ...state, start_time: v })}
          />
          <VelunaTimeInput
            label="Chiusura"
            value={state.end_time}
            onChange={(v) => setState({ ...state, end_time: v })}
          />
          <VelunaTimeInput
            label="Pausa da"
            value={state.break_start ?? ""}
            onChange={(v) => setState({ ...state, break_start: v || null })}
          />
          <VelunaTimeInput
            label="Pausa a"
            value={state.break_end ?? ""}
            onChange={(v) => setState({ ...state, break_end: v || null })}
          />
        </div>
      )}

      <button
        onClick={() => onSave(state)}
        className="silk mt-4 border border-border px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase hover:bg-accent/40"
      >
        Salva
      </button>
    </div>
  );
}

function VelunaTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs">
      <span className="eyebrow">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full border border-border bg-card px-3 py-2 text-sm"
      />
    </label>
  );
}

/* ------------------------------- servizi ------------------------------- */

function VelunaServizi({ studioId }: { studioId: string }) {
  const qc = useQueryClient();
  const fetchServices = useServerFn(platformListServices);
  const save = useServerFn(platformSaveService);
  const remove = useServerFn(platformDeleteService);

  const { data } = useQuery({
    queryKey: ["platform-services", studioId],
    queryFn: () => fetchServices({ data: { studioId } }),
  });
  const [draft, setDraft] = useState({ name: "", price: "", duration: "60" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["platform-services", studioId] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: {
      id?: string;
      name: string;
      description: string;
      price_cents: number;
      duration_minutes: number;
      active: boolean;
      sort_order: number;
    }) => save({ data: { studioId, ...input } }),
    onSuccess: () => {
      invalidate();
      toast.success("Servizio salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { studioId, id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Servizio disattivato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 border border-border bg-card p-5">
        <label className="text-xs">
          <span className="eyebrow">Nuovo servizio</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nome"
            className="mt-1 block border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Prezzo €</span>
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            inputMode="decimal"
            placeholder="45"
            className="mt-1 block w-24 border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Durata min</span>
          <input
            value={draft.duration}
            onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            inputMode="numeric"
            className="mt-1 block w-24 border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <button
          disabled={!draft.name || !draft.price}
          onClick={() => {
            saveMutation.mutate({
              name: draft.name,
              description: "",
              price_cents: Math.round(Number(draft.price.replace(",", ".")) * 100),
              duration_minutes: Number(draft.duration) || 60,
              active: true,
              sort_order: (data?.services?.length ?? 0) + 1,
            });
            setDraft({ name: "", price: "", duration: "60" });
          }}
          className="silk inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Aggiungi
        </button>
      </div>

      {(data?.services ?? []).map((s) => (
        <VelunaServiceRow
          key={s.id}
          service={s}
          onSave={(payload) => saveMutation.mutate(payload)}
          onRemove={() => removeMutation.mutate(s.id)}
        />
      ))}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" /> Nome, prezzo e durata appaiono subito sul sito pubblico
        dello studio.
      </p>
    </div>
  );
}

function VelunaServiceRow({
  service,
  onSave,
  onRemove,
}: {
  service: {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    duration_minutes: number;
    active: boolean;
    sort_order: number;
  };
  onSave: (payload: {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    duration_minutes: number;
    active: boolean;
    sort_order: number;
  }) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState((service.price_cents / 100).toString());
  const [duration, setDuration] = useState(String(service.duration_minutes));

  return (
    <div
      className={["border border-border bg-card p-5", service.active ? "" : "opacity-60"].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label className="text-xs">
          <span className="eyebrow">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Prezzo €</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Durata min</span>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            inputMode="numeric"
            className="mt-1 block w-full border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onSave({
                id: service.id,
                name,
                description: service.description,
                price_cents: Math.round(Number(price.replace(",", ".")) * 100),
                duration_minutes: Number(duration) || service.duration_minutes,
                active: service.active,
                sort_order: service.sort_order,
              })
            }
            className="silk border border-border px-4 py-2 text-[0.6rem] tracking-[0.18em] uppercase hover:bg-accent/40"
          >
            Salva
          </button>
          <button
            onClick={onRemove}
            aria-label="Disattiva servizio"
            className="silk border border-border p-2 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
