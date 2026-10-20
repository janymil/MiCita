import { and, eq, sql } from "drizzle-orm";
import { db } from "../db.js";
import { packagePurchases, whatsappMessages } from "../../shared/schema.js";
import { storage } from "../storage.js";
import { getDeskSettings, renderPackageMessage } from "../lib/desk-settings.js";
import { packageExpired, packageLink } from "../lib/packages.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

/**
 * Bono lifecycle reminders.
 *
 * Runs a few times a day and sends two idempotent WhatsApp nudges:
 *  - `package_low_balance` when a single use remains.
 *  - `package_expiry` when the card expires within 7 days and uses remain.
 *
 * Idempotency is derived from the outbound message log (`payload.purchaseId`
 * + `payload.type`), so restarts never spam the customer.
 */
const INTERVAL_MS = 6 * 60 * 60 * 1000;
const EXPIRY_WINDOW_DAYS = 7;
let timer: ReturnType<typeof setInterval> | null = null;

export interface PackageReminderSummary {
  scanned: number;
  lowBalanceSent: number;
  expirySent: number;
  skipped: number;
  errors: number;
  disabled: number;
}

async function alreadySent(
  purchaseId: number,
  type: "package_low_balance" | "package_expiry",
): Promise<boolean> {
  const [existing] = await db
    .select({ id: whatsappMessages.id })
    .from(whatsappMessages)
    .where(
      and(
        sql`${whatsappMessages.payload}->>'purchaseId' = ${String(purchaseId)}`,
        sql`${whatsappMessages.payload}->>'type' = ${type}`,
        sql`${whatsappMessages.status} <> 'failed'`,
      ),
    )
    .limit(1);
  return Boolean(existing);
}

export async function runPackageReminderPass(
  businessId?: number,
  now: Date = new Date(),
): Promise<PackageReminderSummary> {
  const summary: PackageReminderSummary = {
    scanned: 0,
    lowBalanceSent: 0,
    expirySent: 0,
    skipped: 0,
    errors: 0,
    disabled: 0,
  };

  const base = db
    .select()
    .from(packagePurchases)
    .where(
      businessId
        ? and(eq(packagePurchases.businessId, businessId), eq(packagePurchases.status, "active"))
        : eq(packagePurchases.status, "active"),
    );
  const purchases = await base;
  const windowEnd = now.getTime() + EXPIRY_WINDOW_DAYS * 86_400_000;

  for (const purchase of purchases) {
    try {
      if (packageExpired(purchase, now)) continue;
      const [pkg, business, settings] = await Promise.all([
        storage.getServicePackage(purchase.packageId),
        storage.getBusiness(purchase.businessId),
        getDeskSettings(purchase.businessId),
      ]);
      if (!pkg || !business) {
        summary.skipped += 1;
        continue;
      }
      if (!settings.packagesEnabled) {
        summary.disabled += 1;
        continue;
      }

      const wantsLowBalance = purchase.usesRemaining === 1;
      const expiresAt = purchase.expiresAt ? new Date(purchase.expiresAt) : null;
      const wantsExpiry =
        Boolean(expiresAt) &&
        expiresAt!.getTime() > now.getTime() &&
        expiresAt!.getTime() <= windowEnd;

      if (!wantsLowBalance && !wantsExpiry) continue;
      summary.scanned += 1;
      const link = packageLink(purchase.token);

      if (wantsLowBalance && !(await alreadySent(purchase.id, "package_low_balance"))) {
        const text = renderPackageMessage(settings.packageLowBalanceMessageTemplate, {
          name: purchase.name,
          businessName: business.name,
          packageName: pkg.name,
          uses: purchase.usesTotal,
          remaining: purchase.usesRemaining,
          link,
        });
        const result = await sendWhatsAppMessage({
          businessId: purchase.businessId,
          to: purchase.phone,
          text,
          payload: { type: "package_low_balance", purchaseId: purchase.id },
        });
        if (result.sent) summary.lowBalanceSent += 1;
        else summary.skipped += 1;
      }

      if (wantsExpiry && !(await alreadySent(purchase.id, "package_expiry"))) {
        const date = expiresAt!.toLocaleDateString("es-PE", {
          timeZone: "America/Lima",
          day: "2-digit",
          month: "long",
        });
        const text = renderPackageMessage(settings.packageExpiryMessageTemplate, {
          name: purchase.name,
          businessName: business.name,
          packageName: pkg.name,
          uses: purchase.usesTotal,
          remaining: purchase.usesRemaining,
          date,
          link,
        });
        const result = await sendWhatsAppMessage({
          businessId: purchase.businessId,
          to: purchase.phone,
          text,
          payload: { type: "package_expiry", purchaseId: purchase.id },
        });
        if (result.sent) summary.expirySent += 1;
        else summary.skipped += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`[packages] reminder failed for purchase ${purchase.id}:`, error);
    }
  }

  return summary;
}

export function getPackageReminderStatus() {
  return {
    running: timer !== null,
    intervalMinutes: INTERVAL_MS / 60_000,
  };
}

export function startPackageReminderScheduler(): void {
  if (timer) return;
  const tick = () =>
    runPackageReminderPass().catch((error) => console.error("[packages] reminder pass failed:", error));
  setTimeout(tick, 90_000);
  timer = setInterval(tick, INTERVAL_MS);
}

export function stopPackageReminderScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
