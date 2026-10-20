import type { Request } from "express";
import type { Appointment, Business, QueueTicket, Service } from "../../shared/schema.js";
import { storage } from "../storage.js";
import { limaDateISO } from "./dates.js";
import { computeQueuePlan, type QueuePlan } from "./queue.js";
import {
  DEFAULT_NOTIFICATION_TEMPLATE,
  normalizeDeskSettings,
  renderNotificationTemplate,
  type DeskSettings,
} from "./desk-settings.js";

/**
 * Shared queue reads for both the owner desk and the public ticket page.
 * Everything is derived from live rows — no cached positions to go stale.
 */

export interface QueueTicketView {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
  serviceId: number | null;
  serviceName: string;
  joinedAt: Date;
  notifiedAt: Date | null;
  seatedAt: Date | null;
  position: number | null;
  etaMinutes: number | null;
  durationMinutes: number;
}

export interface QueueSnapshot {
  tickets: QueueTicketView[];
  plan: QueuePlan;
  seated: Appointment | null;
  seatedServiceName: string | null;
  services: Service[];
  waitingCount: number;
  estimatedWaitMinutes: number;
  settings: DeskSettings;
}

const ACTIVE_STATUSES = ["waiting", "notified"];

function durationOf(serviceId: number | null, services: Map<number, Service>, fallback: number): number {
  const service = serviceId ? services.get(serviceId) : undefined;
  const duration = service?.duration ?? 0;
  return duration > 0 ? duration : fallback;
}

export async function getQueueSnapshot(businessId: number, now: Date = new Date()): Promise<QueueSnapshot> {
  const [waitingRows, servicesList, todayAppointments, settingsRow] = await Promise.all([
    storage.getQueueTicketsByBusinessId(businessId, ACTIVE_STATUSES),
    storage.getServicesByBusinessId(businessId),
    storage.getAppointmentsByDate(businessId, limaDateISO(now)),
    storage.getBusinessSettings(businessId),
  ]);

  const settings = normalizeDeskSettings(settingsRow?.deskSettings);
  const services = new Map(servicesList.map((service) => [service.id, service]));
  const seated = todayAppointments.find((appointment) => appointment.status === "in_progress") ?? null;

  const plan = computeQueuePlan(
    waitingRows.map((ticket) => ({
      id: ticket.id,
      joinedAt: ticket.joinedAt,
      durationMinutes: durationOf(ticket.serviceId, services, settings.defaultDurationMinutes),
    })),
    {
      now,
      defaultDurationMinutes: settings.defaultDurationMinutes,
      seated: seated
        ? {
            startedAt: seated.startedAt ?? undefined,
            durationMinutes: seated.duration || settings.defaultDurationMinutes,
          }
        : null,
    },
  );

  const planById = new Map(plan.entries.map((entry) => [entry.id, entry]));

  const tickets: QueueTicketView[] = waitingRows.map((ticket) => {
    const entry = planById.get(ticket.id);
    const service = ticket.serviceId ? services.get(ticket.serviceId) : undefined;
    return {
      id: ticket.id,
      name: ticket.name,
      phone: ticket.phone,
      notes: ticket.notes,
      status: ticket.status,
      serviceId: ticket.serviceId,
      serviceName: service?.name ?? "Servicio",
      joinedAt: ticket.joinedAt,
      notifiedAt: ticket.notifiedAt,
      seatedAt: ticket.seatedAt,
      position: entry?.position ?? null,
      etaMinutes: entry?.etaMinutes ?? null,
      durationMinutes: entry?.durationMinutes ?? settings.defaultDurationMinutes,
    };
  });

  return {
    tickets,
    plan,
    seated,
    seatedServiceName: seated ? services.get(seated.serviceId)?.name ?? null : null,
    services: servicesList.filter((service) => service.isActive !== false),
    waitingCount: tickets.length,
    estimatedWaitMinutes: plan.waitForNewTicketMinutes,
    settings,
  };
}

/** Absolute public URL for the shop QR / share link. */
export function queueUrl(req: Request, businessId: number, appUrl?: string, isProduction = false): string {
  const base = isProduction && appUrl
    ? appUrl.replace(/\/$/, "")
    : `${req.protocol}://${req.get("host")}`;
  return `${base}/q/${businessId}`;
}

export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("51") && digits.length >= 11) return digits;
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export function whatsAppLink(phone: string | null | undefined, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function ticketMessage(
  ticket: Pick<QueueTicket, "name">,
  businessName: string,
  template: string = DEFAULT_NOTIFICATION_TEMPLATE,
): string {
  return renderNotificationTemplate(template, { name: ticket.name, businessName });
}

/** Public shape for one ticket; never leaks other customers' data. */
export function publicTicketView(
  ticket: QueueTicket,
  plan: QueuePlan,
  business: Business,
  services: Service[],
) {
  const entry = plan.entries.find((item) => item.id === ticket.id);
  const service = ticket.serviceId ? services.find((item) => item.id === ticket.serviceId) : undefined;
  const isActive = ACTIVE_STATUSES.includes(ticket.status);

  return {
    token: ticket.token,
    name: ticket.name,
    status: ticket.status,
    isActive,
    position: isActive ? entry?.position ?? null : null,
    etaMinutes: isActive ? entry?.etaMinutes ?? null : 0,
    joinedAt: ticket.joinedAt,
    service: service ? { id: service.id, name: service.name, duration: service.duration, price: service.price } : null,
    business: {
      id: business.id,
      name: business.name,
      phone: business.phone,
      address: business.address,
      district: business.district,
      city: business.city,
    },
  };
}
