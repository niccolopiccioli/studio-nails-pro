import { ChevronLeft, ChevronRight } from "lucide-react";

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

export function BookingCalendar({
  month,
  onMonthChange,
  days,
  selected,
  onSelect,
  loading,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  days: { day: string; open: boolean }[];
  selected: string | null;
  onSelect: (day: string) => void;
  loading?: boolean;
}) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const label = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);
  const offset = (first.getUTCDay() + 6) % 7;

  const shift = (delta: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    onMonthChange(d.toISOString().slice(0, 7));
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <button
          aria-label="Mese precedente"
          onClick={() => shift(-1)}
          className="silk rounded-full border border-border p-2 hover:bg-accent/40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display text-xl capitalize">{label}</p>
        <button
          aria-label="Mese successivo"
          onClick={() => shift(1)}
          className="silk rounded-full border border-border p-2 hover:bg-accent/40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[0.6rem] tracking-[0.2em] uppercase text-muted-foreground">
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const num = Number(d.day.slice(-2));
          const isSelected = selected === d.day;
          return (
            <button
              key={d.day}
              disabled={!d.open || loading}
              onClick={() => onSelect(d.day)}
              className={[
                "silk aspect-square rounded-xl text-sm",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : d.open
                    ? "bg-accent/40 text-foreground hover:bg-accent"
                    : "text-muted-foreground/40",
              ].join(" ")}
            >
              {num}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        I giorni disattivati sono chiusure o giornate già passate.
      </p>
    </div>
  );
}
