import { randomUUID } from "crypto";
import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { payments } from "../../shared/schema.js";
import { config } from "../config.js";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { getDeskSettings } from "../lib/desk-settings.js";
import { packageExpired, packageLink } from "../lib/packages.js";
import { createPreference, isMercadoPagoConfigured } from "../payments/mercadopago.js";
import { normalizeLoyaltyPhone } from "../lib/loyalty.js";

const router: Router = express.Router();

const packageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiados intentos. Espera unos minutos." },
});

const purchaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
});

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/by-business/:businessId", packageLimiter, async (req, res) => {
  try {
    const businessId = parseId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const [business, settings, services, packages] = await Promise.all([
      storage.getBusiness(businessId),
      getDeskSettings(businessId),
      storage.getServicesByBusinessId(businessId),
      storage.getServicePackagesByBusinessId(businessId),
    ]);
    if (!business || business.isActive === false) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }
    if (!settings.packagesEnabled) {
      return res.json({ enabled: false, showOnMicrosite: false, packages: [] });
    }

    const serviceNames = new Map(services.map((service) => [service.id, service.name]));
    res.set("Cache-Control", "no-store");
    return res.json({
      enabled: true,
      showOnMicrosite: settings.showPackagesOnMicrosite,
      business: { id: business.id, name: business.name },
      packages: packages
        .filter((pkg) => pkg.status === "active")
        .map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          uses: pkg.uses,
          price: pkg.price,
          validityDays: pkg.validityDays,
          serviceId: pkg.serviceId,
          serviceName: pkg.serviceId ? serviceNames.get(pkg.serviceId) ?? "Servicio" : "Servicio",
          publicUrl: `/bono/${pkg.id}`,
        })),
    });
  } catch (error: any) {
    console.error("[public/packages] list failed:", error);
    return res.status(500).json({ message: "Error cargando los bonos" });
  }
});

router.get("/t/:token", packageLimiter, async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (token.length < 20) return res.status(404).json({ message: "Bono no encontrado" });

    let purchase = await storage.getPackagePurchaseByToken(token);
    if (!purchase) return res.status(404).json({ message: "Bono no encontrado" });
    if (purchase.status === "active" && packageExpired(purchase)) {
      purchase = await storage.updatePackagePurchase(purchase.id, { status: "expired" });
    }

    const [pkg, business, redemptions] = await Promise.all([
      storage.getServicePackage(purchase.packageId),
      storage.getBusiness(purchase.businessId),
      storage.getPackageRedemptionsByPurchaseId(purchase.id),
    ]);
    if (!pkg || !business) return res.status(404).json({ message: "Bono no encontrado" });

    res.set("Cache-Control", "no-store");
    return res.json({
      purchase: {
        id: purchase.id,
        name: purchase.name,
        token: purchase.token,
        status: purchase.status,
        usesTotal: purchase.usesTotal,
        usesRemaining: purchase.usesRemaining,
        amountPaid: purchase.amountPaid,
        purchasedAt: purchase.purchasedAt,
        expiresAt: purchase.expiresAt,
      },
      package: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        uses: pkg.uses,
        price: pkg.price,
      },
      business: { id: business.id, name: business.name, phone: business.phone },
      history: redemptions.slice(0, 20).map((redemption) => ({
        id: redemption.id,
        usesUsed: redemption.usesUsed,
        createdAt: redemption.createdAt,
      })),
      manageUrl: packageLink(purchase.token),
    });
  } catch (error: any) {
    console.error("[public/packages] card failed:", error);
    return res.status(500).json({ message: "Error cargando el bono" });
  }
});

router.get("/:packageId", packageLimiter, async (req, res) => {
  try {
    const packageId = parseId(req.params.packageId);
    if (!packageId) return res.status(400).json({ message: "Bono inválido" });

    const pkg = await storage.getServicePackage(packageId);
    if (!pkg || pkg.status !== "active") {
      return res.status(404).json({ message: "Bono no encontrado" });
    }
    const [business, service, settings] = await Promise.all([
      storage.getBusiness(pkg.businessId),
      pkg.serviceId ? storage.getService(pkg.serviceId) : Promise.resolve(undefined),
      getDeskSettings(pkg.businessId),
    ]);
    if (!business || !settings.packagesEnabled) {
      return res.status(404).json({ message: "Bono no disponible" });
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      package: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        uses: pkg.uses,
        price: pkg.price,
        validityDays: pkg.validityDays,
        serviceName: service?.name ?? "Servicio",
      },
      business: { id: business.id, name: business.name, phone: business.phone },
      checkoutAvailable: isMercadoPagoConfigured(),
    });
  } catch (error: any) {
    console.error("[public/packages] detail failed:", error);
    return res.status(500).json({ message: "Error cargando el bono" });
  }
});

router.post("/:packageId/purchase", packageLimiter, async (req, res) => {
  try {
    const packageId = parseId(req.params.packageId);
    if (!packageId) return res.status(400).json({ message: "Bono inválido" });

    const body = purchaseSchema.parse(req.body ?? {});
    const pkg = await storage.getServicePackage(packageId);
    if (!pkg || pkg.status !== "active") {
      return res.status(404).json({ message: "Bono no encontrado" });
    }
    const settings = await getDeskSettings(pkg.businessId);
    if (!settings.packagesEnabled) {
      return res.status(403).json({ message: "Los bonos no están disponibles" });
    }
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({
        code: "gateway_not_configured",
        message: "El pago online no está disponible. Compra tu bono en el local.",
      });
    }

    const phone = normalizeLoyaltyPhone(body.phone);
    if (!phone) return res.status(400).json({ message: "Escribe un celular válido" });

    const clients = await storage.getClientsByBusinessId(pkg.businessId);
    const client =
      clients.find((candidate) => (candidate.phone ?? "").replace(/\D/g, "") === phone) ??
      (await storage.createClient({
        businessId: pkg.businessId,
        name: body.name.trim(),
        phone,
        email: null,
      } as any));

    const token = randomBytesToken();
    const purchase = await storage.createPackagePurchase({
      packageId: pkg.id,
      businessId: pkg.businessId,
      clientId: client.id,
      name: body.name.trim() || client.name,
      phone,
      token,
      usesTotal: pkg.uses,
      usesRemaining: pkg.uses,
      amountPaid: pkg.price,
      paymentMethod: "mercadopago",
      paymentReference: null,
      status: "pending",
      purchasedAt: null,
      expiresAt: null,
    });

    const base = config.appUrl.replace(/\/$/, "");
    const externalReference = `package_${randomUUID()}`;
    const preference = await createPreference({
      items: [
        {
          title: `Bono ${pkg.name}`,
          quantity: 1,
          unit_price: Number(pkg.price),
          description: `${pkg.uses} usos · ${pkg.name}`,
        },
      ],
      externalReference,
      notificationUrl: `${base}/api/payments/webhook`,
      backUrls: {
        success: `${base}/bono/t/${token}?payment=success`,
        failure: `${base}/bono/t/${token}?payment=failure`,
        pending: `${base}/bono/t/${token}?payment=pending`,
      },
      metadata: {
        type: "service_package",
        purchaseId: purchase.id,
        packageId: pkg.id,
        businessId: pkg.businessId,
      },
    });

    await storage.updatePackagePurchase(purchase.id, {
      paymentReference: externalReference,
    });
    await db.insert(payments).values({
      userId: null,
      businessId: pkg.businessId,
      provider: "mercadopago",
      providerPreferenceId: preference.id,
      externalReference,
      amount: Number(pkg.price).toFixed(2),
      currency: "PEN",
      description: `Bono ${pkg.name}`,
      status: "pending",
      metadata: {
        type: "service_package",
        purchaseId: purchase.id,
        packageId: pkg.id,
        businessId: pkg.businessId,
        init_point: preference.init_point,
      },
    });

    const checkoutUrl = config.payments.mercadoPago.sandbox
      ? preference.sandbox_init_point
      : preference.init_point;
    return res.status(201).json({
      ok: true,
      checkoutUrl,
      purchaseId: purchase.id,
      manageUrl: packageLink(token),
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Revisa los datos", issues: error.issues });
    }
    console.error("[public/packages] purchase failed:", error);
    return res.status(500).json({ message: "No se pudo iniciar la compra" });
  }
});

function randomBytesToken(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

export default router;
