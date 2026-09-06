import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { StaffShell, StatCard } from "@/components/staff-shell";
import { useStaff } from "@/hooks/use-staff";
import {
  deleteService,
  listAppointments,
  listClients,
  listServicesAdmin,
  listStaffUsers,
  saveService,
  setUserRole,
  updateStudioSettings,
} from "@/lib/staff.functions";
import { dayKey, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/gestionale")({
  head: () => ({
    meta: [
      { title: "Gestionale — Studio Nails" },
      { name: "description", content: "Fatturato, clienti, servizi, utenti e impostazioni." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManagementPage,
});

type Tab = "overview" | "services" | "users" | "settings";

function ManagementPage() {
  const { isOwner, studio, isLoading } = useStaff();
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) {
    return (
      <StaffShell title="Gestionale">
        <p className="text-sm text-muted-foreground">Carico i dati…</p>
      </StaffShell>
    );
  }

  if (!isOwner) {
    return (
      <StaffShell title="Gestionale">
        <div className="surface-card p-8 text-center">
          <h2 className="font-display text-2xl">Area riservata al proprietario</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chiedi al proprietario dello studio di assegnarti questo permesso.
          </p>
        </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell title="Gestionale" subtitle={studio?.name ?? undefined}>
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {(
          [
            ["overview", "Panoramica"],
            ["services", "Servizi"],
            ["users", "Utenti"],
            ["settings", "Attività"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={[
              "silk rounded-full px-4 py-2 text-[0.62rem] tracking-[0.18em] uppercase",
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "services" && <ServicesAdmin />}
        {tab === "users" && <UsersAdmin />}
        {tab === "settings" && <SettingsAdmin />}
      </div>
    </StaffShell>
  );
}

function Overview() {
  const fetchAppointments = useServerFn(listAppointments);
  const fetchClients = useServerFn(listClients);

  const today = dayKey(new Date());
  const from = `${today.slice(0, 4)}-01-01`;
  const to = `${today.slice(0, 4)}-12-31`;

  const { data } = useQuery({
    queryKey: ["appointments-year", from],
    queryFn: () => fetchAppointments({ data: { from, to } }),
  });
  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  const appts = useMemo(
    () => (data?.appointments ?? []).filter((a) => a.status !== "cancelled"),
    [data],
  );

  const month = today.slice(0, 7);
  const monthAppts = appts.filter((a) => dayKey(a.starts_at).startsWith(month));
  const revenueMonth = monthAppts.reduce((s, a) => s + a.price_cents, 0);
  const revenueYear = appts.reduce((s, a) => s + a.price_cents, 0);
  const avg = appts.length ? Math.round(revenueYear / appts.length) : 0;

  const clients = clientsData?.clients ?? [];
  const newClients = clients.filter((c) => c.created_at.slice(0, 7) === month).length;
  const byPhone = new Map<string, number>();
  for (const a of appts) byPhone.set(a.client_phone, (byPhone.get(a.client_phone) ?? 0) + 1);
  const recurring = [...byPhone.values()].filter((n) => n > 1).length;

  const byService = new Map<string, { count: number; revenue: number }>();
  for (const a of appts) {
    const key = a.services?.name ?? "Altro";
    const prev = byService.get(key) ?? { count: 0, revenue: 0 };
    byService.set(key, { count: prev.count + 1, revenue: prev.revenue + a.price_cents });
  }
  const topServices = [...byService.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const maxCount = topServices[0]?.[1].count ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fatturato mese" value={formatPrice(revenueMonth)} />
        <StatCard label="Fatturato anno" value={formatPrice(revenueYear)} />
        <StatCard label="Prezzo medio" value={formatPrice(avg)} />
        <StatCard label="Appuntamenti anno" value={String(appts.length)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Clienti totali" value={String(clients.length)} />
        <StatCard label="Nuovi questo mese" value={String(newClients)} />
        <StatCard label="Clienti ricorrenti" value={String(recurring)} />
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-2xl">Servizi più venduti</h2>
        <div className="mt-4 space-y-3">
          {topServices.length === 0 && (
            <p className="text-sm text-muted-foreground">Ancora nessun dato.</p>
          )}
          {topServices.map(([name, v]) => (
            <div key={name}>
              <div className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted-foreground">
                  {v.count} · {formatPrice(v.revenue)}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.round((v.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesAdmin() {
  const qc = useQueryClient();
  const fetchServices = useServerFn(listServicesAdmin);
  const save = useServerFn(saveService);
  const remove = useServerFn(deleteService);

  const { data } = useQuery({ queryKey: ["services-admin"], queryFn: () => fetchServices() });
  const [draft, setDraft] = useState({ name: "", price: "", duration: "60" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["services-admin"] });
    qc.invalidateQueries({ queryKey: ["studio"] });
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
    }) => save({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Servizio salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Servizio disattivato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-end gap-3 p-5">
        <label className="text-xs">
          <span className="eyebrow">Nuovo servizio</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nome"
            className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Prezzo €</span>
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            inputMode="decimal"
            placeholder="45"
            className="mt-1 block w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Durata min</span>
          <input
            value={draft.duration}
            onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            inputMode="numeric"
            className="mt-1 block w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <button
          disabled={!draft.name || !draft.price}
          onClick={() => {
            saveMutation.mutate({
              name: draft.name,
              description: "",
              price_cents: Math.round(Number(draft.price.replace(",", ".")) * 100),
              duration_minutes: Number(draft.duration),
              active: true,
              sort_order: (data?.services?.length ?? 0) + 1,
            });
            setDraft({ name: "", price: "", duration: "60" });
          }}
          className="silk inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Aggiungi
        </button>
      </div>

      {(data?.services ?? []).map((s) => (
        <ServiceRow
          key={s.id}
          service={s}
          onSave={(payload) => saveMutation.mutate(payload)}
          onRemove={() => removeMutation.mutate(s.id)}
        />
      ))}
    </div>
  );
}

function ServiceRow({
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
  const [description, setDescription] = useState(service.description);
  const [price, setPrice] = useState((service.price_cents / 100).toString());
  const [duration, setDuration] = useState(String(service.duration_minutes));

  return (
    <div className={["surface-card p-5", service.active ? "" : "opacity-60"].join(" ")}>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label className="text-xs">
          <span className="eyebrow">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Prezzo €</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="eyebrow">Durata</span>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={() =>
              onSave({
                id: service.id,
                name,
                description,
                price_cents: Math.round(Number(price.replace(",", ".")) * 100),
                duration_minutes: Number(duration),
                active: service.active,
                sort_order: service.sort_order,
              })
            }
            className="silk rounded-full border border-border px-4 py-2 text-[0.6rem] tracking-[0.18em] uppercase hover:bg-accent/40"
          >
            Salva
          </button>
          <button
            onClick={onRemove}
            aria-label="Disattiva servizio"
            className="silk rounded-full border border-border p-2 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <label className="mt-3 block text-xs">
        <span className="eyebrow">Descrizione</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}

function UsersAdmin() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listStaffUsers);
  const setRole = useServerFn(setUserRole);
  const { data } = useQuery({ queryKey: ["staff-users"], queryFn: () => fetchUsers() });

  const mutation = useMutation({
    mutationFn: (input: { userId: string; role: "owner" | "artist" }) => setRole({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("Ruolo aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {(data?.profiles ?? []).map((p) => {
        const role = data?.roles.find((r) => r.user_id === p.id)?.role ?? "artist";
        return (
          <div
            key={p.id}
            className="surface-card flex flex-wrap items-center justify-between gap-3 p-5"
          >
            <div>
              <p className="font-display text-xl">{p.full_name || "Senza nome"}</p>
              <p className="text-xs text-muted-foreground">
                {role === "owner" ? "Proprietario" : "Nail artist"}
              </p>
            </div>
            <div className="flex gap-2">
              {(["artist", "owner"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => mutation.mutate({ userId: p.id, role: r })}
                  className={[
                    "silk rounded-full px-4 py-2 text-[0.6rem] tracking-[0.18em] uppercase",
                    role === r
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-accent/40",
                  ].join(" ")}
                >
                  {r === "owner" ? "Proprietario" : "Nail artist"}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Nuovi membri: falli registrare dalla pagina di accesso, poi assegna qui il ruolo.
      </p>
    </div>
  );
}

function SettingsAdmin() {
  const qc = useQueryClient();
  const { studio } = useStaff();
  const update = useServerFn(updateStudioSettings);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    instagram: "",
    about: "",
    slot_interval_minutes: 30,
  });
  const [ready, setReady] = useState(false);

  if (studio && !ready) {
    setReady(true);
    setForm({
      name: studio.name ?? "",
      phone: studio.phone ?? "",
      address: studio.address ?? "",
      instagram: studio.instagram ?? "",
      about: studio.about ?? "",
      slot_interval_minutes: studio.slot_interval_minutes ?? 30,
    });
  }

  const mutation = useMutation({
    mutationFn: () => update({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-session"] });
      qc.invalidateQueries({ queryKey: ["studio"] });
      toast.success("Impostazioni salvate");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-card space-y-3 p-6">
      <TextField
        label="Nome attività"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
      />
      <TextField
        label="Telefono"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />
      <TextField
        label="Indirizzo"
        value={form.address}
        onChange={(v) => setForm({ ...form, address: v })}
      />
      <TextField
        label="Instagram"
        value={form.instagram}
        onChange={(v) => setForm({ ...form, instagram: v })}
      />
      <label className="block text-xs">
        <span className="eyebrow">Descrizione</span>
        <textarea
          value={form.about}
          onChange={(e) => setForm({ ...form, about: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </label>
      <TextField
        label="Intervallo slot (minuti)"
        value={String(form.slot_interval_minutes)}
        onChange={(v) => setForm({ ...form, slot_interval_minutes: Number(v) || 30 })}
      />
      <button
        onClick={() => mutation.mutate()}
        className="silk rounded-full bg-primary px-6 py-3 text-[0.65rem] tracking-[0.2em] uppercase text-primary-foreground"
      >
        Salva impostazioni
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="eyebrow">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
      />
    </label>
  );
}
