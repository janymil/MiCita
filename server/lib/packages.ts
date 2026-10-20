import { randomBytes } from "crypto";
import { config } from "../config.js";
import { storage } from "../storage.js";
import {
  getDeskSettings,
  renderPackageMessage,
} from "./desk-settings.js";
import { normalizeLoyaltyPhone } from "./loyalty.js";
import { sendWhatsAppMessage } from "./whatsapp.js";
import type { Appointment, ServicePackage } from "../../shared/schema.js";

/**
 * Prepaid service packages ("bonos").
 *
 * A purchase starts as `pending` for online checkout or `active` for a manual
 * cash/Yape sale. Each completed appointment redeems exactly one use; the
 * redemption ledger is unique per appointment, so retries cannot double-use.
 */

export function packageExpired(purchase: { expiresAt: Date | null; status: string }, now = new Date()) {
  if (purchase.status === "expired" || purchase.status === "used") return true;
  return Boolean(purchase.expiresAt && purchase.expiresAt.getTime() <= now.getTime());
}

export function packageLink(token: string): string {
  return `${config.appUrl.replace(/\/$/, "")}/bono/t/${token}`;
}

export async function sendPackageReceipt(purchaseId: number): Promise<void> {
  const purchase = await storage.getPackagePurchase(purchaseId);
  if (!purchase) return;
  const [pkg, business, settings] = await Promise.all([
    storage.getServicePackage(purchase.packageId),
    storage.getBusiness(purchase.businessId),
    getDeskSettings(purchase.businessId),
  ]);
  if (!pkg || !business || !settings.packagesEnabled) return;

  const text = renderPackageMessage(settings.packageSaleMessageTemplate, {
    name: purchase.name,
    businessName: business.name,
    packageName: pkg.name,
    uses: purchase.usesTotal,
    remaining: purchase.usesRemaining,
    link: packageLink(purchase.token),
  });
  await sendWhatsAppMessage({
    businessId: purchase.businessId,
    to: purchase.phone,
    text,
    payload: { type: "package_purchase", purchaseId: purchase.id },
  });
}

/** Mark a pending online purchase active after payment approval. */
export async function activatePackagePurchase(
  purchaseId: number,
  paymentReference?: string | null,
): Promise<Awaited<ReturnType<typeof storage.getPackagePurchase>>> {
  const purchase = await storage.getPackagePurchase(purchaseId);
  if (!purchase) return undefined;
  if (purchase.status === "active" || purchase.status === "used") return purchase;

  const pkg = await storage.getServicePackage(purchase.packageId);
  if (!pkg) return purchase;
  const now = new Date();
  const updated = await storage.updatePackagePurchase(purchaseId, {
    status: purchase.usesRemaining > 0 ? "active" : "used",
    purchasedAt: now,
    expiresAt: packageExpiry(pkg, now),
    paymentReference: paymentReference ?? purchase.paymentReference,
  });

  void sendPackageReceipt(purchaseId).catch((error) =>
    console.error("Package receipt failed:", error),
  );
  return updated;
}

export function packageExpiry(pkg: Pick<ServicePackage, "validityDays">, from = new Date()): Date {
  const days = Math.max(1, Math.floor(pkg.validityDays || 90));
  return new Date(from.getTime() + days * 86_400_000);
}

export async function createManualPackagePurchase(params: {
  businessId: number;
  packageId: number;
  name: string;
  phone: string;
  method: string;
}): Promise<{ ok: true; purchase: NonNullable<Awaited<ReturnType<typeof storage.getPackagePurchase>>> } | { ok: false; reason: "not_found" | "disabled" | "inactive" }> {
  const settings = await getDeskSettings(params.businessId);
  if (!settings.packagesEnabled) return { ok: false, reason: "disabled" };

  const pkg = await storage.getServicePackage(params.packageId);
  if (!pkg || pkg.businessId !== params.businessId) return { ok: false, reason: "not_found" };
  if (pkg.status !== "active") return { ok: false, reason: "inactive" };

  const phone = normalizeLoyaltyPhone(params.phone);
  if (!phone) return { ok: false, reason: "not_found" };

  const clients = await storage.getClientsByBusinessId(params.businessId);
  const client =
    clients.find((candidate) => (candidate.phone ?? "").replace(/\D/g, "") === phone) ??
    (await storage.createClient({
      businessId: params.businessId,
      name: params.name.trim(),
      phone,
      email: null,
    } as any));

  const now = new Date();
  const purchase = await storage.createPackagePurchase({
    packageId: pkg.id,
    businessId: params.businessId,
    clientId: client.id,
    name: params.name.trim() || client.name,
    phone,
    token: randomBytes(24).toString("hex"),
    usesTotal: pkg.uses,
    usesRemaining: pkg.uses,
    amountPaid: pkg.price,
    paymentMethod: params.method,
    paymentReference: `manual_${randomBytes(8).toString("hex")}`,
    status: "active",
    purchasedAt: now,
    expiresAt: packageExpiry(pkg, now),
  });

  void sendPackageReceipt(purchase.id).catch((error) =>
    console.error("Package receipt failed:", error),
  );
  return { ok: true, purchase };
}

/** Active purchases that cover a client's service (finish dialog). */
export async function applicablePackages(params: {
  businessId: number;
  clientId: number;
  serviceId: number | null;
}) {
  const purchases = await storage.getPackagePurchasesByClientId(params.clientId);
  const result = [];
  for (const purchase of purchases) {
    if (purchase.businessId !== params.businessId) continue;
    if (purchase.status !== "active" || purchase.usesRemaining <= 0) continue;
    if (packageExpired(purchase)) continue;
    const pkg = await storage.getServicePackage(purchase.packageId);
    if (!pkg) continue;
    if (pkg.serviceId && params.serviceId && pkg.serviceId !== params.serviceId) continue;
    result.push({
      purchase,
      packageName: pkg.name,
      serviceId: pkg.serviceId,
    });
  }
  return result;
}

export type PackageRedemptionResult =
  | {
      ok: true;
      purchase: Awaited<ReturnType<typeof storage.updatePackagePurchase>>;
      redemption: Awaited<ReturnType<typeof storage.createPackageRedemption>>;
      alreadyRedeemed?: boolean;
    }
  | { ok: false; reason: "not_found" | "not_active" | "empty" | "expired" | "wrong_client" | "wrong_service" };

export async function validatePackageRedemption(params: {
  purchaseId: number;
  businessId: number;
  appointment: Appointment;
}): Promise<PackageRedemptionResult> {
  const purchase = await storage.getPackagePurchase(params.purchaseId);
  if (!purchase || purchase.businessId !== params.businessId) {
    return { ok: false, reason: "not_found" };
  }
  if (purchase.clientId && purchase.clientId !== params.appointment.clientId) {
    return { ok: false, reason: "wrong_client" };
  }
  if (purchase.status !== "active") return { ok: false, reason: "not_active" };
  if (purchase.usesRemaining <= 0) return { ok: false, reason: "empty" };
  if (packageExpired(purchase)) return { ok: false, reason: "expired" };

  const pkg = await storage.getServicePackage(purchase.packageId);
  if (!pkg) return { ok: false, reason: "not_found" };
  if (pkg.serviceId && params.appointment.serviceId && pkg.serviceId !== params.appointment.serviceId) {
    return { ok: false, reason: "wrong_service" };
  }

  return { ok: true } as PackageRedemptionResult;
}


export async function redeemPackageUse(params: {
  purchaseId: number;
  businessId: number;
  appointmentId: number;
}): Promise<PackageRedemptionResult> {
  const purchase = await storage.getPackagePurchase(params.purchaseId);
  if (!purchase || purchase.businessId !== params.businessId) {
    return { ok: false, reason: "not_found" };
  }
  const appointment = await storage.getAppointment(params.appointmentId);
  if (!appointment || appointment.businessId !== params.businessId) {
    return { ok: false, reason: "not_found" };
  }

  const existing = await storage.getPackageRedemptionByAppointmentId(params.appointmentId);
  if (existing) {
    return { ok: true, purchase, redemption: existing, alreadyRedeemed: true };
  }

  const validation = await validatePackageRedemption({
    purchaseId: params.purchaseId,
    businessId: params.businessId,
    appointment,
  });
  if (!validation.ok) return validation;

  const remaining = Math.max(0, purchase.usesRemaining - 1);
  const updated = await storage.updatePackagePurchase(purchase.id, {
    usesRemaining: remaining,
    status: remaining > 0 ? "active" : "used",
  });
  const redemption = await storage.createPackageRedemption({
    purchaseId: purchase.id,
    businessId: params.businessId,
    appointmentId: params.appointmentId,
    usesUsed: 1,
    note: null,
  });

  const [pkg, business, settings] = await Promise.all([
    storage.getServicePackage(purchase.packageId),
    storage.getBusiness(params.businessId),
    getDeskSettings(params.businessId),
  ]);
  if (pkg && business && settings.packagesEnabled) {
    const text = renderPackageMessage(settings.packageUseMessageTemplate, {
      name: purchase.name,
      businessName: business.name,
      packageName: pkg.name,
      uses: purchase.usesTotal,
      remaining,
      link: packageLink(purchase.token),
    });
    void sendWhatsAppMessage({
      businessId: params.businessId,
      to: purchase.phone,
      text,
      payload: {
        type: "package_use",
        purchaseId: purchase.id,
        appointmentId: params.appointmentId,
        remaining,
      },
    }).catch((error) => console.error("Package use message failed:", error));
  }

  return { ok: true, purchase: updated, redemption };
}
