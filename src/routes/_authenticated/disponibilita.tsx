import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { StaffShell } from "@/components/staff-shell";
import { BRAND_NAME } from "@/lib/brand";
import {
  addClosure,
  getAvailabilitySettings,
  removeClosure,
  saveAvailabilityRule,
} from "@/lib/staff.functions";
import { WEEKDAY_LABELS, formatDateLong } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/disponibilita")({
  head: () => ({
    meta: [
      { title: `Disponibilità e chiusure — ${BRAND_NAME}` },
      { name: "description", content: "Orari di apertura, pausa e giorni di chiusura." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AvailabilityPage,
});

const ORDER = [1, 2, 3, 4, 5, 6, 0];

function AvailabilityPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getAvailabilitySettings);
  const saveRule = useServerFn(saveAvailabilityRule);
  const addDay = useServerFn(addClosure);
  const delDay = useServerFn(removeClosure);

  const { data } = useQuery({
    queryKey: ["availability-settings"],
    queryFn: () => fetchSettings(),
  });
  const [closureDay, setClosureDay] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["availability-settings"] });
    qc.invalidateQueries({ queryKey: ["availability"] });
  };

  const ruleMutation = useMutation({
    mutationFn: (input: {
      weekday: number;
      start_time: string;
      end_time: string;
      break_start: string | null;
      break_end: string | null;
      closed: boolean;
    }) => saveRule({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Orari aggiornati");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closureMutation = useMutation({
    mutationFn: () => addDay({ data: { day: closureDay, reason: closureReason } }),
    onSuccess: () => {
      setClosureDay("");
      setClosureReason("");
      invalidate();
      toast.success("Chiusura aggiunta");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => delDay({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Chiusura rimossa");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rules = data?.rules ?? [];

  return (
    <StaffShell title="Disponibilità" subtitle="Orari settimanali, pausa e chiusure">
      <div className="space-y-3">
        {ORDER.map((wd) => {
          const rule = rules.find((r) => r.weekday === wd);
          return (
            <RuleRow
              key={wd}
              weekday={wd}
              rule={rule}
              onSave={(payload) => ruleMutation.mutate(payload)}
            />
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Giorni di chiusura</h2>
        <div className="surface-card mt-4 flex flex-wrap items-end gap-3 p-5">
          <label className="text-xs">
            <span className="eyebrow">Data</span>
            <input
              type="date"
              value={closureDay}
              onChange={(e) => setClosureDay(e.target.value)}
              className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="eyebrow">Motivo</span>
            <input
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="Ferie, corso, festivo…"
              className="mt-1 block rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>
          <button
            disabled={!closureDay || closureMutation.isPending}
            onClick={() => closureMutation.mutate()}
            className="silk rounded-full bg-primary px-5 py-2.5 text-[0.65rem] tracking-[0.2em] uppercase text-primary-foreground disabled:opacity-40"
          >
            Aggiungi
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {(data?.closures ?? []).map((c) => (
            <div
              key={c.id}
              className="surface-card flex items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="text-sm capitalize">{formatDateLong(`${c.day}T12:00:00Z`)}</p>
                {c.reason && <p className="text-xs text-muted-foreground">{c.reason}</p>}
              </div>
              <button
                onClick={() => removeMutation.mutate(c.id)}
                aria-label="Rimuovi chiusura"
                className="silk rounded-full border border-border p-2 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </StaffShell>
  );
}

type Rule = {
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  closed: boolean;
};

function RuleRow({
  weekday,
  rule,
  onSave,
}: {
  weekday: number;
  rule: Rule | undefined;
  onSave: (payload: Rule) => void;
}) {
  const [state, setState] = useState<Rule>({
    weekday,
    start_time: (rule?.start_time ?? "09:30").slice(0, 5),
    end_time: (rule?.end_time ?? "19:00").slice(0, 5),
    break_start: rule?.break_start ? rule.break_start.slice(0, 5) : null,
    break_end: rule?.break_end ? rule.break_end.slice(0, 5) : null,
    closed: rule?.closed ?? false,
  });

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-xl">{WEEKDAY_LABELS[weekday]}</p>
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
          <TimeInput
            label="Apertura"
            value={state.start_time}
            onChange={(v) => setState({ ...state, start_time: v })}
          />
          <TimeInput
            label="Chiusura"
            value={state.end_time}
            onChange={(v) => setState({ ...state, end_time: v })}
          />
          <TimeInput
            label="Pausa da"
            value={state.break_start ?? ""}
            onChange={(v) => setState({ ...state, break_start: v || null })}
          />
          <TimeInput
            label="Pausa a"
            value={state.break_end ?? ""}
            onChange={(v) => setState({ ...state, break_end: v || null })}
          />
        </div>
      )}

      <button
        onClick={() => onSave(state)}
        className="silk mt-4 rounded-full border border-border px-5 py-2.5 text-[0.62rem] tracking-[0.2em] uppercase hover:bg-accent/40"
      >
        Salva
      </button>
    </div>
  );
}

function TimeInput({
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
        className="mt-1 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
      />
    </label>
  );
}
