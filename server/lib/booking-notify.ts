import { config } from "../config.js";
import { emailService } from "../email-service.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderAppointmentMessage } from "./desk-settings.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

/**
 * Reusable booking notifications.
 *
 * A deposit-protected booking is created as `pending`: the normal confirmation
 * is suppressed until the deposit is paid, then the webhook/owner action calls
 * these helpers. Keeping this in one place avoids duplicated email/WhatsApp
 * formatting between the public booking route and the deposit flow.
 */

export async function sendBookingEmails(appointmentId: number): Promise<boolean> {
  const appointment = await storage.getAppointment(appointmentId);
  if (!appointment) return false;

  const [client, service, business, settings] = await Promise.all([
    appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
    appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
    storage.getBusiness(appointment.businessId),
    storage.getBusinessSettings(appointment.businessId),
  ]);

  if (!client?.email || !business) return false;

  try {
    await emailService.sendAppointmentEmails({
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone ?? "",
      businessName: business.name,
      businessEmail: settings?.publicEmail || business.email || "no-reply@example.com",
      serviceName: service?.name ?? "Servicio",
      date: appointment.date,
      time: appointment.time,
      duration: service?.duration ?? appointment.duration ?? 30,
      price: Number(appointment.price ?? 0),
      notes: appointment.clientNotes ?? undefined,
    });
    return true;
  } catch (error) {
    console.error("Error sending booking emails:", error);
    return false;
  }
}

export async function sendBookingConfirmation(
  appointmentId: number,
): Promise<{ sent: boolean; skipped?: boolean }> {
  const appointment = await storage.getAppointment(appointmentId);
  if (!appointment) return { sent: false, skipped: true };
  if (!["pending", "confirmed"].includes(appointment.status)) return { sent: false, skipped: true };
  if (appointment.whatsappConfirmationSentAt) return { sent: false, skipped: true };

  const [client, service, business, settings] = await Promise.all([
    appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
    appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
    storage.getBusiness(appointment.businessId),
    getDeskSettings(appointment.businessId),
  ]);

  if (!settings.whatsappConfirmationsEnabled || !client?.phone || !business) {
    return { sent: false, skipped: true };
  }

  const link = appointment.cancelToken
    ? `${config.appUrl.replace(/\/$/, "")}/cita/${appointment.cancelToken}`
    : config.appUrl;
  const text = renderAppointmentMessage(settings.whatsappConfirmationTemplate, {
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
    payload: { type: "booking_confirmation", appointmentId: appointment.id },
  });

  // Mark regardless of transport success so an outage cannot loop forever.
  await storage.updateAppointment(appointment.id, { whatsappConfirmationSentAt: new Date() } as any);
  return { sent: result.sent, skipped: result.skipped };
}
