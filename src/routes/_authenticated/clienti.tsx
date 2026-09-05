import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Phone, Search } from "lucide-react";

import { StaffShell, StatCard } from "@/components/staff-shell";
import { listClients } from "@/lib/staff.functions";
import { formatDateShort, formatPrice } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/clienti")({
  head: () => ({
    meta: [
      { title: "Storico clienti — Studio Nails" },
      { name: "description", content: "Storico clienti, visite e spesa totale." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const clients = data?.clients ?? [];
    const appts = data?.appointments ?? [];
    return clients
      .map((c) => {
        const mine = appts.filter((a) => a.client_phone === c.phone && a.status !== "cancelled");
        const total = mine.reduce((s, a) => s + a.price_cents, 0);
        const last = mine.map((a) => a.starts_at).sort().at(-1) ?? null;
        return { ...c, visits: mine.length, total, last };
      })
      .filter(
        (c) =>
          !q ||
          c.full_name.toLowerCase().includes(q.toLowerCase()) ||
          c.phone.includes(q),
      )
      .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  }, [data, q]);

  const recurring = rows.filter((r) => r.visits > 1).length;

  return (
    <StaffShell title="Clienti" subtitle="Storico e frequenza">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Clienti totali" value={String(rows.length)} />
        <StatCard label="Ricorrenti" value={String(recurring)} hint="Più di una visita" />
        <StatCard
          label="Spesa media"
          value={formatPrice(
            rows.length ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length) : 0,
          )}
        />
      </div>

      <div className="surface-card mt-6 flex items-center gap-3 px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome o telefono"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carico i clienti…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nessun cliente trovato.
          </div>
        )}
        {rows.map((c) => (
          <div key={c.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-display text-xl">{c.full_name}</p>
              <a
                href={`tel:${c.phone}`}
                className="silk mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Phone className="size-3.5" /> {c.phone}
              </a>
              {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
            </div>
            <div className="text-right text-sm">
              <p>
                {c.visits} {c.visits === 1 ? "visita" : "visite"}
              </p>
              <p className="font-display text-xl">{formatPrice(c.total)}</p>
              {c.last && (
                <p className="text-xs text-muted-foreground">
                  Ultima: {formatDateShort(c.last)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </StaffShell>
  );
}
