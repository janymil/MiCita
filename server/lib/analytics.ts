/**
 * Pure, testable business metrics.
 *
 * Rules enforced here (and nowhere else):
 *  1. Money is attributed to the **service date** (`appointment.date`), never to the
 *     moment the booking was created.
 *  2. "Revenue" means the price snapshot of `completed` appointments (facturado).
 *     Money actually collected lives in the `payments` table and is reported
 *     separately as "cobrado".
 *  3. "Today" is the Lima calendar day.
 */

import {
  addDaysISO,
  appointmentKey,
  eachDayISO,
  daysBetween,
  isWithinISO,
  limaDateISO,
  limaNowKey,
  parseISODate,
  resolvePeriod,
  startOfWeekISO,
  type PeriodKey,
  type PeriodRange,
} from "./dates.js";

export const REVENUE_STATUS = "completed" as const;
export const OPEN_STATUSES = ["pending", "confirmed"] as const;
export const CANCELLED_STATUSES = ["cancelled", "no_show"] as const;

export interface AppointmentLike {
  id: number;
  date: string;
  time: string;
  duration?: number | null;
  status: string;
  price?: string | number | null;
  serviceId?: number | null;
  clientId?: number | null;
  createdAt?: Date | string | null;
}

export interface ServiceLike {
  id: number;
  name: string;
  price?: string | number | null;
  duration?: number | null;
  isActive?: boolean | null;
}

export interface ClientLike {
  id: number;
  name: string;
  createdAt?: Date | string | null;
}

export interface PaymentLike {
  amount: string | number;
  status: string;
  paidAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export type Granularity = "day" | "week" | "month";

export interface MetricBucket {
  key: string;
  label: string;
  start: string;
  end: string;
  revenue: number;
  completed: number;
  created: number;
  cancelled: number;
}

export interface ServicePerformance {
  serviceId: number;
  name: string;
  appointments: number;
  completed: number;
  revenue: number;
  share: number;
}

export interface PopularTimeCell {
  day: number; // 0 = Sunday … 6 = Saturday
  hour: number;
  count: number;
  popularity: number; // 0..100
}

export interface FunnelMetrics {
  views: number;
  whatsappClicks: number;
  bookClicks: number;
  bookingsCreated: number;
  bookingsCompleted: number;
  viewToBookingRate: number;
  clickToBookingRate: number;
  bookingToCompletionRate: number;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_LABELS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function money(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isRevenue(appointment: AppointmentLike): boolean {
  return appointment.status === REVENUE_STATUS;
}

export function isCancelled(appointment: AppointmentLike): boolean {
  return (CANCELLED_STATUSES as readonly string[]).includes(appointment.status);
}

/** Statuses that should still occupy a slot. */
export function occupiesSlot(appointment: AppointmentLike): boolean {
  return !isCancelled(appointment);
}

export function growthPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function pickGranularity(period: PeriodRange, requested: Granularity): Granularity {
  const span = daysBetween(period.from, period.to);
  if (requested === "day" && span > 62) return "week";
  if (requested === "week" && span > 400) return "month";
  return requested;
}

function bucketMeta(dateISO: string, granularity: Granularity): { key: string; start: string; end: string; label: string } {
  if (granularity === "day") {
    const date = parseISODate(dateISO);
    return {
      key: dateISO,
      start: dateISO,
      end: dateISO,
      label: `${DAY_LABELS[date.getDay()]} ${dateISO.slice(8, 10)}/${dateISO.slice(5, 7)}`,
    };
  }
  if (granularity === "week") {
    const start = startOfWeekISO(dateISO);
    const end = addDaysISO(start, 6);
    return {
      key: start,
      start,
      end,
      label: `${start.slice(8, 10)}/${start.slice(5, 7)} – ${end.slice(8, 10)}/${end.slice(5, 7)}`,
    };
  }
  const key = dateISO.slice(0, 7);
  const [year, month] = key.split("-").map(Number);
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const start = `${key}-01`;
  const end = addDaysISO(nextMonth, -1);
  const label = new Date(year, month - 1, 1).toLocaleDateString("es-PE", { month: "short", year: "numeric" });
  return { key, start, end, label };
}

/** Calendar day (Lima) on which a booking was created. */
export function createdDay(appointment: Pick<AppointmentLike, "createdAt">): string | null {
  if (!appointment.createdAt) return null;
  const date = appointment.createdAt instanceof Date ? appointment.createdAt : new Date(appointment.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildBuckets(
  appointments: AppointmentLike[],
  period: PeriodRange,
  requestedGranularity: Granularity,
): MetricBucket[] {
  const granularity = pickGranularity(period, requestedGranularity);
  const map = new Map<string, MetricBucket>();

  const ensure = (iso: string): MetricBucket => {
    const meta = bucketMeta(iso, granularity);
    let bucket = map.get(meta.key);
    if (!bucket) {
      bucket = { ...meta, revenue: 0, completed: 0, created: 0, cancelled: 0 };
      map.set(meta.key, bucket);
    }
    return bucket;
  };

  for (const day of eachDayISO(period.from, period.to, 800)) ensure(day);

  for (const appointment of appointments) {
    if (isWithinISO(appointment.date, period.from, period.to)) {
      const bucket = ensure(appointment.date);
      if (isRevenue(appointment)) {
        bucket.revenue += money(appointment.price);
        bucket.completed += 1;
      }
      if (isCancelled(appointment)) bucket.cancelled += 1;
    }
    const createdISO = createdDay(appointment);
    if (createdISO && isWithinISO(createdISO, period.from, period.to)) {
      ensure(createdISO).created += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

export function computeFunnel(
  events: Array<{ type: string }>,
  appointmentsCreated: number,
  completed: number,
): FunnelMetrics {
  const count = (type: string) => events.filter((event) => event.type === type).length;
  const views = count("view");
  const whatsappClicks = count("whatsapp_click");
  const bookClicks = count("book_click");
  return {
    views,
    whatsappClicks,
    bookClicks,
    bookingsCreated: appointmentsCreated,
    bookingsCompleted: completed,
    viewToBookingRate: views > 0 ? (appointmentsCreated / views) * 100 : 0,
    clickToBookingRate: bookClicks > 0 ? (appointmentsCreated / bookClicks) * 100 : 0,
    bookingToCompletionRate: appointmentsCreated > 0 ? (completed / appointmentsCreated) * 100 : 0,
  };
}


/** Matrix of demand by weekday × hour, normalised to 0..100. */
export function computePopularTimes(appointments: AppointmentLike[], windowDays = 120): PopularTimeCell[] {
  const cells = new Map<string, PopularTimeCell>();
  const todayISO = limaDateISO();
  const fromISO = addDaysISO(todayISO, -windowDays);

  for (const appointment of appointments) {
    if (isCancelled(appointment)) continue;
    if (!isWithinISO(appointment.date, fromISO, todayISO)) continue;
    const hour = Number.parseInt((appointment.time || "00:00").slice(0, 2), 10);
    if (!Number.isFinite(hour)) continue;
    const day = parseISODate(appointment.date).getDay();
    const key = `${day}-${hour}`;
    const cell = cells.get(key) ?? { day, hour, count: 0, popularity: 0 };
    cell.count += 1;
    cells.set(key, cell);
  }

  const max = Math.max(1, ...Array.from(cells.values()).map((cell) => cell.count));
  return Array.from(cells.values())
    .map((cell) => ({ ...cell, popularity: Math.round((cell.count / max) * 100) }))
    .sort((a, b) => a.day - b.day || a.hour - b.hour);
}

/** Booked minutes / available minutes for the working hours in the period. */
export function computeOccupancy(
  appointments: AppointmentLike[],
  workingHours: Record<string, { enabled?: boolean; start?: string; end?: string }> | null | undefined,
  period: PeriodRange,
): number {
  if (!workingHours) return 0;
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let availableMinutes = 0;

  for (const day of eachDayISO(period.from, period.to, 400)) {
    const schedule = workingHours[keys[parseISODate(day).getDay()]];
    if (!schedule || schedule.enabled === false) continue;
    const [startH, startM] = (schedule.start || "09:00").split(":").map(Number);
    const [endH, endM] = (schedule.end || "17:00").split(":").map(Number);
    const minutes = endH * 60 + endM - (startH * 60 + startM);
    if (minutes > 0) availableMinutes += minutes;
  }

  const bookedMinutes = appointments
    .filter((appointment) => isWithinISO(appointment.date, period.from, period.to) && occupiesSlot(appointment))
    .reduce((sum, appointment) => sum + (appointment.duration ?? 30), 0);

  if (availableMinutes <= 0) return 0;
  return Math.min(100, (bookedMinutes / availableMinutes) * 100);
}

/** Money actually collected (payments table), independent of appointment revenue. */
export function computeCollected(payments: PaymentLike[], period: PeriodRange): number {
  return payments
    .filter((payment) => {
      if (payment.status !== "approved") return false;
      const raw = payment.paidAt ?? payment.createdAt;
      if (!raw) return false;
      const date = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const iso = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      return isWithinISO(iso, period.from, period.to);
    })
    .reduce((sum, payment) => sum + money(payment.amount), 0);
}


export interface ComputeOptions {
  appointments: AppointmentLike[];
  clients: ClientLike[];
  services: ServiceLike[];
  period: PeriodRange;
  granularity?: Granularity;
  workingHours?: Record<string, { enabled?: boolean; start?: string; end?: string }> | null;
  events?: Array<{ type: string }>;
  clientNames?: Map<number, string>;
  serviceNames?: Map<number, string>;
  nowKey?: string;
}

export interface BusinessMetrics {
  period: PeriodRange;
  granularity: Granularity;
  revenue: number;
  previousRevenue: number;
  revenueGrowth: number | null;
  totalRevenue: number;
  completedAppointments: number;
  previousCompleted: number;
  completedGrowth: number | null;
  appointmentsInPeriod: number;
  appointmentsCreatedInPeriod: number;
  pendingAppointments: number;
  confirmedUpcoming: number;
  confirmedToday: number;
  cancelledInPeriod: number;
  noShowInPeriod: number;
  cancelRate: number;
  noShowRate: number;
  pendingPayments: number;
  averageAppointmentValue: number;
  averageDurationMinutes: number;
  occupancyRate: number;
  totalClients: number;
  newClients: number;
  returningClients: number;
  retentionRate: number;
  totalServices: number;
  serviceBreakdown: ServicePerformance[];
  buckets: MetricBucket[];
  weeklyRevenue: number[];
  weeklyRevenueLabels: string[];
  popularDays: Array<{ day: number; label: string; count: number }>;
  popularHours: Array<{ hour: number; count: number }>;
  popularTimes: PopularTimeCell[];
  upcomingAppointments: Array<AppointmentLike & { clientName: string; serviceName: string }>;
  views: number;
  whatsappClicks: number;
  bookClicks: number;
  viewToBookingRate: number;
  clickToBookingRate: number;
}

export function computeBusinessMetrics(options: ComputeOptions): BusinessMetrics {
  const {
    appointments,
    clients,
    services,
    period,
    workingHours,
    events = [],
    clientNames = new Map<number, string>(),
    serviceNames = new Map<number, string>(),
    nowKey = limaNowKey(),
  } = options;

  const granularity = pickGranularity(period, options.granularity ?? "week");

  const inPeriod = appointments.filter((appointment) => isWithinISO(appointment.date, period.from, period.to));
  const inPrevious = appointments.filter((appointment) =>
    isWithinISO(appointment.date, period.previousFrom, period.previousTo),
  );
  const createdInPeriod = appointments.filter((appointment) => {
    const day = createdDay(appointment);
    return day !== null && isWithinISO(day, period.from, period.to);
  });

  const revenue = inPeriod.filter(isRevenue).reduce((sum, appointment) => sum + money(appointment.price), 0);
  const previousRevenue = inPrevious.filter(isRevenue).reduce((sum, appointment) => sum + money(appointment.price), 0);
  const totalRevenue = appointments.filter(isRevenue).reduce((sum, appointment) => sum + money(appointment.price), 0);

  const completed = inPeriod.filter(isRevenue);
  const previousCompleted = inPrevious.filter(isRevenue).length;
  const cancelled = inPeriod.filter((appointment) => appointment.status === "cancelled").length;
  const noShow = inPeriod.filter((appointment) => appointment.status === "no_show").length;
  const decided = completed.length + cancelled + noShow;

  const upcomingOpen = appointments.filter(
    (appointment) =>
      (OPEN_STATUSES as readonly string[]).includes(appointment.status) &&
      appointmentKey(appointment.date, appointment.time) >= nowKey,
  );

  const todayISO = limaDateISO();
  const confirmedToday = appointments.filter(
    (appointment) => appointment.date === todayISO && appointment.status === "confirmed",
  ).length;

  const newClients = clients.filter((client) => {
    const day = createdDay({ createdAt: client.createdAt });
    return day !== null && isWithinISO(day, period.from, period.to);
  }).length;

  const completedByClient = new Map<number, number>();
  for (const appointment of appointments) {
    if (!isRevenue(appointment) || !appointment.clientId) continue;
    completedByClient.set(appointment.clientId, (completedByClient.get(appointment.clientId) ?? 0) + 1);
  }
  const servedClients = completedByClient.size;
  const returningClients = Array.from(completedByClient.values()).filter((count) => count > 1).length;

  const serviceStats = new Map<number, { appointments: number; completed: number; revenue: number }>();
  for (const appointment of inPeriod) {
    const serviceId = appointment.serviceId ?? 0;
    if (!serviceId) continue;
    const stat = serviceStats.get(serviceId) ?? { appointments: 0, completed: 0, revenue: 0 };
    stat.appointments += 1;
    if (isRevenue(appointment)) {
      stat.completed += 1;
      stat.revenue += money(appointment.price);
    }
    serviceStats.set(serviceId, stat);
  }

  const serviceBreakdown: ServicePerformance[] = services
    .map((service) => {
      const stat = serviceStats.get(service.id) ?? { appointments: 0, completed: 0, revenue: 0 };
      return {
        serviceId: service.id,
        name: service.name,
        appointments: stat.appointments,
        completed: stat.completed,
        revenue: stat.revenue,
        share: inPeriod.length > 0 ? (stat.appointments / inPeriod.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.appointments - a.appointments || b.revenue - a.revenue);


  const popularDays = DAY_LABELS_LONG.map((label, day) => ({
    day,
    label,
    count: inPeriod.filter(
      (appointment) => parseISODate(appointment.date).getDay() === day && occupiesSlot(appointment),
    ).length,
  }));

  const hourCounts = new Map<number, number>();
  for (const appointment of inPeriod) {
    if (!occupiesSlot(appointment)) continue;
    const hour = Number.parseInt((appointment.time || "00:00").slice(0, 2), 10);
    if (!Number.isFinite(hour)) continue;
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const popularHours = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  const upcomingAppointments = upcomingOpen
    .slice()
    .sort((a, b) => appointmentKey(a.date, a.time).localeCompare(appointmentKey(b.date, b.time)))
    .slice(0, 5)
    .map((appointment) => ({
      ...appointment,
      clientName: clientNames.get(appointment.clientId ?? 0) ?? "Cliente",
      serviceName: serviceNames.get(appointment.serviceId ?? 0) ?? "Servicio",
    }));

  // Legacy 7-point series (oldest → newest) kept for the existing home chart.
  const weeklyRevenue: number[] = [];
  const weeklyRevenueLabels: string[] = [];
  const today = limaDateISO();
  for (let i = 6; i >= 0; i -= 1) {
    const start = startOfWeekISO(addDaysISO(today, -i * 7));
    const end = addDaysISO(start, 6);
    weeklyRevenue.push(
      appointments
        .filter((appointment) => isRevenue(appointment) && isWithinISO(appointment.date, start, end))
        .reduce((sum, appointment) => sum + money(appointment.price), 0),
    );
    weeklyRevenueLabels.push(`${start.slice(8, 10)}/${start.slice(5, 7)}`);
  }

  const funnel = computeFunnel(events, createdInPeriod.length, completed.length);

  return {
    period,
    granularity,
    revenue,
    previousRevenue,
    revenueGrowth: growthPct(revenue, previousRevenue),
    totalRevenue,
    completedAppointments: completed.length,
    previousCompleted,
    completedGrowth: growthPct(completed.length, previousCompleted),
    appointmentsInPeriod: inPeriod.length,
    appointmentsCreatedInPeriod: createdInPeriod.length,
    pendingAppointments: appointments.filter((appointment) => appointment.status === "pending").length,
    confirmedUpcoming: upcomingOpen.filter((appointment) => appointment.status === "confirmed").length,
    confirmedToday,
    cancelledInPeriod: cancelled,
    noShowInPeriod: noShow,
    cancelRate: decided > 0 ? (cancelled / decided) * 100 : 0,
    noShowRate: decided > 0 ? (noShow / decided) * 100 : 0,
    pendingPayments: upcomingOpen.reduce((sum, appointment) => sum + money(appointment.price), 0),
    averageAppointmentValue: completed.length > 0 ? revenue / completed.length : 0,
    averageDurationMinutes:
      completed.length > 0
        ? completed.reduce((sum, appointment) => sum + (appointment.duration ?? 30), 0) / completed.length
        : 0,
    occupancyRate: computeOccupancy(appointments, workingHours, period),
    totalClients: clients.length,
    newClients,
    returningClients,
    retentionRate: servedClients > 0 ? (returningClients / servedClients) * 100 : 0,
    totalServices: services.length,
    serviceBreakdown,
    buckets: buildBuckets(appointments, period, granularity),
    weeklyRevenue,
    weeklyRevenueLabels,
    popularDays,
    popularHours,
    popularTimes: computePopularTimes(appointments),
    upcomingAppointments,
    views: funnel.views,
    whatsappClicks: funnel.whatsappClicks,
    bookClicks: funnel.bookClicks,
    viewToBookingRate: funnel.viewToBookingRate,
    clickToBookingRate: funnel.clickToBookingRate,
  };
}


/** Daily traffic series used by the analytics sparkline. */
export function computeTrafficSeries(
  events: Array<{ type: string; day?: string | null; source?: string | null }>,
  period: PeriodRange,
): Array<{ day: string; views: number; whatsappClicks: number; bookClicks: number }> {
  const map = new Map<string, { day: string; views: number; whatsappClicks: number; bookClicks: number }>();
  for (const day of eachDayISO(period.from, period.to, 400)) {
    map.set(day, { day, views: 0, whatsappClicks: 0, bookClicks: 0 });
  }
  for (const event of events) {
    if (!event.day) continue;
    const row = map.get(event.day);
    if (!row) continue;
    if (event.type === "view") row.views += 1;
    if (event.type === "whatsapp_click") row.whatsappClicks += 1;
    if (event.type === "book_click") row.bookClicks += 1;
  }
  return Array.from(map.values());
}

/** Where microsite visitors came from before they booked. */
export function computeSourceBreakdown(
  events: Array<{ type: string; source?: string | null }>,
): Array<{ source: string; count: number }> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "view") continue;
    const source = event.source || "direct";
    map.set(source, (map.get(source) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

export { resolvePeriod, limaDateISO, limaNowKey, type PeriodKey, type PeriodRange };

