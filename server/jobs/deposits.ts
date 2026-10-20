import { storage } from "../storage.js";

/**
 * Unpaid deposit holds release their slot after `depositHoldMinutes`.
 *
 * Runs in-process every 5 minutes. Cancelled appointments are ignored by the
 * availability engine, so the slot becomes bookable again on the next request.
 */
const INTERVAL_MS = 5 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

export interface DepositExpirySummary {
  scanned: number;
  released: number;
  errors: number;
}

export async function runDepositExpiryPass(now: Date = new Date()): Promise<DepositExpirySummary> {
  const summary: DepositExpirySummary = { scanned: 0, released: 0, errors: 0 };

  try {
    const expired = await storage.getExpiredDepositAppointments(now);
    summary.scanned = expired.length;

    for (const appointment of expired) {
      try {
        await storage.updateAppointment(appointment.id, {
          status: "cancelled",
          depositStatus: "expired",
        } as any);
        summary.released += 1;
      } catch (error) {
        summary.errors += 1;
        console.error(`[deposits] could not release appointment ${appointment.id}:`, error);
      }
    }
  } catch (error) {
    summary.errors += 1;
    console.error("[deposits] expiry pass failed:", error);
  }

  return summary;
}

export function startDepositScheduler(): void {
  if (timer) return;

  setTimeout(() => {
    void runDepositExpiryPass().catch((error) =>
      console.error("[deposits] initial expiry pass failed:", error),
    );
  }, 45_000).unref?.();

  timer = setInterval(() => {
    void runDepositExpiryPass().catch((error) =>
      console.error("[deposits] scheduled expiry pass failed:", error),
    );
  }, INTERVAL_MS);
  timer.unref?.();
}

export function stopDepositScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
