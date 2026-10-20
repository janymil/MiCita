import { config } from "../config.js";
import { storage } from "../storage.js";
import { normalizeWhatsAppPhone } from "./queue-service.js";

/**
 * WhatsApp delivery through the platform-owned "Central Service Bot".
 *
 * The bot number is linked once to the Formatika gateway and shared by every
 * business — barbers never connect their personal WhatsApp. Sending is
 * best-effort: a promo claim or queue ticket must succeed even when the gateway
 * is not configured (local dev, outage), we only log `skipped`/`failed`.
 */

export interface WhatsAppSendResult {
  sent: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
  providerMessageId?: string | null;
}

function whatsappApiUrl(): string {
  return config.whatsapp.apiUrl.replace(/\/$/, "");
}

/**
 * Normalize the gateway's response. The live Formatika `/api/send` docs show
 * `{ to, text }` requests and the dashboard reads `data.to` on success; errors
 * use `{ error, message }`. Support the common provider variants too so the
 * audit log does not depend on one exact JSON shape.
 */
export function parseWhatsAppSendResponse(payload: unknown): {
  providerMessageId: string | null;
  error: string | null;
  explicitlyFailed: boolean;
} {
  const p = (payload ?? {}) as Record<string, any>;
  const rawId =
    p.id ??
    p.message_id ??
    p.messageId ??
    p.providerMessageId ??
    p.key?.id ??
    p.data?.id ??
    p.data?.message_id ??
    p.data?.messageId ??
    p.result?.id ??
    p.message?.id ??
    null;
  const rawError = p.message ?? p.detail ?? p.error ?? p.data?.message ?? p.data?.error ?? null;
  const error =
    typeof rawError === "string"
      ? rawError
      : rawError && typeof rawError === "object"
        ? String(rawError.message ?? rawError.error ?? JSON.stringify(rawError))
        : null;

  return {
    providerMessageId: rawId == null ? null : String(rawId),
    error,
    explicitlyFailed: p.ok === false || p.success === false || p.sent === false,
  };
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(config.whatsapp.apiKey && config.whatsapp.botNumber);
}

/** Public deep link into the central bot (QR / Instagram bio / poster). */
export function centralBotLink(text: string): string | null {
  const bot = normalizeWhatsAppPhone(config.whatsapp.botNumber);
  if (!bot) return null;
  return `https://wa.me/${bot}?text=${encodeURIComponent(text)}`;
}

async function logMessage(input: {
  businessId?: number | null;
  direction: "inbound" | "outbound";
  phone?: string | null;
  text?: string | null;
  status: string;
  providerMessageId?: string | null;
  error?: string | null;
  payload?: Record<string, unknown>;
}) {
  try {
    await storage.createWhatsAppMessage({
      businessId: input.businessId ?? null,
      direction: input.direction,
      phone: input.phone ?? null,
      text: input.text ?? null,
      status: input.status,
      providerMessageId: input.providerMessageId ?? null,
      error: input.error ?? null,
      payload: input.payload ?? null,
    } as any);
  } catch (error: any) {
    console.error("[whatsapp] Failed to persist message log:", error?.message ?? error);
  }
}

export async function sendWhatsAppMessage(input: {
  to: string | null | undefined;
  text: string;
  businessId?: number | null;
  payload?: Record<string, unknown>;
}): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(input.to);

  if (!to) {
    await logMessage({
      businessId: input.businessId,
      direction: "outbound",
      phone: input.to ?? null,
      text: input.text,
      status: "skipped",
      error: "missing_phone",
      payload: input.payload,
    });
    return { sent: false, skipped: true, error: "missing_phone" };
  }

  if (!config.whatsapp.apiKey) {
    console.log(`[whatsapp] (not configured) would send to ${to}: ${input.text}`);
    await logMessage({
      businessId: input.businessId,
      direction: "outbound",
      phone: to,
      text: input.text,
      status: "skipped",
      error: "not_configured",
      payload: input.payload,
    });
    return { sent: false, skipped: true, error: "not_configured" };
  }

  try {
    const response = await fetch(`${whatsappApiUrl()}/api/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.whatsapp.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, text: input.text }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload = await response.json().catch(() => null);
    const parsed = parseWhatsAppSendResponse(payload);
    const delivered = response.ok && !parsed.explicitlyFailed;
    const errorMessage = delivered
      ? null
      : parsed.error ?? `HTTP ${response.status}`;

    await logMessage({
      businessId: input.businessId,
      direction: "outbound",
      phone: to,
      text: input.text,
      status: delivered ? "sent" : "failed",
      providerMessageId: parsed.providerMessageId,
      error: errorMessage,
      payload: {
        ...(input.payload ?? {}),
        ...(payload ? { provider: payload } : {}),
      } as Record<string, unknown>,
    });

    if (!delivered) {
      return {
        sent: false,
        status: response.status,
        error: errorMessage ?? `HTTP ${response.status}`,
      };
    }

    return {
      sent: true,
      status: response.status,
      providerMessageId: parsed.providerMessageId,
    };
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error("[whatsapp] Send failed:", message);
    await logMessage({
      businessId: input.businessId,
      direction: "outbound",
      phone: to,
      text: input.text,
      status: "failed",
      error: message,
      payload: input.payload,
    });
    return { sent: false, error: message };
  }
}
