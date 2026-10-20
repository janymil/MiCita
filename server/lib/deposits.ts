import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderAppointmentMessage } from "./desk-settings.js";
import { sendBookingConfirmation, sendBookingEmails } from "./booking-notify.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

/**
 * No-show protection helpers.
 *
 * A deposit is a partial prepayment credited to the service. The appointment
 * stays `pending` and keeps its slot until the deposit is paid or the hold
 * expires. Online payments mark it paid through the MercadoPago webhook; the
 * owner can also record cash/Yape from the Hoy screen.
 */

export function calculateDeposit(
  servicePrice: number,
  type: "percent" | "fixed",
  value: number,
): number {
  const price = Number(servicePrice);
  const rawValue = Number(value);
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;

  const raw = type === "fixed" ? rawValue : (price * rawValue) / 100;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(0, Math.min(price, rounded));
}

export async function sendDepositRequest(appointmentId: number): Promise<{ sent: boolean; skipped?: boolean }> {
  const appointment = await storage.getAppointment(appointmentId);
  if (!appointment || appointment.depositStatus !== "pending" || !appointment.depositAmount) {
    return { sent: false, skipped: true };
  }

  const [client, service, business, settings] = await Promise.all([
    appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
    appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
    storage.getBusiness(appointment.businessId),
    getDeskSettings(appointment.businessId),
  ]);

  if (!client?.phone || !business || !settings.depositEnabled) {
    return { sent: false, skipped: true };
  }

  const link = appointment.cancelToken
    ? `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`
    : config.appUrl;
  const text = renderAppointmentMessage(settings.depositMessageTemplate, {
    name: client.name,
    businessName: business.name,
    serviceName: service?.name ?? "Servicio",
    date: appointment.date,
    time: appointment.time,
    amount: Number(appointment.depositAmount).toFixed(2),
    link,
  });

  const result = await sendWhatsAppMessage({
    businessId: appointment.businessId,
    to: client.phone,
    text,
    payload: { type: "booking_deposit_request", appointmentId: appointment.id },
  });

  return { sent: result.sent, skipped: result.skipped };
}

/** Mark the deposit paid, confirm the booking and send its notifications. */
export async function markDepositPaid(
  appointmentId: number,
  providerPaymentId?: string | null,
): Promise<{ appointment: Awaited<ReturnType<typeof storage.getAppointment>>; alreadyPaid: boolean }> {
  const appointment = await storage.getAppointment(appointmentId);
  if (!appointment) return { appointment: undefined, alreadyPaid: false };
  if (appointment.depositStatus === "paid") return { appointment, alreadyPaid: true };

  const updated = await storage.updateAppointment(appointmentId, {
    status: "confirmed",
    depositStatus: "paid",
    depositPaidAt: new Date(),
    ...(providerPaymentId ? { depositPaymentId: providerPaymentId } : {}),
  } as any);

  // Fire-and-forget: a notification outage must never roll back a payment.
  void sendBookingConfirmation(appointmentId).catch((error) =>
    console.error("Deposit confirmation WhatsApp failed:", error),
  );
  void sendBookingEmails(appointmentId).catch((error) =>
    console.error("Deposit confirmation email failed:", error),
  );

  return { appointment: updated, alreadyPaid: false };
}

/** Owner waives the deposit (regular client, trust, etc.). */
export async function waiveDeposit(
  appointmentId: number,
): Promise<Awaited<ReturnType<typeof storage.getAppointment>>> {
  const updated = await storage.updateAppointment(appointmentId, {
    status: "confirmed",
    depositStatus: "waived",
  } as any);

  void sendBookingConfirmation(appointmentId).catch((error) =>
    console.error("Deposit waiver confirmation failed:", error),
  );
  void sendBookingEmails(appointmentId).catch((error) =>
    console.error("Deposit waiver email failed:", error),
  );

  return updated;
}
