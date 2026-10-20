import { randomBytes } from "crypto";
import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "../storage.js";
import { getDeskSettings } from "../lib/desk-settings.js";
import { claimWaitlistSlot } from "../lib/waitlist.js";
import { limaDateISO } from "../lib/dates.js";

const router: Router = express.Router();

const waitlistLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiados intentos. Espera unos minutos." },
});

const joinSchema = z.object({
  serviceId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
});

function parseBusinessId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/t/:token", waitlistLimiter, async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (token.length < 20) return res.status(404).json({ message: "Enlace no válido" });

    const entry = await storage.getWaitlistEntryByToken(token);
    if (!entry) return res.status(404).json({ message: "Enlace no válido" });

    const [business, service] = await Promise.all([
      storage.getBusiness(entry.businessId),
      entry.serviceId ? storage.getService(entry.serviceId) : Promise.resolve(undefined),
    ]);
    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });

    const appointment = entry.appointmentId
      ? await storage.getAppointment(entry.appointmentId)
      : undefined;

    res.set("Cache-Control", "no-store");
    return res.json({
      entry: {
        id: entry.id,
        status: entry.status,
        date: entry.date,
        offeredDate: entry.offeredDate,
        offeredTime: entry.offeredTime,
        notifiedAt: entry.notifiedAt,
        claimedAt: entry.claimedAt,
      },
      business: { id: business.id, name: business.name, phone: business.phone },
      service: service ? { id: service.id, name: service.name, duration: service.duration } : null,
      appointment: appointment
        ? {
            id: appointment.id,
            status: appointment.status,
            depositStatus: appointment.depositStatus,
            manageUrl: appointment.cancelToken ? `/cita/${appointment.cancelToken}` : null,
          }
        : null,
      canClaim:
        ["waiting", "notified"].includes(entry.status) &&
        Boolean(entry.offeredDate && entry.offeredTime),
    });
  } catch (error: any) {
    console.error("[public/waitlist] load failed:", error);
    return res.status(500).json({ message: "Error cargando la lista de espera" });
  }
});

router.post("/t/:token/claim", waitlistLimiter, async (req, res) => {
  try {
    const result = await claimWaitlistSlot(String(req.params.token || ""));
    if (result.ok) {
      return res.status(201).json({
        appointment: result.appointment,
        manageUrl: result.manageUrl,
        depositRequired: result.depositRequired,
        message: result.depositRequired
          ? "Cupo reservado. Falta el depósito para confirmar."
          : "¡Listo! Tu cupo quedó reservado.",
      });
    }

    const messages: Record<typeof result.reason, string> = {
      not_found: "Enlace no válido",
      not_offered: "No hay un cupo ofrecido en este momento",
      slot_taken: "Ese horario ya fue tomado. Sigues en la lista para el próximo cupo.",
      past: "Ese horario ya pasó",
    };
    const status = result.reason === "not_found" ? 404 : result.reason === "past" ? 410 : 409;
    return res.status(status).json({ message: messages[result.reason] });
  } catch (error: any) {
    console.error("[public/waitlist] claim failed:", error);
    return res.status(500).json({ message: "Error reservando el cupo" });
  }
});

router.get("/:businessId", waitlistLimiter, async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const business = await storage.getBusiness(businessId);
    if (!business || business.isActive === false) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }

    const [settings, services] = await Promise.all([
      getDeskSettings(businessId),
      storage.getServicesByBusinessId(businessId),
    ]);

    res.set("Cache-Control", "no-store");
    return res.json({
      business: { id: business.id, name: business.name, phone: business.phone },
      enabled: settings.waitlistEnabled,
      date: limaDateISO(),
      services: services
        .filter((service) => service.isActive !== false)
        .map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
        })),
    });
  } catch (error: any) {
    console.error("[public/waitlist] snapshot failed:", error);
    return res.status(500).json({ message: "Error cargando la lista de espera" });
  }
});

router.post("/:businessId", waitlistLimiter, async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const body = joinSchema.parse(req.body ?? {});
    const [business, settings, service] = await Promise.all([
      storage.getBusiness(businessId),
      getDeskSettings(businessId),
      storage.getService(body.serviceId),
    ]);

    if (!business || business.isActive === false) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }
    if (!settings.waitlistEnabled) {
      return res.status(403).json({ message: "La lista de espera no está disponible" });
    }
    if (!service || service.businessId !== businessId || service.isActive === false) {
      return res.status(404).json({ message: "Servicio no disponible" });
    }
    if (body.date < limaDateISO()) {
      return res.status(400).json({ message: "Elige una fecha de hoy en adelante" });
    }

    const entries = await storage.getWaitlistEntriesByBusinessId(businessId, body.date);
    const duplicate = entries.find(
      (entry) =>
        ["waiting", "notified"].includes(entry.status) &&
        entry.serviceId === body.serviceId &&
        entry.phone.replace(/\D/g, "") === body.phone.replace(/\D/g, ""),
    );
    if (duplicate) {
      return res.json({
        entry: duplicate,
        alreadyJoined: true,
        position:
          entries.filter(
            (entry) =>
              ["waiting", "notified"].includes(entry.status) &&
              entry.serviceId === body.serviceId &&
              entry.id <= duplicate.id,
          ).length || 1,
        message: "Ya estabas en la lista para ese día.",
      });
    }

    const token = randomBytes(24).toString("hex");
    const entry = await storage.createWaitlistEntry({
      businessId,
      serviceId: body.serviceId,
      name: body.name,
      phone: body.phone,
      date: body.date,
      token,
      status: "waiting",
      offeredDate: null,
      offeredTime: null,
      notifiedAt: null,
      claimedAt: null,
      appointmentId: null,
    });

    const position =
      entries.filter(
        (candidate) =>
          ["waiting", "notified"].includes(candidate.status) &&
          candidate.serviceId === body.serviceId,
      ).length + 1;

    return res.status(201).json({
      entry,
      alreadyJoined: false,
      position,
      message: "Quedaste en la lista. Te avisamos si se libera un cupo.",
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Revisa los datos", issues: error.issues });
    }
    console.error("[public/waitlist] join failed:", error);
    return res.status(500).json({ message: "Error entrando a la lista" });
  }
});

export default router;
