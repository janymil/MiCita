import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!config.email.user || !config.email.pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: { user: config.email.user, pass: config.email.pass },
  });
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}

export async function sendMail(input: SendMailInput): Promise<boolean> {
  const tx = getTransporter();
  const fromName = input.fromName || config.email.fromName;

  if (!tx) {
    // Never silently drop mail in production.
    if (config.isProduction) {
      console.error("[email] SMTP transport is not configured; cannot send:", input.subject);
      return false;
    }
    console.log(`[email:console] to=${input.to} subject="${input.subject}"`);
    return true;
  }

  try {
    await tx.sendMail({
      from: `"${fromName}" <${config.email.from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    return true;
  } catch (error: any) {
    console.error("[email] Failed to send mail:", error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(config.email.user && config.email.pass);
}

export { getTransporter };
