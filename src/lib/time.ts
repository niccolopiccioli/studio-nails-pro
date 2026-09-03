export const TZ = "Europe/Rome";
export const STUDIO_ID = "11111111-1111-1111-1111-111111111111";

function partsIn(date: Date, tz = TZ) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return map;
}

function tzOffsetMs(date: Date, tz = TZ) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(
    Number(p["year"]),
    Number(p["month"]) - 1,
    Number(p["day"]),
    Number(p["hour"]) % 24,
    Number(p["minute"]),
    Number(p["second"]),
  );
  return asUtc - date.getTime();
}

/** "2026-05-04" + "14:30" (ora italiana) -> Date UTC corretta */
export function zonedToUtc(dateStr: string, timeStr: string, tz = TZ): Date {
  const naive = Date.parse(`${dateStr}T${timeStr.slice(0, 5)}:00Z`);
  let utc = naive - tzOffsetMs(new Date(naive), tz);
  utc = naive - tzOffsetMs(new Date(utc), tz);
  return new Date(utc);
}

/** Data ISO (YYYY-MM-DD) nel fuso dello studio */
export function dayKey(date: Date | string, tz = TZ): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const p = partsIn(d, tz);
  return `${p["year"]}-${p["month"]}-${p["day"]}`;
}

export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export function formatTime(value: Date | string, tz = TZ): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateLong(value: Date | string, tz = TZ): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(value: Date | string, tz = TZ): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
  }).format(d);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export const WEEKDAY_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

export function addDaysKey(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekKey(dateStr: string): string {
  const wd = weekdayOf(dateStr);
  return addDaysKey(dateStr, wd === 0 ? -6 : 1 - wd);
}
