/**
 * Inbound WhatsApp handling for the Central Service Bot.
 *
 * The Formatika gateway forwards the raw webhook payload, whose shape can vary
 * between providers/Evolution versions. `extractInboundMessage` is deliberately
 * tolerant; `parseBotCommand` understands a tiny, predictable command language
 * so customers can use the same number for every business.
 */

export interface InboundWhatsAppMessage {
  from: string | null;
  text: string;
  messageId: string | null;
}

type AnyRecord = Record<string, any>;

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function stripJid(value: string | null): string | null {
  if (!value) return null;
  return value.split("@")[0].replace(/\D/g, "") || null;
}

export function extractInboundMessage(payload: unknown): InboundWhatsAppMessage {
  const root = (payload ?? {}) as AnyRecord;
  const data = (root.data ?? {}) as AnyRecord;
  const message = (root.message ?? data.message ?? {}) as AnyRecord;
  const key = (root.key ?? data.key ?? message.key ?? {}) as AnyRecord;
  const entryMessage =
    root.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;

  const from = stripJid(
    firstString(
      root.from,
      root.sender,
      root.phone,
      data.from,
      data.sender,
      message.from,
      key.remoteJid,
      entryMessage?.from,
      root.contact?.wa_id,
    ),
  );

  const text =
    firstString(
      root.text,
      root.body,
      root.messageText,
      data.text,
      data.body,
      message.conversation,
      message.extendedTextMessage?.text,
      message.text?.body,
      entryMessage?.text?.body,
      root.messages?.[0]?.text,
    ) ?? "";

  const messageId = firstString(
    root.id,
    root.messageId,
    data.id,
    message.id,
    key.id,
    entryMessage?.id,
  );

  return { from, text, messageId };
}

export type BotCommand =
  | { type: "ticket_status"; token: string }
  | { type: "promo"; code: string }
  | { type: "promo_list"; slug: string }
  | { type: "queue"; slug: string }
  | { type: "help" };

export function parseBotCommand(input: string): BotCommand {
  const text = (input ?? "").trim();

  const status = text.match(/^estado\s+([a-f0-9]{8,})$/i);
  if (status) return { type: "ticket_status", token: status[1] };

  const promo = text.match(/^promo\s+([a-z0-9-]{4,})$/i);
  if (promo) return { type: "promo", code: promo[1].toUpperCase() };

  const promoList = text.match(/^promos\s+@?([a-z0-9-]{2,})$/i);
  if (promoList) return { type: "promo_list", slug: promoList[1] };

  const queue = text.match(/^(turno|cola)\s+@?([a-z0-9-]{2,})$/i);
  if (queue) return { type: "queue", slug: queue[2] };

  // "Quiero turno en barberia-demo" from an Instagram/poster deep link.
  const naturalQueue = text.match(/(?:turno|cola|cita)\s+(?:en|con)\s+@?([a-z0-9-]{2,})/i);
  if (naturalQueue) return { type: "queue", slug: naturalQueue[1] };

  const anyPromoCode = text.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4,6})\b/);
  if (anyPromoCode) return { type: "promo", code: anyPromoCode[1] };

  return { type: "help" };
}

export function botHelpMessage(appUrl: string): string {
  return [
    "¡Hola! Soy el asistente de MiCita 👋",
    "",
    "Puedo ayudarte con:",
    "• *turno <negocio>* — pedir un turno en la cola",
    "• *promos <negocio>* — ver promociones de horas muertas",
    "• *promo <código>* — abrir una promoción",
    "• *estado <código>* — revisar tu turno",
    "",
    `También puedes entrar a ${appUrl}`,
  ].join("\n");
}
