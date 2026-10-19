import { config } from "../config.js";

/**
 * Provider-agnostic outbound SMS / WhatsApp dispatcher.
 *
 * Drivers:
 *  - "console": logs the message (development only).
 *  - "twilio":  uses the Twilio REST API (SMS or WhatsApp when configured).
 *  - "webhook": posts JSON to a self-hosted bridge (e.g. an open-source
 *               WhatsApp automation service) so no paid provider is required.
 *
 * Peru (+51) numbers are supported by all three; the abstraction lets the
 * actual transport be swapped without touching the auth flow.
 */

export interface SmsMessage {
  to: string; // E.164, e.g. +51987654321
  body: string;
}

export type SmsResult = { delivered: boolean; provider: string; detail?: string };

async function sendViaConsole(msg: SmsMessage): Promise<SmsResult> {
  if (config.isProduction) {
    // Logging OTP/shared secrets in production logs is a leak; refuse.
    return { delivered: false, provider: "console", detail: "console driver disabled in production" };
  }
  console.log(`[sms:console] to=${msg.to} body="${msg.body}"`);
  return { delivered: true, provider: "console" };
}

async function sendViaTwilio(msg: SmsMessage): Promise<SmsResult> {
  const { accountSid, authToken, from, whatsappFrom } = config.sms.twilio;
  if (!accountSid || !authToken || (!from && !whatsappFrom)) {
    return { delivered: false, provider: "twilio", detail: "twilio credentials incomplete" };
  }
  const useWhatsApp = Boolean(whatsappFrom);
  const fromNumber = useWhatsApp ? `whatsapp:${whatsappFrom}` : from;
  const toNumber = useWhatsApp ? `whatsapp:${msg.to}` : msg.to;

  const body = new URLSearchParams({ From: fromNumber, To: toNumber, Body: msg.body });
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { delivered: false, provider: "twilio", detail: `${res.status} ${detail.slice(0, 200)}` };
    }
    return { delivered: true, provider: "twilio" };
  } catch (error: any) {
    return { delivered: false, provider: "twilio", detail: (error as Error).message };
  }
}

async function sendViaWebhook(msg: SmsMessage): Promise<SmsResult> {
  if (!config.sms.webhookUrl) {
    return { delivered: false, provider: "webhook", detail: "SMS_WEBHOOK_URL not set" };
  }
  try {
    const res = await fetch(config.sms.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.sms.webhookToken ? { Authorization: `Bearer ${config.sms.webhookToken}` } : {}),
      },
      body: JSON.stringify({ to: msg.to, message: msg.body }),
    });
    if (!res.ok) {
      return { delivered: false, provider: "webhook", detail: `status ${res.status}` };
    }
    return { delivered: true, provider: "webhook" };
  } catch (error: any) {
    return { delivered: false, provider: "webhook", detail: (error as Error).message };
  }
}

export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  switch (config.sms.provider) {
    case "twilio":
      return sendViaTwilio(msg);
    case "webhook":
      return sendViaWebhook(msg);
    default:
      return sendViaConsole(msg);
  }
}

export async function sendOtpSms(phoneE164: string, code: string, ttlMinutes: number): Promise<SmsResult> {
  const body = `MiCita: tu código de verificación es ${code}. Vence en ${ttlMinutes} minutos. No lo compartas con nadie.`;
  return sendSms({ to: phoneE164, body });
}
