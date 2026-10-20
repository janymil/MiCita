import { createHash } from "crypto";
import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { storage } from "../storage.js";
import { clientIp } from "../auth/audit.js";

const router: Router = express.Router();

const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiados intentos. Espera unos minutos." },
});

function hashIp(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

async function loadReviewContext(token: string) {
  if (!token || token.length < 20) return null;
  const appointment = await storage.getAppointmentByCancelToken(token);
  if (!appointment) return null;

  const [client, service, business, review] = await Promise.all([
    appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
    appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
    storage.getBusiness(appointment.businessId),
    storage.getReviewByAppointmentId(appointment.id),
  ]);

  return { appointment, client, service, business, review };
}

router.get("/:token", reviewLimiter, async (req, res) => {
  try {
    const context = await loadReviewContext(String(req.params.token || ""));
    if (!context) return res.status(404).json({ message: "Enlace de reseña no válido" });

    const { appointment, client, service, business, review } = context;
    res.set("Cache-Control", "no-store");
    return res.json({
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
      },
      client: client ? { name: client.name } : null,
      service: service ? { id: service.id, name: service.name } : null,
      business: business ? { id: business.id, name: business.name } : null,
      review: review
        ? {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            createdAt: review.createdAt,
          }
        : null,
      canReview: appointment.status === "completed" && !review,
    });
  } catch (error: any) {
    console.error("[public/reviews] load failed:", error);
    return res.status(500).json({ message: "Error cargando la reseña" });
  }
});

router.post("/:token", reviewLimiter, async (req, res) => {
  try {
    const context = await loadReviewContext(String(req.params.token || ""));
    if (!context) return res.status(404).json({ message: "Enlace de reseña no válido" });

    const { appointment, client } = context;
    if (appointment.status !== "completed") {
      return res.status(400).json({ message: "Solo puedes reseñar un servicio completado" });
    }
    if (context.review) {
      return res.status(409).json({ message: "Ya dejaste una reseña para esta visita. ¡Gracias!" });
    }

    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Elige de 1 a 5 estrellas" });
    }
    if (comment.length > 1200) {
      return res.status(400).json({ message: "La reseña es demasiado larga" });
    }

    const review = await storage.createReview({
      businessId: appointment.businessId,
      clientName: client?.name?.trim() || "Cliente",
      rating,
      comment: comment || null,
      source: "appointment",
      status: "pending",
      appointmentId: appointment.id,
      clientEmail: client?.email ?? null,
      ipHash: hashIp(clientIp(req)),
    } as any);

    return res.status(201).json({
      review,
      message: "¡Gracias! Tu reseña será publicada después de la revisión del negocio.",
    });
  } catch (error: any) {
    console.error("[public/reviews] submit failed:", error);
    return res.status(500).json({ message: "Error guardando la reseña" });
  }
});

export default router;
