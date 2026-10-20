import crypto from "crypto";
import express, { type Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { config } from "./config.js";
import { db } from "./db.js";
import { payments, paymentWebhookEvents, subscriptions, businesses } from "../shared/schema.js";
import { requireAuth, type AuthenticatedRequest } from "./auth-middleware.js";
import { getAuthenticatedUser, verifyBusinessOwnership } from "./auth-helpers.js";
import { recordAudit } from "./auth/audit.js";
import {
  createPreapproval,
  createPreference,
  getPayment,
  getPreapproval,
  isMercadoPagoConfigured,
  PLAN_PRICING,
  validateWebhookSignature,
} from "./payments/mercadopago.js";
import { markDepositPaid } from "./lib/deposits.js";
import { activatePackagePurchase } from "./lib/packages.js";
import { storage } from "./storage.js";

const router: Router = express.Router();

const notificationUrl = () => `${config.appUrl.replace(/\/$/, "")}/api/payments/webhook`;

function backUrls() {
  const base = config.appUrl.replace(/\/$/, "");
  const mp = config.payments.mercadoPago;
  return {
    success: `${base}${mp.successUrl}`,
    failure: `${base}${mp.failureUrl}`,
    pending: `${base}${mp.pendingUrl}`,
  };
}

// --- One-off payment (Checkout Pro) ------------------------------------------
const checkoutSchema = z.object({
  businessId: z.number().int().positive(),
  amount: z.number().positive().max(100000),
  description: z.string().min(3).max(160),
});

router.post("/checkout", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: "La pasarela de pagos no está configurada" });
    }
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return;

    const owns = await verifyBusinessOwnership(req, res, parsed.data.businessId);
    if (!owns) return;

    const externalReference = `micita_${crypto.randomUUID()}`;
    const preference = await createPreference({
      items: [
        {
          title: parsed.data.description,
          quantity: 1,
          unit_price: Number(parsed.data.amount.toFixed(2)),
          description: parsed.data.description,
        },
      ],
      externalReference,
      payerEmail: dbUser.email,
      notificationUrl: notificationUrl(),
      backUrls: backUrls(),
      metadata: { userId: dbUser.id, businessId: parsed.data.businessId, purpose: "plan" },
    });

    await db.insert(payments).values({
      userId: dbUser.id,
      businessId: parsed.data.businessId,
      provider: "mercadopago",
      providerPreferenceId: preference.id,
      externalReference,
      amount: parsed.data.amount.toFixed(2),
      description: parsed.data.description,
      status: "pending",
      metadata: { init_point: preference.init_point, purpose: "plan" },
    });

    await recordAudit(req, { userId: dbUser.id, event: "payment_created", metadata: { externalReference } });

    const checkoutUrl = config.payments.mercadoPago.sandbox ? preference.sandbox_init_point : preference.init_point;
    return res.json({ ok: true, preferenceId: preference.id, initPoint: checkoutUrl });
  } catch (error: any) {
    console.error("[payments/checkout] error:", error);
    return res.status(500).json({ message: "No se pudo iniciar el pago" });
  }
});

// --- Subscription (Preapproval) ----------------------------------------------
const subscribeSchema = z.object({
  businessId: z.number().int().positive(),
  plan: z.enum(["premium", "premium_plus"]),
});

router.post("/subscribe", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: "La pasarela de pagos no está configurada" });
    }
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return;

    const owns = await verifyBusinessOwnership(req, res, parsed.data.businessId);
    if (!owns) return;

    const pricing = PLAN_PRICING[parsed.data.plan];
    const externalReference = `micita_sub_${crypto.randomUUID()}`;

    const preapproval = await createPreapproval({
      reason: `MiCita ${pricing.label}`,
      externalReference,
      payerEmail: dbUser.email,
      amount: pricing.amount,
      backUrl: `${config.appUrl.replace(/\/$/, "")}/dashboard/finanzas?subscription=success`,
      notificationUrl: notificationUrl(),
    });

    await db
      .insert(subscriptions)
      .values({
        businessId: parsed.data.businessId,
        userId: dbUser.id,
        plan: parsed.data.plan,
        provider: "mercadopago",
        providerPreapprovalId: preapproval.id,
        status: "pending",
        amount: pricing.amount.toFixed(2),
      })
      .onConflictDoUpdate({
        target: subscriptions.businessId,
        set: {
          plan: parsed.data.plan,
          providerPreapprovalId: preapproval.id,
          status: "pending",
          amount: pricing.amount.toFixed(2),
          updatedAt: new Date(),
        },
      });

    await recordAudit(req, { userId: dbUser.id, event: "payment_created", metadata: { externalReference, plan: parsed.data.plan } });
    return res.json({ ok: true, preapprovalId: preapproval.id, initPoint: preapproval.init_point });
  } catch (error: any) {
    console.error("[payments/subscribe] error:", error);
    return res.status(500).json({ message: "No se pudo iniciar la suscripción" });
  }
});

// --- Payment history ---------------------------------------------------------
router.get("/history", requireAuth, async (req: AuthenticatedRequest, res) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  const rows = await db.select().from(payments).where(eq(payments.userId, dbUser.id));
  return res.json({ payments: rows });
});

router.get("/subscription/:businessId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const businessId = Number(req.params.businessId);
  const owns = await verifyBusinessOwnership(req, res, businessId);
  if (!owns) return;
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.businessId, businessId)).limit(1);
  return res.json({ subscription: row ?? null });
});

// --- Webhook -----------------------------------------------------------------
// NOTE: no auth middleware; authenticity is enforced by signature validation.
// The app mounts express.raw on this path, so req.body may be a Buffer.
router.post("/webhook", (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString("utf8") || "{}");
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid JSON payload" });
    }
  }
  next();
}, async (req, res) => {
  // Always ACK quickly; MercadoPago retries on non-2xx.
  try {
    const body = req.body ?? {};
    const query = req.query as Record<string, string>;

    const topic = body.type || body.topic || query.type || query.topic || "";
    const dataId = String(body.data?.id ?? query["data.id"] ?? query.id ?? "");

    const signatureValid = validateWebhookSignature({
      signatureHeader: req.headers["x-signature"] as string | undefined,
      requestId: req.headers["x-request-id"] as string | undefined,
      dataId,
    });

    const eventId = req.headers["x-idempotency-key"]
      ? String(req.headers["x-idempotency-key"])
      : `${topic}:${dataId}`;

    await db
      .insert(paymentWebhookEvents)
      .values({
        provider: "mercadopago",
        eventId,
        eventType: body.action,
        topic,
        payload: body,
        signatureValid,
      })
      .onConflictDoNothing();

    if (!signatureValid) {
      console.warn("[payments/webhook] rejected: invalid signature");
      return res.status(401).json({ ok: false });
    }

    if (topic === "payment" || topic === "merchant_order") {
      await processPaymentWebhook(dataId);
    } else if (topic === "preapproval" || topic === "subscription_preapproval") {
      await processPreapprovalWebhook(dataId);
    }

    await db
      .update(paymentWebhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(and(eq(paymentWebhookEvents.provider, "mercadopago"), eq(paymentWebhookEvents.eventId, eventId)));

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[payments/webhook] error:", error);
    // 200 so MercadoPago does not hammer us; failures are logged for replay.
    return res.status(200).json({ ok: false });
  }
});

async function processPaymentWebhook(paymentId: string): Promise<void> {
  if (!paymentId) return;
  const payment = await getPayment(paymentId);
  const externalReference = payment.external_reference;
  if (!externalReference) return;

  const statusMap: Record<string, string> = {
    approved: "approved",
    pending: "pending",
    in_process: "pending",
    rejected: "rejected",
    refunded: "refunded",
    cancelled: "rejected",
  };
  const status = statusMap[payment.status] ?? "pending";

  const [existing] = await db
    .select()
    .from(payments)
    .where(eq(payments.externalReference, externalReference))
    .limit(1);

  if (!existing) return;

  await db
    .update(payments)
    .set({
      providerPaymentId: String(payment.id),
      status,
      statusDetail: payment.status_detail,
      paymentMethod: payment.payment_method_id,
      paidAt: status === "approved" ? new Date() : existing.paidAt,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, existing.id));

  // Deposit payments confirm the booking and must never grant a premium plan.
  const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
  if (status === "approved" && metadata.type === "booking_deposit") {
    const appointmentId = Number(metadata.appointmentId);
    if (Number.isInteger(appointmentId) && appointmentId > 0) {
      await markDepositPaid(appointmentId, String(payment.id));
    }
    return;
  }

  // Prepaid package purchases activate the balance after approval.
  if (metadata.type === "service_package") {
    const purchaseId = Number(metadata.purchaseId);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) return;
    if (status === "approved") {
      await activatePackagePurchase(purchaseId, String(payment.id));
    } else if (status === "rejected") {
      const purchase = await storage.getPackagePurchase(purchaseId);
      if (purchase?.status === "pending") {
        await storage.updatePackagePurchase(purchaseId, { status: "cancelled" });
      }
    }
    return;
  }

  // Grant premium on a successful business payment.
  if (status === "approved" && existing.businessId) {
    await db
      .update(businesses)
      .set({ isPremium: true })
      .where(eq(businesses.id, existing.businessId));
  }
}

async function processPreapprovalWebhook(preapprovalId: string): Promise<void> {
  if (!preapprovalId) return;
  const preapproval = await getPreapproval(preapprovalId);
  const externalReference = preapproval.external_reference;
  if (!externalReference) return;

  const statusMap: Record<string, string> = {
    authorized: "authorized",
    pending: "pending",
    paused: "paused",
    cancelled: "cancelled",
  };
  const status = statusMap[preapproval.status] ?? "pending";

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerPreapprovalId, preapprovalId))
    .limit(1);
  if (!existing) return;

  await db
    .update(subscriptions)
    .set({
      status,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existing.id));

  await db
    .update(businesses)
    .set({ isPremium: status === "authorized" })
    .where(eq(businesses.id, existing.businessId));
}

// --- Frontend bootstrap: public key + plan pricing ---------------------------
router.get("/config", (_req, res) => {
  res.json({
    configured: isMercadoPagoConfigured(),
    publicKey: config.payments.mercadoPago.publicKey,
    sandbox: config.payments.mercadoPago.sandbox,
    plans: PLAN_PRICING,
  });
});

export default router;
