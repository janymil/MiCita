import { randomUUID } from "crypto";
import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { and, eq, sql } from "drizzle-orm";
import { payments } from "../../shared/schema.js";
import { config } from "../config.js";
import { db } from "../db.js";
import { createPreference, isMercadoPagoConfigured } from "../payments/mercadopago.js";
import { storage } from "../storage.js";

const router: Router = express.Router();

const depositLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiados intentos. Espera unos minutos." },
});

/**
 * Create a MercadoPago Checkout Pro preference for a pending booking deposit.
 * The booking token is the only credential the customer needs.
 */
router.post("/:token/deposit", depositLimiter, async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (token.length < 20) return res.status(404).json({ message: "Cita no encontrada" });

    const appointment = await storage.getAppointmentByCancelToken(token);
    if (!appointment) return res.status(404).json({ message: "Cita no encontrada" });

    if (!appointment.depositAmount || appointment.depositStatus !== "pending") {
      return res.status(409).json({ message: "Esta cita no tiene un depósito pendiente" });
    }
    if (appointment.status !== "pending") {
      return res.status(409).json({ message: "Esta cita ya no acepta pagos" });
    }
    if (appointment.depositExpiresAt && appointment.depositExpiresAt.getTime() < Date.now()) {
      return res.status(410).json({ message: "El plazo para pagar el depósito venció" });
    }

    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({
        code: "gateway_not_configured",
        message: "El pago online no está disponible. Paga en el local o coordina por WhatsApp.",
      });
    }

    // Never charge twice for the same booking.
    const [alreadyPaid] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.status, "approved"),
          sql`${payments.metadata}->>'appointmentId' = ${String(appointment.id)}`,
        ),
      )
      .limit(1);
    if (alreadyPaid) {
      return res.status(409).json({ message: "El depósito ya fue pagado" });
    }

    const [client, service, business] = await Promise.all([
      appointment.clientId ? storage.getClient(appointment.clientId) : Promise.resolve(undefined),
      appointment.serviceId ? storage.getService(appointment.serviceId) : Promise.resolve(undefined),
      storage.getBusiness(appointment.businessId),
    ]);

    const externalReference = `deposit_${randomUUID()}`;
    const amount = Number(appointment.depositAmount);
    const base = config.appUrl.replace(/\/$/, "");
    const preference = await createPreference({
      items: [
        {
          title: `Depósito de cita — ${service?.name ?? "Servicio"}`,
          quantity: 1,
          unit_price: Number(amount.toFixed(2)),
          description: `Depósito para ${business?.name ?? "tu cita"} del ${appointment.date} a las ${appointment.time}`,
        },
      ],
      externalReference,
      payerEmail: client?.email ?? undefined,
      notificationUrl: `${base}/api/payments/webhook`,
      backUrls: {
        success: `${base}/cita/${token}?deposit=success`,
        failure: `${base}/cita/${token}?deposit=failure`,
        pending: `${base}/cita/${token}?deposit=pending`,
      },
      metadata: {
        type: "booking_deposit",
        appointmentId: appointment.id,
        businessId: appointment.businessId,
      },
    });

    await db.insert(payments).values({
      userId: null,
      businessId: appointment.businessId,
      provider: "mercadopago",
      providerPreferenceId: preference.id,
      externalReference,
      amount: amount.toFixed(2),
      currency: "PEN",
      description: `Depósito de cita #${appointment.id}`,
      status: "pending",
      metadata: {
        type: "booking_deposit",
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        init_point: preference.init_point,
      },
    });

    const checkoutUrl = config.payments.mercadoPago.sandbox
      ? preference.sandbox_init_point
      : preference.init_point;
    return res.json({ ok: true, checkoutUrl, preferenceId: preference.id, amount });
  } catch (error: any) {
    console.error("[public/deposit] error:", error);
    return res.status(500).json({ message: "No se pudo iniciar el pago del depósito" });
  }
});

export default router;
