import { randomBytes } from "crypto";
import { config } from "../config.js";
import { storage } from "../storage.js";
import {
  getDeskSettings,
  renderLoyaltyMessage,
  type DeskSettings,
} from "./desk-settings.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

/** Normalize to digits; Peruvian 9-digit numbers get the 51 prefix. */
export function normalizeLoyaltyPhone(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) return `51${digits}`;
  return digits;
}

export interface LoyaltyProgress {
  totalStamps: number;
  required: number;
  progress: number;
  availableRewards: number;
  cycleStamps: number;
}

export function loyaltyProgress(
  totalStamps: number,
  rewardsRedeemed: number,
  required: number,
): LoyaltyProgress {
  const safeRequired = Math.max(1, Math.floor(required));
  const total = Math.max(0, Math.floor(totalStamps));
  const earned = Math.floor(total / safeRequired);
  return {
    totalStamps: total,
    required: safeRequired,
    progress: total % safeRequired,
    availableRewards: Math.max(0, earned - Math.max(0, Math.floor(rewardsRedeemed))),
    cycleStamps: total % safeRequired,
  };
}

export interface LoyaltyAwardResult {
  awarded: boolean;
  card?: Awaited<ReturnType<typeof storage.createLoyaltyCard>>;
  progress?: LoyaltyProgress;
  rewardUnlocked?: boolean;
}

/** Award one stamp for a completed appointment (idempotent by appointmentId). */
export async function awardLoyaltyStamp(params: {
  businessId: number;
  appointmentId: number;
  clientId?: number | null;
  name?: string | null;
  phone?: string | null;
}): Promise<LoyaltyAwardResult> {
  const settings = await getDeskSettings(params.businessId);
  if (!settings.loyaltyEnabled) return { awarded: false };

  const phone = normalizeLoyaltyPhone(params.phone);
  if (!phone) return { awarded: false };
  if (await storage.getLoyaltyEventByAppointmentId(params.appointmentId)) {
    return { awarded: false };
  }

  const business = await storage.getBusiness(params.businessId);
  if (!business) return { awarded: false };

  let card = await storage.getLoyaltyCardByPhone(params.businessId, phone);
  const beforeStamps = card?.totalStamps ?? 0;

  if (!card) {
    card = await storage.createLoyaltyCard({
      businessId: params.businessId,
      clientId: params.clientId ?? null,
      name: params.name?.trim() || "Cliente",
      phone,
      token: randomBytes(24).toString("hex"),
      totalStamps: 0,
      rewardsRedeemed: 0,
      lastStampAt: null,
    });
  }

  const updated = await storage.updateLoyaltyCard(card.id, {
    clientId: params.clientId ?? card.clientId,
    name: params.name?.trim() || card.name,
    totalStamps: beforeStamps + 1,
    lastStampAt: new Date(),
  });

  await storage.createLoyaltyEvent({
    cardId: card.id,
    businessId: params.businessId,
    appointmentId: params.appointmentId,
    type: "stamp",
    stampsDelta: 1,
    note: null,
  });

  const progress = loyaltyProgress(
    updated.totalStamps,
    updated.rewardsRedeemed,
    settings.loyaltyStampsRequired,
  );
  const rewardUnlocked =
    progress.availableRewards >
    loyaltyProgress(beforeStamps, updated.rewardsRedeemed, settings.loyaltyStampsRequired)
      .availableRewards;

  const link = `${config.appUrl.replace(/\/$/, "")}/tarjeta/t/${updated.token}`;
  const template = rewardUnlocked
    ? settings.loyaltyRewardMessageTemplate
    : settings.loyaltyMessageTemplate;
  const text = renderLoyaltyMessage(template, {
    name: updated.name,
    businessName: business.name,
    stamps: progress.progress,
    required: settings.loyaltyStampsRequired,
    reward: settings.loyaltyReward,
    link,
  });

  void sendWhatsAppMessage({
    businessId: params.businessId,
    to: phone,
    text,
    payload: {
      type: "loyalty_stamp",
      cardId: updated.id,
      appointmentId: params.appointmentId,
      rewardUnlocked,
    },
  }).catch((error) => console.error("[loyalty] WhatsApp failed:", error));

  return { awarded: true, card: updated, progress, rewardUnlocked };
}

/** Redeem one available reward (owner action at the shop). */
export async function redeemLoyaltyReward(
  businessId: number,
  cardId: number,
): Promise<{ ok: true; card: Awaited<ReturnType<typeof storage.updateLoyaltyCard>>; progress: LoyaltyProgress } | { ok: false; reason: "not_found" | "no_reward" | "disabled" }> {
  const settings = await getDeskSettings(businessId);
  if (!settings.loyaltyEnabled) return { ok: false, reason: "disabled" };

  const card = await storage.getLoyaltyCard(cardId);
  if (!card || card.businessId !== businessId) return { ok: false, reason: "not_found" };

  const progress = loyaltyProgress(
    card.totalStamps,
    card.rewardsRedeemed,
    settings.loyaltyStampsRequired,
  );
  if (progress.availableRewards <= 0) return { ok: false, reason: "no_reward" };

  const updated = await storage.updateLoyaltyCard(card.id, {
    rewardsRedeemed: card.rewardsRedeemed + 1,
  });
  await storage.createLoyaltyEvent({
    cardId: card.id,
    businessId,
    appointmentId: null,
    type: "redeem",
    stampsDelta: 0,
    note: settings.loyaltyReward,
  });

  return {
    ok: true,
    card: updated,
    progress: loyaltyProgress(
      updated.totalStamps,
      updated.rewardsRedeemed,
      settings.loyaltyStampsRequired,
    ),
  };
}

export function loyaltySettingsView(settings: DeskSettings) {
  return {
    enabled: settings.loyaltyEnabled,
    required: settings.loyaltyStampsRequired,
    reward: settings.loyaltyReward,
  };
}
