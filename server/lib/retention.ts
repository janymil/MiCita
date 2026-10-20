import { daysBetween } from "./dates.js";

/**
 * "Ya te toca corte": find clients whose last completed visit is older than
 * the owner's retention window. Pure so the numbers are testable and the same
 * logic can later power campaigns/notifications.
 */

export interface RetentionClientInput {
  id: number;
  name: string;
  phone?: string | null;
}

export interface RetentionAppointmentInput {
  clientId: number;
  date: string;
  status: string;
  price?: string | number | null;
}

export interface LapsedClient {
  id: number;
  name: string;
  phone: string | null;
  lastVisitDate: string;
  daysSince: number;
  visits: number;
  totalSpent: number;
}

function toAmount(value: string | number | null | undefined): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(num) ? num : 0;
}

export function findLapsedClients(params: {
  clients: RetentionClientInput[];
  appointments: RetentionAppointmentInput[];
  days: number;
  todayISO: string;
  limit?: number;
}): LapsedClient[] {
  const { clients, appointments, todayISO } = params;
  const threshold = Math.max(1, Math.round(params.days));
  const limit = params.limit ?? 50;

  const stats = new Map<number, { lastVisitDate: string; visits: number; totalSpent: number }>();

  for (const appointment of appointments) {
    if (appointment.status !== "completed") continue;
    if (!appointment.date || appointment.date > todayISO) continue;

    const entry = stats.get(appointment.clientId) ?? {
      lastVisitDate: appointment.date,
      visits: 0,
      totalSpent: 0,
    };
    entry.visits += 1;
    entry.totalSpent += toAmount(appointment.price);
    if (appointment.date > entry.lastVisitDate) entry.lastVisitDate = appointment.date;
    stats.set(appointment.clientId, entry);
  }

  const lapsed: LapsedClient[] = [];
  for (const client of clients) {
    const entry = stats.get(client.id);
    if (!entry) continue; // a brand-new client is not "lapsed"

    const daysSince = daysBetween(entry.lastVisitDate, todayISO);
    if (daysSince < threshold) continue;

    lapsed.push({
      id: client.id,
      name: client.name,
      phone: client.phone?.trim() || null,
      lastVisitDate: entry.lastVisitDate,
      daysSince,
      visits: entry.visits,
      totalSpent: Math.round(entry.totalSpent * 100) / 100,
    });
  }

  return lapsed
    .sort((a, b) => (b.daysSince !== a.daysSince ? b.daysSince - a.daysSince : a.name.localeCompare(b.name)))
    .slice(0, limit);
}
