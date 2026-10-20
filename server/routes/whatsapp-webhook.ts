import crypto from "crypto";
import { Router } from "express";
import { config } from "../config.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderPromoMessage } from "../lib/desk-settings.js";
import { getQueueSnapshot } from "../lib/queue-service.js";
import { botHelpMessage, extractInboundMessage, parseBotCommand } from "../lib/whatsapp-bot.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

/**
 * Inbound webhook for the Central Service Bot (Formatika gateway).
 *
 * One platform-owned WhatsApp number serves every business. Customers can ask
 * for a queue ticket, list promos or check a ticket; the bot replies with the
 * correct public links. The owner's personal number is never involved.
 */
const router = Router();

function timingSafeSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Pure helper so the production fail-closed rule is unit-testable. */
export function isWebhookSecretValid(
  provided: string | null | undefined,
  secret: string = config.whatsapp.webhookSecret,
  isProduction: boolean = config.isProduction,
): boolean {
  if (!secret) return !isProduction;
  if (!provided) return false;
  return timingSafeSecret(provided, secret);
}

function verifySecret(req: any): boolean {
  const provided =
    req.get("x-webhook-secret") ||
    req.get("x-formatika-secret") ||
    (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return isWebhookSecretValid(provided);
}

async function resolveBusinessBySlug(slug: string) {
  const normalized = slug.toLowerCase();
  const settings = await storage.getBusinessSettingsByCustomUrl(normalized);
  if (settings) return storage.getBusiness(settings.businessId);
  return storage.getBusinessBySlug(normalized);
}

router.post(["/", "/formatika"], async (req, res) => {
  try {
    if (!verifySecret(req)) {
      return res.status(401).json({ message: "Webhook secret inválido" });
    }

    const inbound = extractInboundMessage(req.body);
    if (!inbound.from) {
      return res.json({ ok: true, ignored: true, reason: "no_sender" });
    }

    await storage
      .createWhatsAppMessage({
        direction: "inbound",
        phone: inbound.from,
        text: inbound.text,
        status: "received",
        providerMessageId: inbound.messageId,
        payload: (req.body ?? {}) as Record<string, unknown>,
      })
      .catch(() => undefined);

    const command = parseBotCommand(inbound.text);
    let reply = botHelpMessage(config.appUrl);
    let businessId: number | null = null;

    if (command.type === "promo") {
      const promo = await storage.getPromoByCode(command.code.toUpperCase());
      if (!promo) {
        reply = `No encontré la promo ${command.code}. Revisa el código o pide *promos <negocio>*.`;
      } else {
        const [business, settings] = await Promise.all([
          storage.getBusiness(promo.businessId),
          getDeskSettings(promo.businessId),
        ]);
        businessId = promo.businessId;
        if (!business || !settings.promosEnabled || promo.status !== "active") {
          reply = "Esa promoción no está disponible en este momento.";
        } else {
          const link = `${config.appUrl.replace(/\/$/, "")}/p/${promo.code}`;
          reply = `${promo.title}\nS/ ${Number(promo.promoPrice).toFixed(2)} · ${promo.date} ${promo.startTime}–${promo.endTime}\n${renderPromoMessage(
            promo.message || settings.promoMessageTemplate,
            {
              title: promo.title,
              businessName: business.name,
              price: `S/ ${Number(promo.promoPrice).toFixed(2)}`,
              link,
            },
          )}`;
        }
      }
    } else if (command.type === "promo_list") {
      const business = await resolveBusinessBySlug(command.slug);
      if (!business) {
        reply = `No encontré el negocio "${command.slug}". Prueba con tu link de Instagram.`;
      } else {
        businessId = business.id;
        const [promos, settings] = await Promise.all([
          storage.getPromosByBusinessId(business.id),
          getDeskSettings(business.id),
        ]);
        const active = promos.filter((promo) => promo.status === "active").slice(0, 5);
        if (!settings.promosEnabled || active.length === 0) {
          reply = `Ahora mismo ${business.name} no tiene promociones activas.`;
        } else {
          reply = [
            `Promos de ${business.name}:`,
            ...active.map(
              (promo) =>
                `• ${promo.title} — S/ ${Number(promo.promoPrice).toFixed(2)} (${promo.date} ${promo.startTime}–${promo.endTime})\n  ${config.appUrl.replace(/\/$/, "")}/p/${promo.code}`,
            ),
            "",
            "Responde *promo <código>* para abrir una.",
          ].join("\n");
        }
      }
    } else if (command.type === "queue") {
      const business = await resolveBusinessBySlug(command.slug);
      if (!business) {
        reply = `No encontré el negocio "${command.slug}".`;
      } else {
        businessId = business.id;
        const settings = await getDeskSettings(business.id);
        if (!settings.queueEnabled) {
          reply = "La cola virtual no está disponible en este negocio.";
        } else {
          reply = `Pide tu turno en ${business.name} aquí: ${config.appUrl.replace(/\/$/, "")}/q/${business.id}`;
        }
      }
    }

    if (command.type === "ticket_status") {
      const ticket = await storage.getQueueTicketByToken(command.token);
      if (!ticket) {
        reply = "No encontré ese turno. Revisa el enlace o escríbenos de nuevo.";
      } else {
        businessId = ticket.businessId;
        const snapshot = await getQueueSnapshot(ticket.businessId);
        const view = snapshot.tickets.find((item) => item.id === ticket.id);
        if (ticket.status === "waiting" || ticket.status === "notified") {
          reply = `Turno ${ticket.name}: posición #${view?.position ?? "?"} · espera ~${view?.etaMinutes ?? 0} min (${ticket.status === "notified" ? "ya te avisaron" : "en espera"}).`;
        } else if (ticket.status === "seated") {
          reply = `Turno ${ticket.name}: ya estás en la silla.`;
        } else if (ticket.status === "served") {
          reply = `Turno ${ticket.name}: atendido. ¡Gracias!`;
        } else {
          reply = `Turno ${ticket.name}: ${ticket.status}.`;
        }
      }
    }

    const sendResult = await sendWhatsAppMessage({
      to: inbound.from,
      text: reply,
      businessId,
      payload: { type: "bot_reply", command: command.type, inboundId: inbound.messageId },
    });

    res.json({
      ok: true,
      handled: command.type,
      reply,
      delivered: sendResult.sent,
      skipped: Boolean(sendResult.skipped),
    });
  } catch (error: any) {
    console.error("Error handling WhatsApp webhook:", error);
    res.status(500).json({ message: "Error procesando el mensaje" });
  }
});

export default router;
