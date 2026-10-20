import { randomBytes, randomUUID } from "crypto";
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import {
  PAYMENT_METHODS,
  appointments,
  clients,
  insertServiceTransactionSchema,
  payments,
  type Appointment,
  type PaymentMethod,
  type Service,
  type ServiceTransaction,
} from "../../shared/schema.js";
import { verifyBusinessOwnership } from "../auth-helpers.js";
import { requireAuth, type AuthenticatedRequest } from "../auth-middleware.js";
import { storage } from "../storage.js";
import { addDaysISO, isISODate, limaDateISO, limaDayBounds, limaTimeHM } from "../lib/dates.js";
import { getQueueSnapshot, whatsAppLink } from "../lib/queue-service.js";
import {
  getDeskSettings,
  normalizeDeskSettings,
  renderQueueMessage,
  renderRetentionMessage,
} from "../lib/desk-settings.js";
import { findLapsedClients } from "../lib/retention.js";
import { runWhatsAppReminderPass } from "../jobs/reminders.js";
import { runReviewRequestPass } from "../jobs/reviews.js";
import { config } from "../config.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { notifyNextQueueTicket } from "../lib/queue-notify.js";
import { markDepositPaid, waiveDeposit } from "../lib/deposits.js";
import { notifyWaitlistForSlot } from "../lib/waitlist.js";
import { awardLoyaltyStamp } from "../lib/loyalty.js";
import { loyaltyProgress, redeemLoyaltyReward } from "../lib/loyalty.js";
import { redeemPackageUse, validatePackageRedemption } from "../lib/packages.js";

/**
 * "Desk" endpoints behind the owner's mobile home screen ("Hoy"):
 * Chair Mode walk-ins, finishing a service with one-tap cash logging, and the
 * daily cash drawer. These are deliberately separate from the MercadoPago
 * `payments` table: Yape/Plin/cash never produce a webhook.
 */
const router = Router();

router.use(requireAuth);

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const walkInSchema = z.object({
  serviceId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  notes: z.string().trim().max(500).optional(),
  // The owner can intentionally double-book the chair ("Sentar igual").
  force: z.boolean().optional().default(false),
});

const finishSchema = z.object({
  method: z.enum(PAYMENT_METHODS).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  tipAmount: z.union([z.string(), z.number()]).optional(),
  note: z.string().trim().max(500).optional(),
  serviceName: z.string().trim().max(120).optional(),
  packagePurchaseId: z.number().int().positive().optional(),
});

const queueActionSchema = z.object({
  force: z.boolean().optional().default(false),
});

const depositActionSchema = z.object({
  status: z.enum(["paid", "waived", "released"]),
  method: z.enum(PAYMENT_METHODS).optional(),
});

const deskSettingsSchema = z.object({
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1),
  allowTips: z.boolean(),
  queueEnabled: z.boolean(),
  queueOpen: z.boolean(),
  defaultDurationMinutes: z.number().int().min(5).max(240),
  maxQueueLength: z.number().int().min(0).max(200),
  notificationTemplate: z.string().trim().min(10).max(300),
  retentionDays: z.number().int().min(7).max(180),
  retentionMessage: z.string().trim().min(10).max(300),
  promosEnabled: z.boolean(),
  ownerWhatsApp: z.string().trim().min(6).max(30).nullable().optional(),
  notifyOwnerOnClaim: z.boolean(),
  promoMessageTemplate: z.string().trim().min(10).max(300),
  showQueueOnMicrosite: z.boolean(),
  showPromosOnMicrosite: z.boolean(),
  whatsappRemindersEnabled: z.boolean(),
  reminderHoursBefore: z.number().int().min(1).max(72),
  whatsappReminderTemplate: z.string().trim().min(10).max(400),
  whatsappConfirmationsEnabled: z.boolean(),
  whatsappConfirmationTemplate: z.string().trim().min(10).max(400),
  queueWhatsappEnabled: z.boolean(),
  queueJoinedTemplate: z.string().trim().min(10).max(400),
  queueCalledTemplate: z.string().trim().min(10).max(400),
  depositEnabled: z.boolean(),
  depositType: z.enum(["percent", "fixed"]),
  depositValue: z.number().min(1).max(500),
  depositHoldMinutes: z.number().int().min(5).max(120),
  depositMessageTemplate: z.string().trim().min(10).max(400),
  depositPolicy: z.string().trim().min(10).max(500),
  reviewRequestsEnabled: z.boolean(),
  reviewDelayMinutes: z.number().int().min(0).max(1440),
  reviewMessageTemplate: z.string().trim().min(10).max(400),
  waitlistEnabled: z.boolean(),
  showWaitlistOnMicrosite: z.boolean(),
  waitlistNotifyLimit: z.number().int().min(1).max(10),
  waitlistMessageTemplate: z.string().trim().min(10).max(400),
  loyaltyEnabled: z.boolean(),
  showLoyaltyOnMicrosite: z.boolean(),
  loyaltyStampsRequired: z.number().int().min(2).max(20),
  loyaltyReward: z.string().trim().min(3).max(80),
  loyaltyMessageTemplate: z.string().trim().min(10).max(400),
  loyaltyRewardMessageTemplate: z.string().trim().min(10).max(400),
  packagesEnabled: z.boolean(),
  showPackagesOnMicrosite: z.boolean(),
  packageSaleMessageTemplate: z.string().trim().min(10).max(400),
  packageUseMessageTemplate: z.string().trim().min(10).max(400),
  packageLowBalanceMessageTemplate: z.string().trim().min(10).max(400),
  packageExpiryMessageTemplate: z.string().trim().min(10).max(400),
});

const queueStatusSchema = z.object({
  open: z.boolean(),
});

const transactionsQuerySchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function timeToMinutes(value: string): number {
  const [h, m] = String(value || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesToTime(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(num) ? num : 0;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

async function authorizeBusiness(req: AuthenticatedRequest, res: any): Promise<number | null> {
  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    res.status(400).json({ message: "Negocio inválido" });
    return null;
  }
  const user = await verifyBusinessOwnership(req, res, businessId);
  if (!user) return null;
  return businessId;
}

async function findOrCreateClient(
  businessId: number,
  name: string | undefined,
  phone: string | null | undefined,
) {
  const normalizedPhone = phone?.trim() || null;
  const phoneDigits = normalizedPhone?.replace(/\D/g, "") ?? "";
  let client: Awaited<ReturnType<typeof storage.getClient>> | undefined;
  if (phoneDigits) {
    // Phone formats vary (`+51 999…`, `999…`, `51…`); compare digits only so a
    // bono sold over WhatsApp and a later walk-in land on the same client.
    const clientsInBusiness = await storage.getClientsByBusinessId(businessId);
    client = clientsInBusiness.find(
      (candidate) => (candidate.phone ?? "").replace(/\D/g, "") === phoneDigits,
    );
  }

  if (!client) {
    client = await storage.createClient({
      businessId,
      name: name?.trim() || "Cliente",
      phone: normalizedPhone,
      email: null,
      notes: null,
    } as any);
  }
  return client;
}

/**
 * Shared "seat now" path for walk-ins and queue tickets. Creates the
 * `in_progress` appointment that both the chair display and analytics use.
 */
async function createSeatedAppointment(params: {
  businessId: number;
  clientId: number;
  service: Service;
  notes?: string | null;
  source: "walk_in" | "queue";
  defaultDurationMinutes?: number;
}) {
  const date = limaDateISO();
  const time = limaTimeHM();
  const fallbackDuration = params.defaultDurationMinutes ?? 30;
  const appointment = await storage.createAppointment({
    businessId: params.businessId,
    clientId: params.clientId,
    serviceId: params.service.id,
    date,
    time,
    duration:
      params.service.duration && params.service.duration > 0
        ? params.service.duration
        : fallbackDuration,
    status: "in_progress",
    notes: params.notes ?? null,
    clientNotes: null,
    price: params.service.price ?? null,
    source: params.source,
    startedAt: new Date(),
    cancelToken: randomBytes(24).toString("hex"),
  } as any);

  return { appointment, date, time };
}

function resolveRange(req: AuthenticatedRequest): { date: string | null; from: Date; to: Date } {
  const parsed = transactionsQuerySchema.parse(req.query ?? {});
  if (parsed.from || parsed.to) {
    const today = limaDateISO();
    const fromISO = isISODate(parsed.from) ? parsed.from : today;
    const toISO = isISODate(parsed.to) ? parsed.to : fromISO;
    return {
      date: null,
      from: limaDayBounds(fromISO).from,
      to: limaDayBounds(toISO).to,
    };
  }
  const date = isISODate(parsed.date) ? parsed.date : limaDateISO();
  return { date, ...limaDayBounds(date) };
}


function summarizeTransactions(transactions: ServiceTransaction[]) {
  const total = money(transactions.reduce((sum, tx) => sum + toNumber(tx.amount), 0));
  const tips = money(transactions.reduce((sum, tx) => sum + toNumber(tx.tipAmount), 0));

  const byMethod = PAYMENT_METHODS.map((method) => {
    const bucket = transactions.filter((tx) => tx.method === method);
    return {
      method,
      label: METHOD_LABELS[method],
      total: money(bucket.reduce((sum, tx) => sum + toNumber(tx.amount), 0)),
      count: bucket.length,
    };
  });

  const serviceMap = new Map<string, { name: string; total: number; count: number }>();
  for (const tx of transactions) {
    const name = tx.serviceName?.trim() || "Otros";
    const entry = serviceMap.get(name) ?? { name, total: 0, count: 0 };
    entry.total = money(entry.total + toNumber(tx.amount));
    entry.count += 1;
    serviceMap.set(name, entry);
  }

  return {
    total,
    tips,
    count: transactions.length,
    byMethod,
    byService: Array.from(serviceMap.values()).sort((a, b) => b.total - a.total),
    transactions,
  };
}

function chairState(todayAppointments: Appointment[]) {
  // The physical chair is busy only once the owner has seated someone. Booked
  // appointments that have not arrived must not block a walk-in.
  const active = todayAppointments.find((appointment) => appointment.status === "in_progress");

  if (!active) return { busy: false as const, until: null, appointmentId: null };

  // If the owner seated a booked client late, the chair frees later than the
  // scheduled slot. Chair Mode sets `startedAt`, so prefer it when present.
  const startedMinutes = active.startedAt
    ? timeToMinutes(limaTimeHM(new Date(active.startedAt)))
    : timeToMinutes(active.time);

  return {
    busy: true as const,
    until: minutesToTime(startedMinutes + (active.duration || 30)),
    appointmentId: active.id,
  };
}

function decorateAppointments(
  todayAppointments: Appointment[],
  clientNames: Map<number, string>,
  serviceNames: Map<number, string>,
) {
  return todayAppointments
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((appointment) => {
      const startMinutes = appointment.startedAt
        ? timeToMinutes(limaTimeHM(new Date(appointment.startedAt)))
        : timeToMinutes(appointment.time);
      return {
        ...appointment,
        clientName: clientNames.get(appointment.clientId) ?? "Cliente",
        serviceName: serviceNames.get(appointment.serviceId) ?? "Servicio",
        endTime: minutesToTime(startMinutes + (appointment.duration || 30)),
      };
    });
}

// ---------------------------------------------------------------------------
// Today ("Hoy")
// ---------------------------------------------------------------------------

router.get("/:businessId/today", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const date = isISODate(req.query.date) ? (req.query.date as string) : limaDateISO();
    const bounds = limaDayBounds(date);

    const [todayAppointments, services, clientsList, transactions] = await Promise.all([
      storage.getAppointmentsByDate(businessId, date),
      storage.getServicesByBusinessId(businessId),
      storage.getClientsByBusinessId(businessId),
      storage.getServiceTransactions(businessId, bounds.from, bounds.to),
    ]);

    const yesterday = addDaysISO(date, -1);
    const previousDay = await storage.getServiceTransactions(
      businessId,
      limaDayBounds(yesterday).from,
      limaDayBounds(yesterday).to,
    );

    const clientNames = new Map(clientsList.map((client) => [client.id, client.name]));
    const serviceNames = new Map(services.map((service) => [service.id, service.name]));
    const decorated = decorateAppointments(todayAppointments, clientNames, serviceNames);

    const chair = chairState(todayAppointments);
    const activeAppointment = chair.busy
      ? decorated.find((appointment) => appointment.id === chair.appointmentId) ?? null
      : null;

    const deskSettings = await getDeskSettings(businessId);
    const purchases = deskSettings.packagesEnabled
      ? await storage.getPackagePurchasesByBusinessId(businessId)
      : [];
    const packageUsesByClient = new Map<number, number>();
    for (const purchase of purchases) {
      if (purchase.status !== "active" || purchase.usesRemaining <= 0 || !purchase.clientId) {
        continue;
      }
      if (purchase.expiresAt && new Date(purchase.expiresAt).getTime() <= Date.now()) continue;
      packageUsesByClient.set(
        purchase.clientId,
        (packageUsesByClient.get(purchase.clientId) ?? 0) + purchase.usesRemaining,
      );
    }
    const decoratedWithPackages = decorated.map((appointment) => ({
      ...appointment,
      packageUsesRemaining: appointment.clientId
        ? packageUsesByClient.get(appointment.clientId) ?? null
        : null,
    }));

    res.json({
      date,
      now: limaTimeHM(),
      deskSettings,
      appointments: decoratedWithPackages,
      chair: {
        ...chair,
        clientName: activeAppointment?.clientName ?? null,
        serviceName: activeAppointment?.serviceName ?? null,
      },
      cash: summarizeTransactions(transactions),
      previousDayTotal: money(previousDay.reduce((sum, tx) => sum + toNumber(tx.amount), 0)),
      stats: {
        walkIns: decorated.filter((appointment) => appointment.source === "walk_in").length,
        completed: decorated.filter((appointment) => appointment.status === "completed").length,
        waiting: decorated.filter((appointment) => ["pending", "confirmed"].includes(appointment.status)).length,
      },
      services,
    });
  } catch (error: any) {
    console.error("Error loading today's desk:", error);
    res.status(500).json({ message: "Error cargando el día de hoy" });
  }
});

// ---------------------------------------------------------------------------
// Chair Mode: "Sentar cliente ahora"
// ---------------------------------------------------------------------------

router.post("/:businessId/walk-ins", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = walkInSchema.parse(req.body ?? {});
    const service = await storage.getService(body.serviceId);
    if (!service || service.businessId !== businessId) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }
    const deskSettings = await getDeskSettings(businessId);

    const date = limaDateISO();
    const todayAppointments = await storage.getAppointmentsByDate(businessId, date);

    const chair = chairState(todayAppointments);
    if (chair.busy && !body.force) {
      return res.status(409).json({
        message: "La silla está ocupada",
        chair,
      });
    }

    // `appointments.client_id` and `service_id` are NOT NULL sequence columns,
    // so a walk-in always gets a real client row. Phone is the only dedupe key.
    const client = await findOrCreateClient(businessId, body.name, body.phone);
    const { appointment, time } = await createSeatedAppointment({
      businessId,
      clientId: client.id,
      service,
      notes: body.notes ?? null,
      source: "walk_in",
      defaultDurationMinutes: deskSettings.defaultDurationMinutes,
    });

    res.status(201).json({
      appointment,
      client,
      service,
      chair: {
        busy: true,
        until: minutesToTime(timeToMinutes(time) + (appointment.duration || 30)),
        appointmentId: appointment.id,
        clientName: client.name,
        serviceName: service.name,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error creating walk-in:", error);
    res.status(500).json({ message: "Error registrando al cliente" });
  }
});

/**
 * Owner-facing configuration for the desk. This is what makes the features
 * self-service: no admin or deploy needed to turn the queue on/off, choose
 * payment methods, set the fallback duration or edit the WhatsApp message.
 */
router.get("/:businessId/desk-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;
    res.json(await getDeskSettings(businessId));
  } catch (error: any) {
    console.error("Error loading desk settings:", error);
    res.status(500).json({ message: "Error cargando la configuración" });
  }
});

router.put("/:businessId/desk-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = deskSettingsSchema.parse(req.body ?? {});
    const saved = await storage.updateBusinessSettings(businessId, {
      deskSettings: body,
    } as any);

    res.json(normalizeDeskSettings(saved.deskSettings));
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({
        message: "Revisa la configuración",
        issues: error.issues,
      });
    }
    console.error("Error saving desk settings:", error);
    res.status(500).json({ message: "Error guardando la configuración" });
  }
});

/** One-tap open/close used by the "Cola virtual" card on Hoy. */
router.patch("/:businessId/desk-settings/queue-status", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = queueStatusSchema.parse(req.body ?? {});
    const current = await getDeskSettings(businessId);
    const next = { ...current, queueOpen: body.open };
    const saved = await storage.updateBusinessSettings(businessId, {
      deskSettings: next,
    } as any);

    res.json(normalizeDeskSettings(saved.deskSettings));
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos" });
    }
    console.error("Error toggling queue status:", error);
    res.status(500).json({ message: "Error cambiando el estado de la cola" });
  }
});

/** Owner-triggered WhatsApp reminder pass for their shop (same job as cron). */
router.post("/:businessId/reminders/run", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const summary = await runWhatsAppReminderPass(new Date(), businessId);
    res.json(summary);
  } catch (error: any) {
    console.error("Error running WhatsApp reminders:", error);
    res.status(500).json({ message: "Error enviando recordatorios" });
  }
});

/** Manual "send review requests now" from Configuración → Operación. */
router.post("/:businessId/reviews/run", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const summary = await runReviewRequestPass(businessId);
    res.json(summary);
  } catch (error: any) {
    console.error("Error running review requests:", error);
    res.status(500).json({ message: "Error enviando solicitudes de reseña" });
  }
});

/**
 * Waitlist overview for the Hoy card. Active entries only (waiting/notified);
 * claimed/cancelled rows remain for audit.
 */
router.get("/:businessId/waitlist", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const today = limaDateISO();
    const [entries, services] = await Promise.all([
      storage.getWaitlistEntriesByBusinessId(businessId),
      storage.getServicesByBusinessId(businessId),
    ]);
    const serviceNames = new Map(services.map((service) => [service.id, service.name]));
    const active = entries.filter(
      (entry) => ["waiting", "notified"].includes(entry.status) && entry.date >= today,
    );

    res.json({
      count: active.length,
      waitingCount: active.filter((entry) => entry.status === "waiting").length,
      notifiedCount: active.filter((entry) => entry.status === "notified").length,
      entries: active.map((entry) => ({
        ...entry,
        serviceName: entry.serviceId ? serviceNames.get(entry.serviceId) ?? "Servicio" : "Cualquier servicio",
      })),
    });
  } catch (error: any) {
    console.error("Error loading waitlist:", error);
    res.status(500).json({ message: "Error cargando la lista de espera" });
  }
});

router.delete("/:businessId/waitlist/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const entry = await storage.getWaitlistEntry(Number(req.params.id));
    if (!entry || entry.businessId !== businessId) {
      return res.status(404).json({ message: "Entrada no encontrada" });
    }
    if (!["waiting", "notified"].includes(entry.status)) {
      return res.status(409).json({ message: "Esta entrada ya no está activa" });
    }

    const updated = await storage.updateWaitlistEntry(entry.id, { status: "cancelled" });
    res.json({ entry: updated });
  } catch (error: any) {
    console.error("Error cancelling waitlist entry:", error);
    res.status(500).json({ message: "Error quitando de la lista" });
  }
});

/** Loyalty cards for the owner's loyalty page / Hoy summary. */
router.get("/:businessId/loyalty", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const [settings, cards] = await Promise.all([
      getDeskSettings(businessId),
      storage.getLoyaltyCardsByBusinessId(businessId),
    ]);

    const enriched = cards.map((card) => {
      const progress = loyaltyProgress(
        card.totalStamps,
        card.rewardsRedeemed,
        settings.loyaltyStampsRequired,
      );
      return {
        ...card,
        progress: progress.progress,
        availableRewards: progress.availableRewards,
        required: progress.required,
        reward: settings.loyaltyReward,
      };
    });

    res.json({
      enabled: settings.loyaltyEnabled,
      required: settings.loyaltyStampsRequired,
      reward: settings.loyaltyReward,
      cards: enriched,
      count: enriched.length,
      rewardsReady: enriched.reduce((sum, card) => sum + card.availableRewards, 0),
    });
  } catch (error: any) {
    console.error("Error loading loyalty cards:", error);
    res.status(500).json({ message: "Error cargando las tarjetas" });
  }
});

router.post("/:businessId/loyalty/:cardId/redeem", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const result = await redeemLoyaltyReward(businessId, Number(req.params.cardId));
    if (!result.ok) {
      const messages = {
        not_found: "Tarjeta no encontrada",
        no_reward: "Esta tarjeta no tiene una recompensa disponible",
        disabled: "El programa de lealtad está desactivado",
      };
      return res.status(result.reason === "not_found" ? 404 : 409).json({
        message: messages[result.reason],
      });
    }

    res.json({
      card: result.card,
      progress: result.progress,
      message: "Recompensa canjeada",
    });
  } catch (error: any) {
    console.error("Error redeeming loyalty reward:", error);
    res.status(500).json({ message: "Error canjeando la recompensa" });
  }
});

/**
 * "Ya te toca corte": clients past the owner's retention window, with a ready
 * wa.me link built from their configurable message template.
 */
router.get("/:businessId/retention", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const [settings, clientsList, appointmentsList, business] = await Promise.all([
      getDeskSettings(businessId),
      storage.getClientsByBusinessId(businessId),
      storage.getAppointmentsByBusinessId(businessId),
      storage.getBusiness(businessId),
    ]);

    const lapsed = findLapsedClients({
      clients: clientsList,
      appointments: appointmentsList,
      days: settings.retentionDays,
      todayISO: limaDateISO(),
    });

    res.json({
      days: settings.retentionDays,
      count: lapsed.length,
      messageTemplate: settings.retentionMessage,
      clients: lapsed.map((client) => ({
        ...client,
        whatsappUrl: whatsAppLink(
          client.phone,
          renderRetentionMessage(settings.retentionMessage, {
            name: client.name,
            businessName: business?.name ?? "el negocio",
            days: client.daysSince,
          }),
        ),
      })),
    });
  } catch (error: any) {
    console.error("Error loading retention list:", error);
    res.status(500).json({ message: "Error cargando clientes para recuperar" });
  }
});

/**
 * Owner-side virtual queue: read the live line, notify by WhatsApp, seat or
 * skip a ticket. Positions/ETAs come from the same engine the public page uses.
 */
router.get("/:businessId/queue", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const snapshot = await getQueueSnapshot(businessId);

    res.json({
      tickets: snapshot.tickets,
      waitingCount: snapshot.waitingCount,
      estimatedWaitMinutes: snapshot.estimatedWaitMinutes,
      settings: snapshot.settings,
      seated: snapshot.seated
        ? {
            appointmentId: snapshot.seated.id,
            serviceName: snapshot.seatedServiceName,
            remainingMinutes: snapshot.plan.remainingChairMinutes,
          }
        : null,
      services: snapshot.services,
      sharePath: `/q/${businessId}`,
      qrPath: `/api/public/queue/${businessId}/qr`,
    });
  } catch (error: any) {
    console.error("Error loading owner queue:", error);
    res.status(500).json({ message: "Error cargando la cola" });
  }
});

router.post("/:businessId/queue/tickets/:id/call", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const ticket = await storage.getQueueTicket(Number(req.params.id));
    if (!ticket || ticket.businessId !== businessId) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    if (!["waiting", "notified"].includes(ticket.status)) {
      return res.status(409).json({ message: "Este turno ya no está en la cola" });
    }

    const business = await storage.getBusiness(businessId);
    const settings = await getDeskSettings(businessId);
    const updated = await storage.updateQueueTicket(ticket.id, {
      status: "notified",
      notifiedAt: new Date(),
    });

    const link = `${config.appUrl.replace(/\/$/, "")}/q/${businessId}?ticket=${ticket.token}`;
    const text = renderQueueMessage(settings.queueCalledTemplate, {
      name: ticket.name,
      businessName: business?.name ?? "el local",
      link,
    });

    // Automatic ping via the central bot; the wa.me link stays as a fallback
    // for owners whose gateway is not configured or who disabled automatic
    // queue updates.
    const result = settings.queueWhatsappEnabled
      ? await sendWhatsAppMessage({
          businessId,
          to: ticket.phone,
          text,
          payload: { type: "queue_called", ticketId: ticket.id },
        })
      : { sent: false, skipped: true };
    const whatsappUrl = whatsAppLink(ticket.phone, text);

    res.json({ ticket: updated, whatsappUrl, sent: result.sent, skipped: Boolean(result.skipped) });
  } catch (error: any) {
    console.error("Error notifying queue ticket:", error);
    res.status(500).json({ message: "Error avisando al cliente" });
  }
});

/** Seat the next queued customer: creates the in-progress appointment. */
router.post("/:businessId/queue/tickets/:id/seat", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = queueActionSchema.parse(req.body ?? {});
    const ticket = await storage.getQueueTicket(Number(req.params.id));
    if (!ticket || ticket.businessId !== businessId) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    if (!["waiting", "notified"].includes(ticket.status)) {
      return res.status(409).json({ message: "Este turno ya no está en la cola" });
    }

    const service = ticket.serviceId ? await storage.getService(ticket.serviceId) : undefined;
    if (!service || service.businessId !== businessId) {
      return res.status(400).json({ message: "El servicio del turno no está disponible" });
    }
    const deskSettings = await getDeskSettings(businessId);

    const todayAppointments = await storage.getAppointmentsByDate(businessId, limaDateISO());
    const chair = chairState(todayAppointments);
    if (chair.busy && !body.force) {
      return res.status(409).json({ message: "La silla está ocupada", chair });
    }

    const clientId =
      ticket.clientId ?? (await findOrCreateClient(businessId, ticket.name, ticket.phone)).id;

    const { appointment, time } = await createSeatedAppointment({
      businessId,
      clientId,
      service,
      notes: ticket.notes,
      source: "queue",
      defaultDurationMinutes: deskSettings.defaultDurationMinutes,
    });

    const updatedTicket = await storage.updateQueueTicket(ticket.id, {
      status: "seated",
      seatedAt: new Date(),
      appointmentId: appointment.id,
    });

    void notifyNextQueueTicket(businessId).catch((error) =>
      console.error("Error notifying next queue ticket:", error),
    );

    res.status(201).json({
      appointment,
      ticket: updatedTicket,
      chair: {
        busy: true,
        until: minutesToTime(timeToMinutes(time) + (appointment.duration || 30)),
        appointmentId: appointment.id,
        clientName: ticket.name,
        serviceName: service.name,
      },
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error seating queue ticket:", error);
    res.status(500).json({ message: "Error sentando al cliente" });
  }
});

/** Mark a queued customer as gone (left / never showed up). */
router.post("/:businessId/queue/tickets/:id/skip", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const ticket = await storage.getQueueTicket(Number(req.params.id));
    if (!ticket || ticket.businessId !== businessId) {
      return res.status(404).json({ message: "Turno no encontrado" });
    }
    if (!["waiting", "notified"].includes(ticket.status)) {
      return res.status(409).json({ message: "Este turno ya no está en la cola" });
    }

    const updated = await storage.updateQueueTicket(ticket.id, {
      status: "left",
      closedAt: new Date(),
    });
    void notifyNextQueueTicket(businessId).catch((error) =>
      console.error("Error notifying next queue ticket:", error),
    );
    res.json({ ticket: updated });
  } catch (error: any) {
    console.error("Error skipping queue ticket:", error);
    res.status(500).json({ message: "Error quitando el turno" });
  }
});

/** Seat a client who already has a booking for today. */
router.post("/:businessId/appointments/:id/seat", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const appointmentId = Number(req.params.id);
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment || appointment.businessId !== businessId) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    const updated = await db
      .update(appointments)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(appointments.id, appointmentId))
      .returning();

    res.json({ appointment: updated[0] });
  } catch (error: any) {
    console.error("Error seating appointment:", error);
    res.status(500).json({ message: "Error sentando al cliente" });
  }
});

/**
 * "Terminar y cobrar": completes the visit and, when a payment method is given,
 * writes the cash-drawer entry in the same request.
 */
router.patch("/:businessId/appointments/:id/finish", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const appointmentId = Number(req.params.id);
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment || appointment.businessId !== businessId) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    if (appointment.status === "completed") {
      return res.status(409).json({ message: "Esta cita ya fue terminada" });
    }

    const body = finishSchema.parse(req.body ?? {});
    const deskSettings = await getDeskSettings(businessId);
    if (body.method && !deskSettings.paymentMethods.includes(body.method)) {
      return res.status(400).json({ message: "Ese método de pago no está habilitado en tu configuración" });
    }

    const service = await storage.getService(appointment.serviceId);
    const serviceName = body.serviceName || service?.name || "Servicio";

    if (body.packagePurchaseId) {
      const validation = await validatePackageRedemption({
        purchaseId: body.packagePurchaseId,
        businessId,
        appointment,
      });
      if (!validation.ok) {
        const messages = {
          not_found: "Bono no encontrado",
          not_active: "Ese bono no está activo",
          empty: "Ese bono ya no tiene usos",
          expired: "Ese bono venció",
          wrong_client: "El bono pertenece a otro cliente",
          wrong_service: "El bono no cubre este servicio",
        };
        return res.status(409).json({ message: messages[validation.reason] });
      }
    }

    const updated = await db
      .update(appointments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(appointments.id, appointmentId))
      .returning();

    // If this visit came from the virtual queue, close the ticket so the
    // customer's public page switches to "atendido".
    const queueTicket = await storage.getQueueTicketByAppointmentId(appointment.id);
    if (queueTicket && queueTicket.status !== "served") {
      await storage.updateQueueTicket(queueTicket.id, { status: "served", closedAt: new Date() });
    }
    void notifyNextQueueTicket(businessId).catch((error) =>
      console.error("Error notifying next queue ticket:", error),
    );

    let transaction: ServiceTransaction | null = null;
    if (body.method) {
      const amount = money(
        body.amount !== undefined ? toNumber(body.amount) : toNumber(appointment.price ?? service?.price ?? 0),
      );

      if (amount > 0) {
        transaction = await storage.createServiceTransaction({
          businessId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          serviceId: appointment.serviceId,
          serviceName,
          amount: amount.toFixed(2),
          tipAmount: (deskSettings.allowTips ? money(toNumber(body.tipAmount)) : 0).toFixed(2),
          method: body.method,
          note: body.note ?? null,
          occurredAt: new Date(),
        });
      }
    }

    // Prepaid package: consume one use for this visit.
    let packageRedemption = null;
    if (body.packagePurchaseId) {
      const result = await redeemPackageUse({
        purchaseId: body.packagePurchaseId,
        businessId,
        appointmentId: appointment.id,
      });
      if (!result.ok) {
        return res.status(409).json({ message: "No se pudo usar el bono" });
      }
      packageRedemption = {
        purchaseId: result.purchase.id,
        usesRemaining: result.purchase.usesRemaining,
        status: result.purchase.status,
        alreadyRedeemed: Boolean(result.alreadyRedeemed),
      };
    }

    // Loyalty stamp: idempotent by appointment id, fire-and-forget.
    if (appointment.clientId) {
      const loyaltyClient = await storage.getClient(appointment.clientId);
      if (loyaltyClient?.phone) {
        void awardLoyaltyStamp({
          businessId,
          appointmentId: appointment.id,
          clientId: loyaltyClient.id,
          name: loyaltyClient.name,
          phone: loyaltyClient.phone,
        }).catch((error) => console.error("Loyalty stamp failed:", error));
      }
    }

    res.json({ appointment: updated[0], transaction, serviceName, packageRedemption });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error finishing appointment:", error);
    res.status(500).json({ message: "Error terminando el servicio" });
  }
});


/**
 * Deposit actions from Hoy: mark cash/Yape received, waive it for a trusted
 * client, or release the unpaid hold so the slot becomes bookable again.
 */
router.patch("/:businessId/appointments/:id/deposit", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = depositActionSchema.parse(req.body ?? {});
    const appointment = await storage.getAppointment(Number(req.params.id));
    if (!appointment || appointment.businessId !== businessId) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    if (!appointment.depositAmount || appointment.depositStatus !== "pending") {
      return res.status(409).json({ message: "Esta cita no tiene un depósito pendiente" });
    }
    if (appointment.status !== "pending") {
      return res.status(409).json({ message: "Esta cita ya no está pendiente" });
    }

    if (body.status === "released") {
      const updated = await storage.updateAppointment(appointment.id, {
        status: "cancelled",
        depositStatus: "expired",
      } as any);
      void notifyWaitlistForSlot({
        businessId,
        serviceId: appointment.serviceId,
        date: appointment.date,
        time: appointment.time,
      }).catch((error) => console.error("Waitlist notification failed:", error));
      return res.json({ appointment: updated, status: "released" });
    }

    if (body.status === "waived") {
      const updated = await waiveDeposit(appointment.id);
      return res.json({ appointment: updated, status: "waived" });
    }

    const deskSettings = await getDeskSettings(businessId);
    const method = body.method ?? "cash";
    if (!deskSettings.paymentMethods.includes(method)) {
      return res.status(400).json({ message: "Ese método de pago no está habilitado" });
    }

    const amount = Number(appointment.depositAmount);
    if (!(amount > 0)) return res.status(400).json({ message: "Monto de depósito inválido" });

    await db.insert(payments).values({
      userId: null,
      businessId,
      provider: "manual",
      providerPaymentId: null,
      externalReference: `deposit_manual_${randomUUID()}`,
      amount: amount.toFixed(2),
      currency: "PEN",
      status: "approved",
      description: `Depósito de cita #${appointment.id}`,
      paymentMethod: method,
      paidAt: new Date(),
      metadata: {
        type: "booking_deposit",
        appointmentId: appointment.id,
        businessId,
        manual: true,
        method,
      },
    });

    const result = await markDepositPaid(appointment.id);
    return res.json({
      appointment: result.appointment,
      status: "paid",
      amount,
      method,
      alreadyPaid: result.alreadyPaid,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error updating appointment deposit:", error);
    res.status(500).json({ message: "Error actualizando el depósito" });
  }
});


// ---------------------------------------------------------------------------
// Cash drawer ("Caja de hoy")
// ---------------------------------------------------------------------------

router.get("/:businessId/cashflow/summary", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const range = resolveRange(req);
    const transactions = await storage.getServiceTransactions(businessId, range.from, range.to);
    const summary = summarizeTransactions(transactions);

    let previousTotal: number | null = null;
    if (range.date) {
      const previousDate = addDaysISO(range.date, -1);
      const previous = await storage.getServiceTransactions(
        businessId,
        limaDayBounds(previousDate).from,
        limaDayBounds(previousDate).to,
      );
      previousTotal = money(previous.reduce((sum, tx) => sum + toNumber(tx.amount), 0));
    }

    res.json({
      ...summary,
      date: range.date,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      previousTotal,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Rango de fechas inválido" });
    }
    console.error("Error loading cashflow summary:", error);
    res.status(500).json({ message: "Error cargando la caja" });
  }
});

router.get("/:businessId/cashflow/transactions", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const range = resolveRange(req);
    const transactions = await storage.getServiceTransactions(businessId, range.from, range.to);
    res.json({ date: range.date, transactions, total: summarizeTransactions(transactions).total });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Rango de fechas inválido" });
    }
    console.error("Error loading cashflow transactions:", error);
    res.status(500).json({ message: "Error cargando los movimientos" });
  }
});

router.post("/:businessId/cashflow/transactions", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = insertServiceTransactionSchema.parse(req.body ?? {});
    const deskSettings = await getDeskSettings(businessId);
    if (!deskSettings.paymentMethods.includes(body.method)) {
      return res.status(400).json({ message: "Ese método de pago no está habilitado en tu configuración" });
    }

    let serviceName = body.serviceName ?? null;
    if (body.serviceId) {
      const service = await storage.getService(body.serviceId);
      if (!service || service.businessId !== businessId) {
        return res.status(404).json({ message: "Servicio no encontrado" });
      }
      serviceName = serviceName || service.name;
    }

    const transaction = await storage.createServiceTransaction({
      ...body,
      businessId,
      serviceName,
      occurredAt: body.occurredAt ?? new Date(),
      tipAmount: deskSettings.allowTips ? body.tipAmount : "0.00",
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: error.issues });
    }
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Error registrando el ingreso" });
  }
});

router.delete("/:businessId/cashflow/transactions/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const id = Number(req.params.id);
    const transaction = await storage.getServiceTransaction(id);
    if (!transaction || transaction.businessId !== businessId) {
      return res.status(404).json({ message: "Movimiento no encontrado" });
    }

    await storage.deleteServiceTransaction(id);
    res.json({ message: "Movimiento eliminado" });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Error eliminando el movimiento" });
  }
});

export default router;
