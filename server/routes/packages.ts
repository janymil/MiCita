import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { PAYMENT_METHODS, payments } from "../../shared/schema.js";
import { verifyBusinessOwnership } from "../auth-helpers.js";
import { requireAuth, type AuthenticatedRequest } from "../auth-middleware.js";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { getDeskSettings } from "../lib/desk-settings.js";
import {
  applicablePackages,
  createManualPackagePurchase,
  packageExpired,
} from "../lib/packages.js";
import { runPackageReminderPass } from "../jobs/packages.js";

const router = Router();
router.use(requireAuth);

const createPackageSchema = z.object({
  serviceId: z.number().int().positive(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  uses: z.number().int().min(1).max(50),
  price: z.number().positive().max(10000),
  validityDays: z.number().int().min(1).max(730),
});

const sellSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  method: z.enum(PAYMENT_METHODS),
});

const statusSchema = z.object({
  status: z.enum(["active", "paused"]),
});

async function authorizeBusiness(req: AuthenticatedRequest, res: any): Promise<number | null> {
  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId) || businessId <= 0) {
    res.status(400).json({ message: "Negocio inválido" });
    return null;
  }
  const user = await verifyBusinessOwnership(req, res, businessId);
  return user ? businessId : null;
}

router.get("/:businessId/packages", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const [settings, packages, purchases] = await Promise.all([
      getDeskSettings(businessId),
      storage.getServicePackagesByBusinessId(businessId),
      storage.getPackagePurchasesByBusinessId(businessId),
    ]);
    const packageNames = new Map(packages.map((pkg) => [pkg.id, pkg.name]));

    // Lazy expiry keeps the owner list honest without a scheduler.
    const normalized = [];
    for (const purchase of purchases) {
      if (purchase.status === "active" && packageExpired(purchase)) {
        normalized.push(await storage.updatePackagePurchase(purchase.id, { status: "expired" }));
      } else {
        normalized.push(purchase);
      }
    }

    const active = normalized.filter((purchase) => purchase.status === "active");
    const sold = normalized
      .filter((purchase) => !["pending", "cancelled"].includes(purchase.status))
      .reduce((sum, purchase) => sum + Number(purchase.amountPaid), 0);

    res.json({
      enabled: settings.packagesEnabled,
      packages,
      purchases: normalized.map((purchase) => ({
        ...purchase,
        packageName: packageNames.get(purchase.packageId) ?? "Bono",
        expired: packageExpired(purchase),
      })),
      stats: {
        packageCount: packages.length,
        activePurchases: active.length,
        outstandingUses: active.reduce((sum, purchase) => sum + purchase.usesRemaining, 0),
        soldAmount: Number(sold.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("Error loading packages:", error);
    res.status(500).json({ message: "Error cargando los bonos" });
  }
});

router.post("/:businessId/packages/reminders/run", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;
    const summary = await runPackageReminderPass(businessId);
    res.json(summary);
  } catch (error: any) {
    console.error("Error running package reminders:", error);
    res.status(500).json({ message: "Error procesando recordatorios" });
  }
});

router.post("/:businessId/packages", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = createPackageSchema.parse(req.body ?? {});
    const service = await storage.getService(body.serviceId);
    if (!service || service.businessId !== businessId) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }

    const pkg = await storage.createServicePackage({
      businessId,
      serviceId: service.id,
      name: body.name,
      description: body.description ?? null,
      uses: body.uses,
      price: body.price.toFixed(2),
      validityDays: body.validityDays,
      status: "active",
    });
    res.status(201).json({ package: pkg });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Revisa los datos", issues: error.issues });
    }
    console.error("Error creating package:", error);
    res.status(500).json({ message: "Error creando el bono" });
  }
});

router.patch("/:businessId/packages/:packageId", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = statusSchema.parse(req.body ?? {});
    const pkg = await storage.getServicePackage(Number(req.params.packageId));
    if (!pkg || pkg.businessId !== businessId) {
      return res.status(404).json({ message: "Bono no encontrado" });
    }
    const updated = await storage.updateServicePackage(pkg.id, { status: body.status });
    res.json({ package: updated });
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ message: "Estado inválido" });
    console.error("Error updating package:", error);
    res.status(500).json({ message: "Error actualizando el bono" });
  }
});

router.post("/:businessId/packages/:packageId/sell", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const body = sellSchema.parse(req.body ?? {});
    const pkg = await storage.getServicePackage(Number(req.params.packageId));
    if (!pkg || pkg.businessId !== businessId) {
      return res.status(404).json({ message: "Bono no encontrado" });
    }

    const deskSettings = await getDeskSettings(businessId);
    if (!deskSettings.paymentMethods.includes(body.method)) {
      return res.status(400).json({ message: "Ese método de pago no está habilitado" });
    }

    const result = await createManualPackagePurchase({
      businessId,
      packageId: pkg.id,
      name: body.name,
      phone: body.phone,
      method: body.method,
    });
    if (!result.ok) {
      return res.status(409).json({
        message:
          result.reason === "disabled"
            ? "Los bonos están desactivados"
            : result.reason === "inactive"
              ? "Este bono está en pausa"
              : "No se pudo crear el bono",
      });
    }

    await db.insert(payments).values({
      userId: null,
      businessId,
      provider: "manual",
      providerPaymentId: null,
      externalReference: `package_manual_${randomUUID()}`,
      amount: Number(pkg.price).toFixed(2),
      currency: "PEN",
      status: "approved",
      description: `Bono ${pkg.name} — ${body.name}`,
      paymentMethod: body.method,
      paidAt: new Date(),
      metadata: {
        type: "service_package",
        purchaseId: result.purchase.id,
        packageId: pkg.id,
        businessId,
        manual: true,
      },
    });

    res.status(201).json({ purchase: result.purchase, package: pkg });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Revisa los datos", issues: error.issues });
    }
    console.error("Error selling package:", error);
    res.status(500).json({ message: "Error vendiendo el bono" });
  }
});

router.get("/:businessId/appointments/:appointmentId/package", async (req: AuthenticatedRequest, res) => {
  try {
    const businessId = await authorizeBusiness(req, res);
    if (!businessId) return;

    const appointment = await storage.getAppointment(Number(req.params.appointmentId));
    if (!appointment || appointment.businessId !== businessId) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }
    if (!appointment.clientId) return res.json({ packages: [] });

    const packages = await applicablePackages({
      businessId,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
    });
    res.json({ packages });
  } catch (error: any) {
    console.error("Error loading applicable packages:", error);
    res.status(500).json({ message: "Error cargando los bonos" });
  }
});

export default router;
