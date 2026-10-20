/**
 * Queue ETA math for the same-day virtual queue.
 *
 * Kept pure so the owner UI, the public ticket page and the tests all agree on
 * the numbers. Positions are 1-based; times are in minutes from now.
 */

export interface QueueWaitingTicket {
  id: number;
  joinedAt: Date | string;
  /** Service duration snapshot; falls back to `defaultDurationMinutes`. */
  durationMinutes?: number | null;
}

export interface QueueSeatedService {
  /** When the owner seated the customer; missing means "just started". */
  startedAt?: Date | string | null;
  durationMinutes: number;
}

export interface QueuePlanEntry {
  id: number;
  position: number;
  etaMinutes: number;
  durationMinutes: number;
}

export interface QueuePlan {
  entries: QueuePlanEntry[];
  /** Minutes a new ticket would wait if it joined right now. */
  waitForNewTicketMinutes: number;
  /** Minutes until the chair is free again. */
  remainingChairMinutes: number;
}

const DEFAULT_DURATION = 30;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function positiveDuration(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function computeQueuePlan(
  waiting: QueueWaitingTicket[],
  options: {
    seated?: QueueSeatedService | null;
    defaultDurationMinutes?: number;
    now?: Date;
  } = {},
): QueuePlan {
  const fallback = options.defaultDurationMinutes ?? DEFAULT_DURATION;
  const now = options.now ?? new Date();

  let remainingChairMinutes = 0;
  if (options.seated) {
    const duration = positiveDuration(options.seated.durationMinutes, fallback);
    const startedAt = options.seated.startedAt ? toDate(options.seated.startedAt) : now;
    const elapsedMinutes = Math.max(0, (now.getTime() - startedAt.getTime()) / 60_000);
    remainingChairMinutes = Math.max(0, Math.ceil(duration - elapsedMinutes));
  }

  const ordered = waiting
    .slice()
    .sort((a, b) => {
      const diff = toDate(a.joinedAt).getTime() - toDate(b.joinedAt).getTime();
      return diff !== 0 ? diff : a.id - b.id;
    });

  let cursor = remainingChairMinutes;
  const entries = ordered.map((ticket, index) => {
    const durationMinutes = positiveDuration(ticket.durationMinutes, fallback);
    const entry: QueuePlanEntry = {
      id: ticket.id,
      position: index + 1,
      etaMinutes: Math.round(cursor),
      durationMinutes,
    };
    cursor += durationMinutes;
    return entry;
  });

  return {
    entries,
    waitForNewTicketMinutes: Math.round(cursor),
    remainingChairMinutes: Math.round(remainingChairMinutes),
  };
}
