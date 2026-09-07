import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Phone, Search, Trash2 } from "lucide-react";

import { StaffShell } from "@/components/staff-shell";
import { useBrand } from "@/lib/brand";
import { VelunaGestionale } from "@/themes/veluna-staff";
import { deleteClient, listClients } from "@/lib/staff.functions";
import { formatDateShort } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/clienti")({
  head: () => ({
    meta: [
      { title: "Clienti" },
      { name: "description", content: "Rubrica clienti con storico visite." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsRoute,
});

function ClientsRoute() {
  const { theme } = useBrand();
  if (theme === "veluna") return <VelunaGestionale section="clienti" />;
  return <ClientsPage />;
}

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const removeFn = useServerFn(deleteClient);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const [q, setQ] = useState("");

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cliente eliminato definitivamente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Piano free: rubrica base — nome, telefono, numero visite, ultima visita.
  // Niente spesa, niente segmentazione, niente analisi.
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
    <StaffShell title="Clienti" subtitle="Rubrica e storico visite">
      <div className="surface-card flex items-center gap-3 px-4 py-3">
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
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nessun cliente trovato.
          </div>
        )}
        {rows.map((c) => (
          <div
            key={c.id}
            className="surface-card flex flex-wrap items-center justify-between gap-3 p-5"
          >
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
                className="silk rounded-full border border-border p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
    </StaffShell>
  );
}
