import { randomBytes } from "crypto";
import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderAppointmentMessage } from "./desk-settings.js";
import { calculateDeposit, sendDepositRequest } from "./deposits.js";
import { sendBookingConfirmation, sendBookingEmails } from "./booking-notify.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

/**
 * Cancellation waitlist.
 *
 * When a booked slot is cancelled we message the oldest matching waitlist
 * entries with a claim link. The first valid claim creates the replacement
 * appointment; the DB/service conflict check protects against double booking.
 */

function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export interface WaitlistNotifySummary {
  matched: number;
  sent: number;
  skipped: number;
  disabled: boolean;
}

/** Message the oldest matching entries for a newly freed slot. */
export async function notifyWaitlistForSlot(params: {
  businessId: number;
  serviceId: number | null;
  date: string;
  time: string;
  excludePhone?: string | null;
}): Promise<WaitlistNotifySummary> {
  const summary: WaitlistNotifySummary = { matched: 0, sent: 0, skipped: 0, disabled: false };
  const settings = await getDeskSettings(params.businessId);
  if (!settings.waitlistEnabled) {
    summary.disabled = true;
    return summary;
  }

  const [business, service, entries] = await Promise.all([
    storage.getBusiness(params.businessId),
    params.serviceId ? storage.getService(params.serviceId) : Promise.resolve(undefined),
    storage.getWaitlistEntriesByBusinessId(params.businessId, params.date),
  ]);
  if (!business) return summary;

  const exclude = params.excludePhone?.replace(/\D/g, "") ?? "";
  const matching = entries
    .filter((entry) => ["waiting", "notified"].includes(entry.status))
    .filter((entry) => !entry.serviceId || !params.serviceId || entry.serviceId === params.serviceId)
    .filter((entry) => !exclude || entry.phone.replace(/\D/g, "") !== exclude)
    .slice(0, settings.waitlistNotifyLimit);

  summary.matched = matching.length;

  for (const entry of matching) {
    try {
      const link = `${config.appUrl.replace(/\/$/, "")}/lista/t/${entry.token}?date=${encodeURIComponent(
        params.date,
      )}&time=${encodeURIComponent(params.time)}`;
      const text = renderAppointmentMessage(settings.waitlistMessageTemplate, {
        name: entry.name,
        businessName: business.name,
        serviceName: service?.name ?? "Servicio",
        date: params.date,
        time: params.time,
        link,
      });

      const result = await sendWhatsAppMessage({
        businessId: params.businessId,
        to: entry.phone,
        text,
        payload: {
          type: "waitlist_slot",
          waitlistEntryId: entry.id,
          date: params.date,
          time: params.time,
        },
      });

      await storage.updateWaitlistEntry(entry.id, {
        status: "notified",
        offeredDate: params.date,
        offeredTime: params.time,
        notifiedAt: new Date(),
      });

      if (result.sent) summary.sent += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.skipped += 1;
      console.error(`[waitlist] notify failed for entry ${entry.id}:`, error);
    }
  }

  return summary;
}

export type WaitlistClaimResult =
  | {
      ok: true;
      appointment: Awaited<ReturnType<typeof storage.createAppointment>>;
      manageUrl: string;
      depositRequired: boolean;
    }
  | { ok: false; reason: "not_found" | "not_offered" | "slot_taken" | "past" };

/** Claim the offered slot for an entry. First successful claim wins. */
export async function claimWaitlistSlot(token: string): Promise<WaitlistClaimResult> {
  const entry = await storage.getWaitlistEntryByToken(token);
  if (!entry) return { ok: false, reason: "not_found" };
  if (entry.status === "claimed" || entry.status === "cancelled") {
    return { ok: false, reason: "not_offered" };
  }
  if (!entry.offeredDate || !entry.offeredTime) return { ok: false, reason: "not_offered" };

  const date = entry.offeredDate;
  const time = entry.offeredTime;
  const service = entry.serviceId ? await storage.getService(entry.serviceId) : undefined;
  if (!service) return { ok: false, reason: "not_offered" };

  const start = timeToMinutes(time);
  if (start === null) return { ok: false, reason: "not_offered" };

  // Basic "not in the past" check using Lima time (UTC-5 all year).
  const [year, month, day] = date.split("-").map(Number);
  const proposed = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0));
  proposed.setUTCMinutes(start + 5 * 60);
  if (proposed.getTime() <= Date.now()) return { ok: false, reason: "past" };

  const duration = service.duration && service.duration > 0 ? service.duration : 30;
  const end = start + duration;
  const sameDay = await storage.getAppointmentsByDate(entry.businessId, date);
  const conflict = sameDay.some((appointment) => {
    if (["cancelled", "no_show"].includes(appointment.status)) return false;
    const otherStart = timeToMinutes(appointment.time);
    if (otherStart === null) return false;
    const otherDuration = appointment.duration && appointment.duration > 0 ? appointment.duration : 30;
    return overlaps(start, end, otherStart, otherStart + otherDuration);
  });
  if (conflict) {
    await storage.updateWaitlistEntry(entry.id, {
      status: "waiting",
      offeredDate: null,
      offeredTime: null,
    });
    return { ok: false, reason: "slot_taken" };
  }

  const existingClients = await storage.getClientsByBusinessId(entry.businessId);
  const client =
    existingClients.find(
      (candidate) =>
        (candidate.phone ?? "").replace(/\D/g, "") === entry.phone.replace(/\D/g, ""),
    ) ??
    (await storage.createClient({
      businessId: entry.businessId,
      name: entry.name,
      phone: entry.phone,
      email: null,
    } as any));

  const deskSettings = await getDeskSettings(entry.businessId);
  const depositAmount = deskSettings.depositEnabled
    ? calculateDeposit(
        Number(service.price ?? 0),
        deskSettings.depositType,
        deskSettings.depositValue,
      )
    : 0;
  const requiresDeposit = depositAmount > 0;

  const appointment = await storage.createAppointment({
    businessId: entry.businessId,
    clientId: client.id,
    serviceId: service.id,
    date,
    time,
    duration,
    status: requiresDeposit ? "pending" : "confirmed",
    notes: "Reserva desde lista de espera",
    clientNotes: null,
    price: service.price ?? null,
    source: "waitlist",
    cancelToken: randomBytes(24).toString("hex"),
    depositAmount: requiresDeposit ? depositAmount.toFixed(2) : null,
    depositStatus: requiresDeposit ? "pending" : null,
    depositExpiresAt: requiresDeposit
      ? new Date(Date.now() + deskSettings.depositHoldMinutes * 60_000)
      : null,
  } as any);

  await storage.updateWaitlistEntry(entry.id, {
    status: "claimed",
    claimedAt: new Date(),
    appointmentId: appointment.id,
  });

  // Other people notified for this same slot go back in line for the next one.
  const sameSlot = await storage.getWaitlistEntriesByBusinessId(entry.businessId, date);
  for (const other of sameSlot) {
    if (
      other.id !== entry.id &&
      other.status === "notified" &&
      other.offeredDate === date &&
      other.offeredTime === time
    ) {
      await storage.updateWaitlistEntry(other.id, {
        status: "waiting",
        offeredDate: null,
        offeredTime: null,
      });
    }
  }

  if (requiresDeposit) {
    void sendDepositRequest(appointment.id).catch((error) =>
      console.error("Waitlist deposit request failed:", error),
    );
  } else {
    void sendBookingConfirmation(appointment.id).catch((error) =>
      console.error("Waitlist confirmation failed:", error),
    );
    void sendBookingEmails(appointment.id).catch((error) =>
      console.error("Waitlist emails failed:", error),
    );
  }

  return {
    ok: true,
    appointment,
    manageUrl: `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`,
    depositRequired: requiresDeposit,
  };
}
