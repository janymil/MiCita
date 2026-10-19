import crypto from "crypto";
import { config } from "../config.js";

/**
 * Minimal MercadoPago REST client (no SDK dependency required).
 * Covers Checkout Pro (one-off payments) and Preapproval (subscriptions).
 */

const API_BASE = "https://api.mercadopago.com";

export interface MercadoPagoPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
}

export interface CreatePreferenceInput {
  items: MercadoPagoPreferenceItem[];
  externalReference: string;
  payerEmail?: string;
  notificationUrl: string;
  backUrls: { success: string; failure: string; pending: string };
  metadata?: Record<string, unknown>;
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference?: string;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  metadata?: Record<string, unknown>;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(config.payments.mercadoPago.accessToken);
}

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.payments.mercadoPago.accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`MercadoPago ${path} failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function createPreference(input: CreatePreferenceInput): Promise<MercadoPagoPreference> {
  return mpFetch<MercadoPagoPreference>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: input.items.map((item) => ({ currency_id: "PEN", ...item })),
      external_reference: input.externalReference,
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      notification_url: input.notificationUrl,
      back_urls: input.backUrls,
      auto_return: "approved",
      metadata: input.metadata,
      statement_descriptor: "MICITA",
    }),
  });
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  return mpFetch<MercadoPagoPayment>(`/v1/payments/${paymentId}`);
}

export interface PreapprovalInput {
  reason: string;
  externalReference: string;
  payerEmail: string;
  amount: number;
  backUrl: string;
  notificationUrl: string;
}

export interface PreapprovalResult {
  id: string;
  init_point: string;
  status: string;
}

export async function createPreapproval(input: PreapprovalInput): Promise<PreapprovalResult> {
  return mpFetch<PreapprovalResult>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "PEN",
      },
    }),
  });
}

export async function getPreapproval(id: string): Promise<{ id: string; status: string; external_reference?: string }> {
  return mpFetch(`/preapproval/${id}`);
}

/**
 * Validates the `x-signature` header MercadoPago sends with webhooks.
 * Format: `ts=<timestamp>,v1=<hmac>` where the HMAC is over
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` using the webhook secret.
 */
export function validateWebhookSignature(params: {
  signatureHeader?: string;
  requestId?: string;
  dataId?: string;
}): boolean {
  const secret = config.payments.mercadoPago.webhookSecret;
  if (!secret) {
    // Without a configured secret we cannot verify; reject in production.
    return !config.isProduction;
  }
  const { signatureHeader, requestId, dataId } = params;
  if (!signatureHeader || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const PLAN_PRICING: Record<string, { amount: number; label: string }> = {
  premium: { amount: 59, label: "Plan Premium" },
  premium_plus: { amount: 129, label: "Plan Premium Plus" },
};
