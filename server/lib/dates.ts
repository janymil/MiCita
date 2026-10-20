/**
 * Date helpers for MiCita.
 *
 * The product is sold in Peru, so every business-facing calendar decision must be
 * made in `America/Lima` (UTC-5, no DST), never in the server's local time or UTC.
 * Appointment dates are stored as `YYYY-MM-DD` strings and times as `HH:MM`, which
 * lets us compare them lexicographically and avoids every class of timezone bug.
 */

export const LIMA_TZ = "America/Lima";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LIMA_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Calendar day in Lima as `YYYY-MM-DD`. */
export function limaDateISO(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return dateFormatter.format(date);
}

/** Wall-clock time in Lima as `HH:MM`. */
export function limaTimeHM(date: Date = new Date()): string {
  return timeFormatter.format(date);
}

/** Sortable instant key in Lima, e.g. `2026-10-19T14:30`. */
export function limaNowKey(date: Date = new Date()): string {
  return `${limaDateISO(date)}T${limaTimeHM(date)}`;
}

/** Sortable key for an appointment (`YYYY-MM-DDTHH:MM`). */
export function appointmentKey(date: string, time: string): string {
  return `${date}T${(time || "00:00").slice(0, 5)}`;
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Parse `YYYY-MM-DD` into a Date at local noon (immune to DST edges). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonthsISO(iso: string, months: number): string {
  const date = parseISODate(iso);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}

/** Monday-first week start for a given ISO date. */
export function startOfWeekISO(iso: string): string {
  const date = parseISODate(iso);
  const dow = date.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

export function startOfMonthISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthISO(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return toISODate(new Date(y, m, 0, 12, 0, 0, 0));
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO).getTime();
  const to = parseISODate(toISO).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** Inclusive list of ISO days between two dates (capped for safety). */
export function eachDayISO(fromISO: string, toISO: string, cap = 400): string[] {
  const days: string[] = [];
  let cursor = fromISO;
  for (let i = 0; i <= daysBetween(fromISO, toISO) && i < cap; i += 1) {
    days.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return days;
}

export type PeriodKey = "thisMonth" | "lastMonth" | "last3Months" | "thisYear" | "last7Days" | "last30Days" | "all";

export interface PeriodRange {
  key: PeriodKey;
  from: string;
  to: string;
  /** Same-length window immediately before `from` (for growth deltas). */
  previousFrom: string;
  previousTo: string;
}

/**
 * Resolve a named period into concrete ISO bounds, plus the previous window of
 * equal length so growth percentages are always comparable.
 */
export function resolvePeriod(period: PeriodKey, todayISO: string = limaDateISO()): PeriodRange {
  let from: string;
  let to: string = todayISO;

  switch (period) {
    case "lastMonth": {
      const firstThisMonth = startOfMonthISO(todayISO);
      from = startOfMonthISO(addDaysISO(firstThisMonth, -1));
      to = addDaysISO(firstThisMonth, -1);
      break;
    }
    case "last3Months":
      from = `${addMonthsISO(todayISO, -3).slice(0, 7)}-01`;
      break;
    case "thisYear":
      from = `${todayISO.slice(0, 4)}-01-01`;
      break;
    case "last7Days":
      from = addDaysISO(todayISO, -6);
      break;
    case "last30Days":
      from = addDaysISO(todayISO, -29);
      break;
    case "all":
      from = "1970-01-01";
      break;
    case "thisMonth":
    default:
      from = startOfMonthISO(todayISO);
      break;
  }

  const span = daysBetween(from, to);
  const previousTo = addDaysISO(from, -1);
  const previousFrom = addDaysISO(previousTo, -span);

  return { key: period, from, to, previousFrom, previousTo };
}

export function isWithinISO(value: string, fromISO: string, toISO: string): boolean {
  return value >= fromISO && value <= toISO;
}

/** Convert a `Date`/timestamp to the Lima calendar day. */
export function toLimaISODate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return limaDateISO(date);
}

/**
 * UTC instants that bound a Lima calendar day.
 *
 * Peru is UTC-5 all year (no DST), so a local day always starts at 05:00 UTC.
 * Used for `timestamp` columns such as `service_transactions.occurred_at`,
 * where `date`/`time` text columns (appointments) are not enough.
 */
export function limaDayBounds(iso: string): { from: Date; to: Date } {
  const from = new Date(`${iso}T05:00:00.000Z`);
  const to = new Date(from.getTime() + 86_400_000);
  return { from, to };
}
