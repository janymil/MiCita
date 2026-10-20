import { randomBytes } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { insertPromoSchema } from "../../shared/schema.js";
import { verifyBusinessOwnership } from "../auth-helpers.js";
import { requireAuth, type AuthenticatedRequest } from "../auth-middleware.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderPromoMessage } from "../lib/desk-settings.js";
import { generatePromoSlots, timeToMinutes } from "../lib/promos.js";
import { limaDateISO, limaTimeHM } from "../lib/dates.js";
import { centralBotLink } from "../lib/whatsapp.js";
import { config } from "../config.js";

/**
 * Owner-facing promotion management ("horas muertas"). Mounted under
 * `/api/dashboard/businesses` next to the desk router.
 */
const router = Router();

router.use(requireAuth);

const promoStatusSchema = z.object({
  status: z.enum(["active", "paused", "ended"]),
});

async function authorizeBusiness(req: AuthenticatedRequest, res: any): Promise<number | null> {
  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    res.status(400).json({ message: "Negocio inválido" });
    return null;
  }
  const user = await verifyBusinessOwnership(req, res, businessId);
  return user ? businessId : null;
}

function absolutePromoUrl(req: any, code: string): string {
  const base = config.isProduction
    ? config.appUrl.replace(/\/$/, "")
    : `${req.protocol}://${req.get("host")}`;
  return `${base}/p/${code}`;
}

async function generatePromoCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `PRM-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!(await storage.getPromoByCode(code))) return code;
  }
  throw new Error("No se pudo generar un código único");
}

function promoState(promo: any, remaining: number, promosEnabled: boolean, todayISO: string, nowTime: string) {
  if (!promosEnabled) return "disabled";
  if (promo.status !== "active") return promo.status;
  if (promo.date < todayISO || (promo.date === todayISO && promo.endTime <= nowTime)) return "expired";
  if (remaining <= 0) return "full";
  return "open";
}

router.get("/:businessId/promos", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const [promos, claims, settings, business, services, todayAppointments] = await Promise.all([
      storage.getPromosByBusinessId(businessId),
      storage.getPromoClaimsByBusinessId(businessId),
      getDeskSettings(businessId),
      storage.getBusiness(businessId),
      storage.getServicesByBusinessId(businessId),
      storage.getAppointmentsByDate(businessId, limaDateISO()),
    ]);

    const todayISO = limaDateISO();
    const nowTime = limaTimeHM();
    const serviceMap = new Map(services.map((service) => [service.id, service]));

    res.json({
      promosEnabled: settings.promosEnabled,
      promos: promos.map((promo) => {
        const reserved = claims.filter(
          (claim) => claim.promoId === promo.id && claim.status === "reserved",
        );
        const remaining = Math.max(0, promo.capacity - reserved.length);
        const state = promoState(promo, remaining, settings.promosEnabled, todayISO, nowTime);
        const link = absolutePromoUrl(req, promo.code);
        const shareText = renderPromoMessage(promo.message || settings.promoMessageTemplate, {
          title: promo.title,
          businessName: business?.name ?? "MiCita",
          price: `S/ ${Number(promo.promoPrice).toFixed(2)}`,
          link,
        });

        return {
          id: promo.id,
          code: promo.code,
          title: promo.title,
          description: promo.description,
          price: promo.promoPrice,
          date: promo.date,
          startTime: promo.startTime,
          endTime: promo.endTime,
          capacity: promo.capacity,
          claimed: reserved.length,
          remaining,
          status: promo.status,
          state,
          service: promo.serviceId ? serviceMap.get(promo.serviceId) ?? null : null,
          publicUrl: link,
          shareText,
          whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          botUrl: centralBotLink(`promo ${promo.code}`),
          qrPath: `/api/public/promos/${promo.code}/qr`,
          message: promo.message,
          createdAt: promo.createdAt,
        };
      }),
      todayAppointments: todayAppointments.filter((appointment) => appointment.source === "promo").length,
    });
  } catch (error: any) {
    console.error("Error loading promos:", error);
    res.status(500).json({ message: "Error cargando las promociones" });
  }
});

router.post("/:businessId/promos", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = insertPromoSchema.parse(req.body ?? {});
    if (!body.serviceId) {
      return res.status(400).json({ message: "Elige un servicio" });
    }

    const service = await storage.getService(body.serviceId);
    if (!service || service.businessId !== businessId) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }

    if (timeToMinutes(body.endTime) <= timeToMinutes(body.startTime)) {
      return res.status(400).json({ message: "La hora final debe ser mayor que la inicial" });
    }

    const settings = await getDeskSettings(businessId);
    const duration = service.duration && service.duration > 0
      ? service.duration
      : settings.defaultDurationMinutes;
    const previewSlots = generatePromoSlots({
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      durationMinutes: duration,
      todayISO: limaDateISO(),
      nowTime: limaTimeHM(),
    });
    if (previewSlots.length === 0) {
      return res.status(400).json({ message: "La ventana es demasiado corta para este servicio" });
    }

    const code = await generatePromoCode();
    const promo = await storage.createPromo({
      ...body,
      businessId,
      code,
      status: "active",
    } as any);

    const link = absolutePromoUrl(req, promo.code);
    const shareText = renderPromoMessage(promo.message || settings.promoMessageTemplate, {
      title: promo.title,
      businessName: (await storage.getBusiness(businessId))?.name ?? "MiCita",
      price: `S/ ${Number(promo.promoPrice).toFixed(2)}`,
      link,
    });

    res.status(201).json({
      id: promo.id,
      code: promo.code,
      title: promo.title,
      price: promo.promoPrice,
      date: promo.date,
      startTime: promo.startTime,
      endTime: promo.endTime,
      capacity: promo.capacity,
      publicUrl: link,
      shareText,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      botUrl: centralBotLink(`promo ${promo.code}`),
      qrPath: `/api/public/promos/${promo.code}/qr`,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Revisa los datos de la promo", issues: error.issues });
    }
    console.error("Error creating promo:", error);
    res.status(500).json({ message: "Error creando la promoción" });
  }
});


router.patch("/:businessId/promos/:promoId", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const promo = await storage.getPromo(Number(req.params.promoId));
    if (!promo || promo.businessId !== businessId) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    const body = promoStatusSchema.parse(req.body ?? {});
    const updated = await storage.updatePromo(promo.id, { status: body.status });
    res.json({ id: updated.id, status: updated.status });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Estado inválido" });
    }
    console.error("Error updating promo:", error);
    res.status(500).json({ message: "Error actualizando la promoción" });
  }
});

router.get("/:businessId/promos/:promoId/claims", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const promo = await storage.getPromo(Number(req.params.promoId));
    if (!promo || promo.businessId !== businessId) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    const claims = await storage.getPromoClaimsByPromoId(promo.id);
    const withAppointments = await Promise.all(
      claims.map(async (claim) => {
        const appointment = claim.appointmentId
          ? await storage.getAppointment(claim.appointmentId)
          : undefined;
        return {
          id: claim.id,
          name: claim.name,
          phone: claim.phone,
          date: claim.date,
          time: claim.time,
          status: claim.status,
          appointmentStatus: appointment?.status ?? null,
          createdAt: claim.createdAt,
        };
      }),
    );

    res.json({
      promo: {
        id: promo.id,
        code: promo.code,
        title: promo.title,
        capacity: promo.capacity,
        status: promo.status,
        date: promo.date,
        startTime: promo.startTime,
        endTime: promo.endTime,
      },
      claims: withAppointments,
    });
  } catch (error: any) {
    console.error("Error loading promo claims:", error);
    res.status(500).json({ message: "Error cargando las reservas" });
  }
});

router.post("/:businessId/promos/:promoId/claims/:claimId/cancel", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const promo = await storage.getPromo(Number(req.params.promoId));
    if (!promo || promo.businessId !== businessId) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    const claim = await storage.getPromoClaim(Number(req.params.claimId));
    if (!claim || claim.promoId !== promo.id) {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }
    if (claim.status !== "reserved") {
      return res.status(409).json({ message: "Esta reserva ya fue cancelada" });
    }

    await storage.updatePromoClaim(claim.id, { status: "cancelled", cancelledAt: new Date() });
    if (claim.appointmentId) {
      const appointment = await storage.getAppointment(claim.appointmentId);
      if (appointment && appointment.status !== "completed") {
        await storage.updateAppointment(claim.appointmentId, { status: "cancelled" } as any);
      }
    }

    res.json({ message: "Reserva cancelada", claimId: claim.id });
  } catch (error: any) {
    console.error("Error cancelling promo claim:", error);
    res.status(500).json({ message: "Error cancelando la reserva" });
  }
});

export default router;
