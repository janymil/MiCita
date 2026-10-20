import { randomBytes } from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "../db.js";
import { clients } from "../../shared/schema.js";
import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings } from "../lib/desk-settings.js";
import { renderQueueMessage } from "../lib/desk-settings.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { notifyNextQueueTicket } from "../lib/queue-notify.js";
import {
  getQueueSnapshot,
  publicTicketView,
  queueUrl,
} from "../lib/queue-service.js";

/**
 * Public "Saca tu turno" surface. No account needed: the shop QR points here.
 * Only the caller's own ticket is addressable (opaque token), never the queue
 * of other customers.
 */
const router = Router();

const queueWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiadas solicitudes. Espera unos minutos e intenta de nuevo." },
});

const joinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30).optional().or(z.literal("")),
  serviceId: z.number().int().positive(),
  notes: z.string().trim().max(500).optional(),
});

function parseBusinessId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/:businessId", async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const business = await storage.getBusiness(businessId);
    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });

    const snapshot = await getQueueSnapshot(businessId);
    const settings = snapshot.settings;
    const isFull =
      settings.maxQueueLength > 0 && snapshot.waitingCount >= settings.maxQueueLength;
    const closedReason = !settings.queueEnabled
      ? "La cola virtual no está disponible en este negocio."
      : !settings.queueOpen
        ? "La cola está cerrada en este momento."
        : isFull
          ? "La cola está llena. Intenta en unos minutos."
          : null;

    res.json({
      business: {
        id: business.id,
        name: business.name,
        category: business.category,
        description: business.description,
        address: business.address,
        district: business.district,
        city: business.city,
        phone: business.phone,
        logo: business.logo,
      },
      queue: {
        enabled: settings.queueEnabled,
        isOpen: settings.queueEnabled && settings.queueOpen,
        isFull,
        closedReason,
        maxLength: settings.maxQueueLength,
        waitingCount: snapshot.waitingCount,
        estimatedWaitMinutes: snapshot.estimatedWaitMinutes,
        whatsappUpdates: settings.queueWhatsappEnabled,
        seated: snapshot.seated
          ? {
              serviceName: snapshot.seatedServiceName,
              remainingMinutes: snapshot.plan.remainingChairMinutes,
            }
          : null,
      },
      services: snapshot.services.map((service) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
        price: service.price,
      })),
      shareUrl: queueUrl(req, businessId, config.appUrl, config.isProduction),
    });
  } catch (error: any) {
    console.error("Error loading public queue:", error);
    res.status(500).json({ message: "Error cargando la cola" });
  }
});

router.post("/:businessId/tickets", queueWriteLimiter, async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const body = joinSchema.parse(req.body ?? {});
    const [business, service] = await Promise.all([
      storage.getBusiness(businessId),
      storage.getService(body.serviceId),
    ]);

    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });
    if (!service || service.businessId !== businessId || service.isActive === false) {
      return res.status(404).json({ message: "Servicio no disponible" });
    }

    const settings = await getDeskSettings(businessId);
    if (!settings.queueEnabled) {
      return res.status(403).json({ message: "La cola virtual no está disponible en este negocio" });
    }
    if (!settings.queueOpen) {
      return res.status(403).json({ message: "La cola está cerrada en este momento" });
    }
    if (settings.maxQueueLength > 0) {
      const waiting = await storage.getQueueTicketsByBusinessId(businessId, ["waiting", "notified"]);
      if (waiting.length >= settings.maxQueueLength) {
        return res.status(409).json({ message: "La cola está llena. Intenta en unos minutos" });
      }
    }

    const phone = body.phone?.trim() || null;

    // Reuse the customer record when the phone matches, so the owner sees one
    // history instead of a new "Cliente" row per visit.
    let client = phone
      ? (
          await db
            .select()
            .from(clients)
            .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
            .limit(1)
        )[0]
      : undefined;

    if (!client) {
      client = await storage.createClient({
        businessId,
        name: body.name,
        phone,
        email: null,
        notes: null,
      } as any);
    }

    const ticket = await storage.createQueueTicket({
      businessId,
      clientId: client.id,
      serviceId: service.id,
      name: body.name,
      phone,
      notes: body.notes ?? null,
      status: "waiting",
      token: randomBytes(18).toString("hex"),
    });

    const snapshot = await getQueueSnapshot(businessId);
    const view = publicTicketView(ticket, snapshot.plan, business, snapshot.services);

    // Automatic "you're in line" WhatsApp message (owner-configurable).
    let clientNotified = false;
    if (phone) {
      const settings = snapshot.settings;
      if (settings.queueWhatsappEnabled) {
        const link = `${queueUrl(req, businessId, config.appUrl, config.isProduction)}?ticket=${ticket.token}`;
        const text = renderQueueMessage(settings.queueJoinedTemplate, {
          name: ticket.name,
          businessName: business.name,
          position: view.position,
          minutes: view.etaMinutes,
          link,
        });
        const result = await sendWhatsAppMessage({
          businessId,
          to: phone,
          text,
          payload: { type: "queue_joined", ticketId: ticket.id },
        });
        clientNotified = result.sent;
      }
    }

    res.status(201).json({
      ...view,
      estimatedWaitMinutes: snapshot.estimatedWaitMinutes,
      notifications: { client: clientNotified },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error joining queue:", error);
    res.status(500).json({ message: "No se pudo tomar el turno" });
  }
});

router.get("/tickets/:token", async (req, res) => {
  try {
    const ticket = await storage.getQueueTicketByToken(req.params.token);
    if (!ticket) return res.status(404).json({ message: "Turno no encontrado" });

    const business = await storage.getBusiness(ticket.businessId);
    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });

    const snapshot = await getQueueSnapshot(ticket.businessId);
    res.json({
      ...publicTicketView(ticket, snapshot.plan, business, snapshot.services),
      estimatedWaitMinutes: snapshot.estimatedWaitMinutes,
      queueOpen: snapshot.settings.queueEnabled && snapshot.settings.queueOpen,
    });
  } catch (error: any) {
    console.error("Error loading queue ticket:", error);
    res.status(500).json({ message: "Error cargando tu turno" });
  }
});

router.post("/tickets/:token/cancel", queueWriteLimiter, async (req, res) => {
  try {
    const ticket = await storage.getQueueTicketByToken(req.params.token);
    if (!ticket) return res.status(404).json({ message: "Turno no encontrado" });

    if (!["waiting", "notified"].includes(ticket.status)) {
      return res.status(409).json({ message: "Tu turno ya no se puede cancelar" });
    }

    await storage.updateQueueTicket(ticket.id, { status: "cancelled", closedAt: new Date() });
    void notifyNextQueueTicket(ticket.businessId).catch((error) =>
      console.error("Error notifying next queue ticket:", error),
    );
    res.json({ message: "Tu turno fue cancelado" });
  } catch (error: any) {
    console.error("Error cancelling queue ticket:", error);
    res.status(500).json({ message: "Error cancelando el turno" });
  }
});

router.get("/:businessId/qr", async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const business = await storage.getBusiness(businessId);
    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });

    const url = queueUrl(req, businessId, config.appUrl, config.isProduction);
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#FFFFFF" },
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(png);
  } catch (error: any) {
    console.error("Error generating queue QR:", error);
    res.status(500).json({ message: "Error generando el QR" });
  }
});

export default router;
