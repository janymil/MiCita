/**
 * Reminder scheduler.
 *
 * Runs in-process (single instance) every 15 minutes and sends one T-24h
 * reminder per appointment. `appointments.reminder_sent_at` makes it idempotent
 * across restarts, so a crash or redeploy can never double-send.
 *
 * For horizontal scaling this should move to pg-boss / a queue — the contract
 * (`runReminderPass`) is intentionally isolated so that swap is a one-file change.
 */

import { storage } from "../storage.js";
import { emailService } from "../email-service.js";
import { config } from "../config.js";
import { addDaysISO, appointmentKey, limaDateISO, limaNowKey } from "../lib/dates.js";
import { getDeskSettings, renderAppointmentMessage, type DeskSettings } from "../lib/desk-settings.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

const INTERVAL_MS = 15 * 60 * 1000;
let timer: ReturnType<typeof setInterval> | null = null;

export interface ReminderRunSummary {
  startedAt: string;
  finishedAt: string;
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  whatsappScanned: number;
  whatsappSent: number;
  whatsappSkipped: number;
  whatsappErrors: number;
  whatsappDisabled: number;
}

export interface WhatsAppReminderRunSummary {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
  disabled: number;
}

let lastRun: ReminderRunSummary | null = null;

export function getReminderStatus() {
  return {
    lastRun,
    running: timer !== null,
    intervalMinutes: INTERVAL_MS / 60000,
  };
}

/** One pass over the appointments that are due for a reminder. */
export async function runReminderPass(now: Date = new Date()): Promise<ReminderRunSummary> {
  const startedAt = new Date().toISOString();
  const today = limaDateISO(now);
  const tomorrow = addDaysISO(today, 1);

  const summary: ReminderRunSummary = {
    startedAt,
    finishedAt: startedAt,
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    whatsappScanned: 0,
    whatsappSent: 0,
    whatsappSkipped: 0,
    whatsappErrors: 0,
    whatsappDisabled: 0,
  };

  // Today (rest of the day) + tomorrow covers any missed pass.
  const due = await storage.getAppointmentsNeedingReminder(today, tomorrow);
  summary.scanned = due.length;
  const nowKey = limaNowKey();

  for (const appointment of due) {
    try {
      // Never remind about an appointment whose time already passed.
      if (appointmentKey(appointment.date, appointment.time) < nowKey) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { reminderSentAt: now } as any);
        continue;
      }
      const [client, service, business, settings] = await Promise.all([
        appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
        appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
        storage.getBusiness(appointment.businessId),
        storage.getBusinessSettings(appointment.businessId),
      ]);

      const email = client?.email || appointment.clientNotes?.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
      if (!email || !business) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { reminderSentAt: now } as any);
        continue;
      }

      const cancelUrl = appointment.cancelToken
        ? `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`
        : undefined;

      const sent = await emailService.sendReminder({
        clientName: client?.name ?? "Cliente",
        clientEmail: email,
        clientPhone: client?.phone ?? "",
        businessName: business.name,
        businessEmail: settings?.publicEmail || business.email || "",
        serviceName: service?.name ?? "Servicio",
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration ?? 30,
        price: Number(appointment.price ?? 0),
        cancelUrl,
      });

      // Mark regardless of transport success so a broken mailbox cannot loop forever.
      await storage.updateAppointment(appointment.id, { reminderSentAt: now } as any);
      if (sent) summary.sent += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(`[reminders] failed for appointment ${appointment.id}:`, error);
    }
  }

  // WhatsApp reminders run on their own configurable window (default 24h).
  try {
    const whatsapp = await runWhatsAppReminderPass(now);
    summary.whatsappScanned = whatsapp.scanned;
    summary.whatsappSent = whatsapp.sent;
    summary.whatsappSkipped = whatsapp.skipped;
    summary.whatsappErrors = whatsapp.errors;
    summary.whatsappDisabled = whatsapp.disabled;
  } catch (error) {
    summary.whatsappErrors += 1;
    console.error("[reminders] WhatsApp pass failed:", error);
  }

  summary.finishedAt = new Date().toISOString();
  lastRun = summary;
  return summary;
}

/**
 * WhatsApp reminders through the platform-owned central bot.
 *
 * `businessId` lets an owner trigger a pass for their shop only (used by the
 * "Enviar recordatorios ahora" button); the scheduler calls it globally.
 */
export async function runWhatsAppReminderPass(
  now: Date = new Date(),
  businessId?: number,
): Promise<WhatsAppReminderRunSummary> {
  const summary: WhatsAppReminderRunSummary = {
    scanned: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    disabled: 0,
  };

  const todayISO = limaDateISO(now);
  // 72h is the maximum configurable window; query a little wider to be safe.
  const toDate = addDaysISO(todayISO, 4);
  const due = await storage.getAppointmentsNeedingWhatsAppReminder(todayISO, toDate, businessId);
  const nowKey = limaNowKey(now);
  const settingsCache = new Map<number, DeskSettings>();

  for (const appointment of due) {
    try {
      const appointmentAt = appointmentKey(appointment.date, appointment.time);

      // Appointment already started/passed: close it out so it is not retried.
      if (appointmentAt < nowKey) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { whatsappReminderSentAt: now } as any);
        continue;
      }

      let settings = settingsCache.get(appointment.businessId);
      if (!settings) {
        settings = await getDeskSettings(appointment.businessId);
        settingsCache.set(appointment.businessId, settings);
      }

      if (!settings.whatsappRemindersEnabled) {
        summary.disabled += 1;
        continue; // leave timestamp null so enabling later still sends
      }

      const windowEnd = limaNowKey(new Date(now.getTime() + settings.reminderHoursBefore * 3_600_000));
      if (appointmentAt > windowEnd) continue; // not due yet

      summary.scanned += 1;

      const [client, service, business] = await Promise.all([
        appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
        appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
        storage.getBusiness(appointment.businessId),
      ]);

      if (!client?.phone || !business) {
        summary.skipped += 1;
        await storage.updateAppointment(appointment.id, { whatsappReminderSentAt: now } as any);
        continue;
      }

      const link = appointment.cancelToken
        ? `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`
        : config.appUrl;

      const text = renderAppointmentMessage(settings.whatsappReminderTemplate, {
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
        payload: { type: "appointment_reminder", appointmentId: appointment.id },
      });

      // Mark regardless of transport success so an outage cannot loop forever.
      await storage.updateAppointment(appointment.id, { whatsappReminderSentAt: now } as any);
      if (result.sent) summary.sent += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(`[reminders] WhatsApp failed for appointment ${appointment.id}:`, error);
    }
  }

  return summary;
}

export function startReminderScheduler(): void {
  if (timer) return;
  // First pass shortly after boot so a restart catches up.
  setTimeout(() => {
    void runReminderPass().catch((error) => console.error("[reminders] initial pass failed:", error));
  }, 30_000).unref?.();

  timer = setInterval(() => {
    void runReminderPass().catch((error) => console.error("[reminders] scheduled pass failed:", error));
  }, INTERVAL_MS);
  timer.unref?.();
}

export function stopReminderScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
