import express, { type Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "../storage.js";
import { getDeskSettings } from "../lib/desk-settings.js";
import { loyaltyProgress, normalizeLoyaltyPhone } from "../lib/loyalty.js";

const router: Router = express.Router();

const loyaltyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Demasiados intentos. Espera unos minutos." },
});

const lookupSchema = z.object({
  phone: z.string().trim().min(6).max(30),
});

function parseBusinessId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function cardPayload(businessId: number, card: any) {
  const settings = await getDeskSettings(businessId);
  const progress = loyaltyProgress(
    card.totalStamps,
    card.rewardsRedeemed,
    settings.loyaltyStampsRequired,
  );
  const events = await storage.getLoyaltyEventsByCardId(card.id);
  const business = await storage.getBusiness(businessId);

  return {
    business: business ? { id: business.id, name: business.name } : null,
    card: {
      id: card.id,
      name: card.name,
      token: card.token,
      totalStamps: card.totalStamps,
      rewardsRedeemed: card.rewardsRedeemed,
      lastStampAt: card.lastStampAt,
    },
    progress,
    reward: settings.loyaltyReward,
    history: events.slice(0, 10).map((event) => ({
      id: event.id,
      type: event.type,
      stampsDelta: event.stampsDelta,
      note: event.note,
      createdAt: event.createdAt,
    })),
  };
}

router.get("/t/:token", loyaltyLimiter, async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (token.length < 20) return res.status(404).json({ message: "Tarjeta no encontrada" });
    const card = await storage.getLoyaltyCardByToken(token);
    if (!card) return res.status(404).json({ message: "Tarjeta no encontrada" });
    const settings = await getDeskSettings(card.businessId);
    if (!settings.loyaltyEnabled) {
      return res.status(403).json({ message: "El programa de lealtad no está disponible" });
    }
    res.set("Cache-Control", "no-store");
    return res.json(await cardPayload(card.businessId, card));
  } catch (error: any) {
    console.error("[public/loyalty] load failed:", error);
    return res.status(500).json({ message: "Error cargando la tarjeta" });
  }
});

router.get("/:businessId", loyaltyLimiter, async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });
    const [business, settings] = await Promise.all([
      storage.getBusiness(businessId),
      getDeskSettings(businessId),
    ]);
    if (!business || business.isActive === false) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }
    res.set("Cache-Control", "no-store");
    return res.json({
      business: { id: business.id, name: business.name },
      enabled: settings.loyaltyEnabled,
      required: settings.loyaltyStampsRequired,
      reward: settings.loyaltyReward,
    });
  } catch (error: any) {
    console.error("[public/loyalty] snapshot failed:", error);
    return res.status(500).json({ message: "Error cargando la tarjeta" });
  }
});

router.post("/:businessId/lookup", loyaltyLimiter, async (req, res) => {
  try {
    const businessId = parseBusinessId(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Negocio inválido" });

    const body = lookupSchema.parse(req.body ?? {});
    const settings = await getDeskSettings(businessId);
    if (!settings.loyaltyEnabled) {
      return res.status(403).json({ message: "El programa de lealtad no está disponible" });
    }

    const card = await storage.getLoyaltyCardByPhone(
      businessId,
      normalizeLoyaltyPhone(body.phone),
    );
    if (!card) {
      return res.status(404).json({ message: "No encontramos una tarjeta con ese celular" });
    }
    res.set("Cache-Control", "no-store");
    return res.json(await cardPayload(businessId, card));
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({ message: "Escribe un celular válido" });
    }
    console.error("[public/loyalty] lookup failed:", error);
    return res.status(500).json({ message: "Error buscando la tarjeta" });
  }
});

export default router;
