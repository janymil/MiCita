/**
 * Slot math for "horas muertas" promotions. Pure so the owner preview, the
 * public claim page and the API all agree on availability.
 */

export interface PromoSlot {
  time: string;
  available: boolean;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function minutesToTime(value: number): string {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function generatePromoSlots(params: {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number | null;
  bookedTimes?: Iterable<string>;
  todayISO: string;
  nowTime: string;
}): PromoSlot[] {
  const start = timeToMinutes(params.startTime);
  const end = timeToMinutes(params.endTime);
  const duration = Math.max(5, Math.round(params.durationMinutes ?? 30));
  if (end <= start) return [];

  const booked = new Set(Array.from(params.bookedTimes ?? []).map((time) => time.slice(0, 5)));
  const now = timeToMinutes(params.nowTime);
  const isPastDate = params.date < params.todayISO;

  const slots: PromoSlot[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    const time = minutesToTime(cursor);
    const inPast =
      isPastDate || (params.date === params.todayISO && cursor <= now);
    slots.push({ time, available: !booked.has(time) && !inPast });
  }
  return slots;
}

export function countAvailableSlots(slots: PromoSlot[]): number {
  return slots.filter((slot) => slot.available).length;
}
