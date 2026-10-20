import { randomBytes } from "crypto";
import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderAppointmentMessage, type DeskSettings } from "../lib/desk-settings.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

/**
 * Post-service review requests.
 *
 * Runs every 10 minutes. A request is due `reviewDelayMinutes` after
 * `completed_at`; `review_request_sent_at` makes it idempotent across
 * restarts. Businesses that turn the feature off are left unstamped so
 * re-enabling it later still sends.
 */
const INTERVAL_MS = 10 * 60 * 1000;
const LOOKBACK_DAYS = 45;
let timer: ReturnType<typeof setInterval> | null = null;

export interface ReviewRequestSummary {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  disabled: number;
}

export async function runReviewRequestPass(
  businessId?: number,
  now: Date = new Date(),
): Promise<ReviewRequestSummary> {
  const summary: ReviewRequestSummary = { scanned: 0, sent: 0, skipped: 0, errors: 0, disabled: 0 };
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  const settingsCache = new Map<number, DeskSettings>();

  const candidates = await storage.getCompletedAppointmentsNeedingReview(businessId, since);

  for (const appointment of candidates) {
    try {
      let settings = settingsCache.get(appointment.businessId);
      if (!settings) {
        settings = await getDeskSettings(appointment.businessId);
        settingsCache.set(appointment.businessId, settings);
      }

      if (!settings.reviewRequestsEnabled) {
        summary.disabled += 1;
        continue;
      }

      const completedAt = appointment.completedAt ? new Date(appointment.completedAt) : null;
      if (!completedAt || Number.isNaN(completedAt.getTime())) {
        summary.skipped += 1;
        continue;
      }
      if (completedAt.getTime() + settings.reviewDelayMinutes * 60_000 > now.getTime()) {
        continue; // not due yet
      }

      summary.scanned += 1;

      const existingReview = await storage.getReviewByAppointmentId(appointment.id);
      if (existingReview) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { reviewRequestSentAt: now } as any);
        continue;
      }

      const [client, service, business] = await Promise.all([
        appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
        appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
        storage.getBusiness(appointment.businessId),
      ]);

      if (!client?.phone || !business) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { reviewRequestSentAt: now } as any);
        continue;
      }

      let reviewToken = appointment.cancelToken;
      if (!reviewToken) {
        reviewToken = randomBytes(24).toString("hex");
        await storage.updateAppointment(appointment.id, { cancelToken: reviewToken } as any);
      }

      const link = `${config.appUrl.replace(/\/$/, "")}/review/${reviewToken}`;
      const text = renderAppointmentMessage(settings.reviewMessageTemplate, {
        name: client.name,
        businessName: business.name,
        serviceName: service?.name ?? "Servicio",
        date: appointment.date,
        time: appointment.time,
        link,
      });

      const result = await sendWhatsAppMessage({
        businessId: appointment.businessId,
        to: client.phone,
        text,
        payload: { type: "review_request", appointmentId: appointment.id },
      });

      await storage.updateAppointment(appointment.id, { reviewRequestSentAt: now } as any);
      if (result.sent) summary.sent += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(`[reviews] request failed for appointment ${appointment.id}:`, error);
    }
  }

  return summary;
}

export function getReviewRequestStatus() {
  return {
    running: timer !== null,
    intervalMinutes: INTERVAL_MS / 60000,
  };
}

export function startReviewRequestScheduler(): void {
  if (timer) return;

  setTimeout(() => {
    void runReviewRequestPass().catch((error) =>
      console.error("[reviews] initial pass failed:", error),
    );
  }, 60_000).unref?.();

  timer = setInterval(() => {
    void runReviewRequestPass().catch((error) =>
      console.error("[reviews] scheduled pass failed:", error),
    );
  }, INTERVAL_MS);
  timer.unref?.();
}

export function stopReviewRequestScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
