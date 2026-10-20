import { randomBytes } from "crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "../db.js";
import { appointments, clients } from "../../shared/schema.js";
import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderPromoMessage } from "../lib/desk-settings.js";
import { countAvailableSlots, generatePromoSlots } from "../lib/promos.js";
import { limaDateISO, limaTimeHM } from "../lib/dates.js";
import { sendWhatsAppMessage, centralBotLink } from "../lib/whatsapp.js";

/**
 * Public "horas muertas" promo pages. A promo is a service at a special price
 * inside a same-day window with limited capacity; every claim becomes a real
 * appointment (source=promo) so it shows up in the owner's Hoy agenda.
 */
const router = Router();

const promoWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiadas solicitudes. Espera unos minutos e intenta de nuevo." },
});

const claimSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30).optional().or(z.literal("")),
});

function normalizeCode(value: string): string {
  return decodeURIComponent(value || "").trim().toUpperCase();
}

function promoUrl(req: any, code: string): string {
  const base = config.isProduction
    ? config.appUrl.replace(/\/$/, "")
    : `${req.protocol}://${req.get("host")}`;
  return `${base}/p/${code}`;
}

async function buildPromoState(req: any, rawCode: string) {
  const code = normalizeCode(rawCode);
  const promo = await storage.getPromoByCode(code);
  if (!promo) return null;

  const [business, service, settings, claims, dayAppointments] = await Promise.all([
    storage.getBusiness(promo.businessId),
    promo.serviceId ? storage.getService(promo.serviceId) : Promise.resolve(undefined),
    getDeskSettings(promo.businessId),
    storage.getPromoClaimsByPromoId(promo.id),
    storage.getAppointmentsByDate(promo.businessId, promo.date),
  ]);

  if (!business) return null;

  const reserved = claims.filter((claim) => claim.status === "reserved");
  const bookedTimes = new Set<string>([
    ...reserved.map((claim) => claim.time),
    ...dayAppointments
      .filter((appointment) => !["cancelled", "no_show"].includes(appointment.status))
      .map((appointment) => appointment.time),
  ]);

  const duration = service?.duration && service.duration > 0
    ? service.duration
    : settings.defaultDurationMinutes;

  const todayISO = limaDateISO();
  const nowTime = limaTimeHM();
  const slots = generatePromoSlots({
    date: promo.date,
    startTime: promo.startTime,
    endTime: promo.endTime,
    durationMinutes: duration,
    bookedTimes,
    todayISO,
    nowTime,
  });

  const remaining = Math.max(0, promo.capacity - reserved.length);
  const expired =
    promo.date < todayISO ||
    (promo.date === todayISO && promo.endTime <= nowTime);

  let state: "open" | "disabled" | "paused" | "ended" | "expired" | "full" = "open";
  if (!settings.promosEnabled) state = "disabled";
  else if (promo.status === "paused") state = "paused";
  else if (promo.status === "ended") state = "ended";
  else if (expired) state = "expired";
  else if (remaining <= 0) state = "full";

  const stateCopy: Record<string, string> = {
    disabled: "Las promociones no están disponibles en este negocio.",
    paused: "Esta promoción está en pausa.",
    ended: "Esta promoción ya terminó.",
    expired: "Esta promoción ya pasó.",
    full: "La promoción está completa.",
  };

  return {
    promo,
    business,
    service: service ?? null,
    settings,
    slots,
    reserved,
    claimed: reserved.length,
    remaining,
    state,
    closedReason: state === "open" ? null : stateCopy[state] ?? null,
    publicUrl: promoUrl(req, promo.code),
    duration,
  };
}

/** Active promos for the public microsite (no owner auth, no personal data). */
router.get("/by-business/:businessId", async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    if (!Number.isInteger(businessId) || businessId <= 0) {
      return res.status(400).json({ message: "Negocio inválido" });
    }

    const [business, settings, promos, claims, services] = await Promise.all([
      storage.getBusiness(businessId),
      getDeskSettings(businessId),
      storage.getPromosByBusinessId(businessId),
      storage.getPromoClaimsByBusinessId(businessId),
      storage.getServicesByBusinessId(businessId),
    ]);
    if (!business) return res.status(404).json({ message: "Negocio no encontrado" });

    const todayISO = limaDateISO();
    const nowTime = limaTimeHM();
    const serviceMap = new Map(services.map((service) => [service.id, service]));

    const items = promos
      .filter((promo) => promo.status === "active" && promo.date >= todayISO)
      .filter((promo) => !(promo.date === todayISO && promo.endTime <= nowTime))
      .map((promo) => {
        const reserved = claims.filter(
          (claim) => claim.promoId === promo.id && claim.status === "reserved",
        ).length;
        const remaining = Math.max(0, promo.capacity - reserved);
        const service = promo.serviceId ? serviceMap.get(promo.serviceId) : undefined;
        const base = config.isProduction
          ? config.appUrl.replace(/\/$/, "")
          : `${req.protocol}://${req.get("host")}`;
        return {
          code: promo.code,
          title: promo.title,
          price: promo.promoPrice,
          originalPrice: service?.price ?? null,
          serviceName: service?.name ?? null,
          date: promo.date,
          startTime: promo.startTime,
          endTime: promo.endTime,
          capacity: promo.capacity,
          claimed: reserved,
          remaining,
          state: remaining <= 0 ? "full" : "open",
          publicUrl: `${base}/p/${promo.code}`,
        };
      })
      .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
      .slice(0, 6);

    res.json({
      promosEnabled: settings.promosEnabled && settings.showPromosOnMicrosite,
      promos: items,
    });
  } catch (error: any) {
    console.error("Error loading public promos list:", error);
    res.status(500).json({ message: "Error cargando las promociones" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const ctx = await buildPromoState(req, req.params.code);
    if (!ctx) return res.status(404).json({ message: "Promoción no encontrada" });

    const { promo, business, service, settings } = ctx;
    const shareText = renderPromoMessage(settings.promoMessageTemplate, {
      title: promo.title,
      businessName: business.name,
      price: `S/ ${Number(promo.promoPrice).toFixed(2)}`,
      link: ctx.publicUrl,
    });

    res.json({
      promo: {
        code: promo.code,
        title: promo.title,
        description: promo.description,
        price: promo.promoPrice,
        originalPrice: service?.price ?? null,
        date: promo.date,
        startTime: promo.startTime,
        endTime: promo.endTime,
        capacity: promo.capacity,
        claimed: ctx.claimed,
        remaining: ctx.remaining,
        message: promo.message,
      },
      business: {
        id: business.id,
        name: business.name,
        phone: business.phone,
        address: business.address,
        district: business.district,
        city: business.city,
      },
      service: service
        ? { id: service.id, name: service.name, price: service.price, duration: service.duration }
        : null,
      slots: ctx.slots,
      availableSlots: countAvailableSlots(ctx.slots),
      state: ctx.state,
      closedReason: ctx.closedReason,
      publicUrl: ctx.publicUrl,
      shareText,
      whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      botUrl: centralBotLink(`promo ${promo.code}`),
    });
  } catch (error: any) {
    console.error("Error loading public promo:", error);
    res.status(500).json({ message: "Error cargando la promoción" });
  }
});

router.post("/:code/claims", promoWriteLimiter, async (req, res) => {
  try {
    const body = claimSchema.parse(req.body ?? {});
    const ctx = await buildPromoState(req, req.params.code);
    if (!ctx) return res.status(404).json({ message: "Promoción no encontrada" });
    if (ctx.state !== "open") {
      return res.status(409).json({ message: ctx.closedReason ?? "La promoción no está disponible" });
    }

    const promo = ctx.promo;
    const service = ctx.service;
    if (!service) {
      return res.status(409).json({ message: "El servicio de esta promoción ya no está disponible" });
    }

    const slot = ctx.slots.find((item) => item.time === body.time);
    if (!slot || !slot.available) {
      return res.status(409).json({ message: "Ese horario acaba de ocuparse. Elige otro." });
    }

    const phone = body.phone?.trim() || null;
    let client = phone
      ? (
          await db
            .select()
            .from(clients)
            .where(and(eq(clients.businessId, promo.businessId), eq(clients.phone, phone)))
            .limit(1)
        )[0]
      : undefined;

    if (!client) {
      client = await storage.createClient({
        businessId: promo.businessId,
        name: body.name,
        phone,
        email: null,
        notes: null,
      } as any);
    }


    const appointment = await storage.createAppointment({
      businessId: promo.businessId,
      clientId: client.id,
      serviceId: service.id,
      date: promo.date,
      time: body.time,
      duration: service.duration && service.duration > 0 ? service.duration : ctx.duration,
      status: "confirmed",
      notes: `Promo ${promo.code}`,
      clientNotes: null,
      price: promo.promoPrice,
      source: "promo",
      cancelToken: randomBytes(24).toString("hex"),
    } as any);

    let claim;
    try {
      claim = await storage.createPromoClaim({
        promoId: promo.id,
        businessId: promo.businessId,
        appointmentId: appointment.id,
        clientId: client.id,
        name: body.name,
        phone,
        date: promo.date,
        time: body.time,
        status: "reserved",
        token: randomBytes(18).toString("hex"),
      });
    } catch (error: any) {
      // Partial unique index guards the slot against two simultaneous claims.
      await storage.deleteAppointment(appointment.id).catch(() => undefined);
      if (String(error?.code) === "23505" || /duplicate|unique/i.test(error?.message ?? "")) {
        return res.status(409).json({ message: "Ese horario acaba de ocuparse. Elige otro." });
      }
      throw error;
    }

    const ownerPhone = ctx.settings.ownerWhatsApp || ctx.business.phone;
    const [clientNotification, ownerNotification] = await Promise.all([
      phone
        ? sendWhatsAppMessage({
            businessId: promo.businessId,
            to: phone,
            text: `¡Listo, ${body.name}! Tu promo ${promo.title} quedó reservada para el ${promo.date} a las ${body.time}. Código: ${promo.code}. ${ctx.publicUrl}`,
            payload: { type: "promo_claim_client", promoId: promo.id, claimId: claim.id },
          })
        : Promise.resolve({ sent: false, skipped: true as const, error: "missing_phone" }),
      ctx.settings.notifyOwnerOnClaim
        ? sendWhatsAppMessage({
            businessId: promo.businessId,
            to: ownerPhone,
            text: `Nueva reserva promo: ${promo.title}\n${body.name} · ${promo.date} ${body.time}${phone ? `\nTel: ${phone}` : ""}`,
            payload: { type: "promo_claim_owner", promoId: promo.id, claimId: claim.id },
          })
        : Promise.resolve({ sent: false, skipped: true as const, error: "disabled" }),
    ]);

    res.status(201).json({
      claim: {
        token: claim.token,
        status: claim.status,
        date: claim.date,
        time: claim.time,
        name: claim.name,
      },
      promo: { code: promo.code, title: promo.title, price: promo.promoPrice },
      appointment: { id: appointment.id, date: appointment.date, time: appointment.time },
      notifications: { client: clientNotification.sent, owner: ownerNotification.sent },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error claiming promo:", error);
    res.status(500).json({ message: "No se pudo reservar la promoción" });
  }
});


router.get("/:code/claims/:token", async (req, res) => {
  try {
    const claim = await storage.getPromoClaimByToken(req.params.token);
    if (!claim) return res.status(404).json({ message: "Reserva no encontrada" });

    const [promo, business, appointment] = await Promise.all([
      storage.getPromo(claim.promoId),
      storage.getBusiness(claim.businessId),
      claim.appointmentId ? storage.getAppointment(claim.appointmentId) : Promise.resolve(undefined),
    ]);
    if (!promo || !business) return res.status(404).json({ message: "Promoción no encontrada" });

    res.json({
      token: claim.token,
      status: claim.status,
      name: claim.name,
      date: claim.date,
      time: claim.time,
      appointmentStatus: appointment?.status ?? null,
      promo: { code: promo.code, title: promo.title, price: promo.promoPrice },
      business: { id: business.id, name: business.name, phone: business.phone, address: business.address },
    });
  } catch (error: any) {
    console.error("Error loading promo claim:", error);
    res.status(500).json({ message: "Error cargando tu reserva" });
  }
});

router.post("/:code/claims/:token/cancel", promoWriteLimiter, async (req, res) => {
  try {
    const claim = await storage.getPromoClaimByToken(req.params.token);
    if (!claim) return res.status(404).json({ message: "Reserva no encontrada" });
    if (claim.status !== "reserved") {
      return res.status(409).json({ message: "Esta reserva ya no se puede cancelar" });
    }

    const nowKey = `${limaDateISO()}T${limaTimeHM()}`;
    if (`${claim.date}T${claim.time}` <= nowKey) {
      return res.status(409).json({ message: "La reserva ya pasó; habla con el local" });
    }

    await storage.updatePromoClaim(claim.id, { status: "cancelled", cancelledAt: new Date() });
    if (claim.appointmentId) {
      const appointment = await storage.getAppointment(claim.appointmentId);
      if (appointment && appointment.status !== "completed") {
        await storage.updateAppointment(claim.appointmentId, { status: "cancelled" } as any);
      }
    }

    res.json({ message: "Tu reserva fue cancelada" });
  } catch (error: any) {
    console.error("Error cancelling promo claim:", error);
    res.status(500).json({ message: "Error cancelando la reserva" });
  }
});

router.get("/:code/qr", async (req, res) => {
  try {
    const promo = await storage.getPromoByCode(normalizeCode(req.params.code));
    if (!promo) return res.status(404).json({ message: "Promoción no encontrada" });

    const png = await QRCode.toBuffer(promoUrl(req, promo.code), {
      type: "png",
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#FFFFFF" },
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(png);
  } catch (error: any) {
    console.error("Error generating promo QR:", error);
    res.status(500).json({ message: "Error generando el QR" });
  }
});

export default router;
