import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LOYALTY_MESSAGE,
  DEFAULT_LOYALTY_REWARD_MESSAGE,
  normalizeDeskSettings,
  renderLoyaltyMessage,
} from "../desk-settings.js";
import { loyaltyProgress, normalizeLoyaltyPhone } from "../loyalty.js";

test("Peruvian loyalty phones normalize to 51 + 9 digits", () => {
  assert.equal(normalizeLoyaltyPhone("999 999 999"), "51999999999");
  assert.equal(normalizeLoyaltyPhone("+51 999 999 999"), "51999999999");
  assert.equal(normalizeLoyaltyPhone("51999999999"), "51999999999");
  assert.equal(normalizeLoyaltyPhone(""), "");
});

test("loyalty progress exposes cycle stamps and available rewards", () => {
  assert.deepEqual(loyaltyProgress(4, 0, 5), {
    totalStamps: 4,
    required: 5,
    progress: 4,
    availableRewards: 0,
    cycleStamps: 4,
  });

  const complete = loyaltyProgress(5, 0, 5);
  assert.equal(complete.progress, 0);
  assert.equal(complete.availableRewards, 1);

  const afterRedeem = loyaltyProgress(10, 1, 5);
  assert.equal(afterRedeem.progress, 0);
  assert.equal(afterRedeem.availableRewards, 1);

  assert.equal(loyaltyProgress(12, 0, 5).availableRewards, 2);
  assert.equal(loyaltyProgress(0, 0, 5).availableRewards, 0);
});

test("loyalty settings normalize defaults and clamp stamps", () => {
  const defaults = normalizeDeskSettings({});
  assert.equal(defaults.loyaltyEnabled, true);
  assert.equal(defaults.showLoyaltyOnMicrosite, true);
  assert.equal(defaults.loyaltyStampsRequired, 5);
  assert.equal(defaults.loyaltyReward, "Un corte gratis");
  assert.equal(defaults.loyaltyMessageTemplate, DEFAULT_LOYALTY_MESSAGE);
  assert.equal(defaults.loyaltyRewardMessageTemplate, DEFAULT_LOYALTY_REWARD_MESSAGE);

  assert.equal(normalizeDeskSettings({ loyaltyStampsRequired: 1 }).loyaltyStampsRequired, 2);
  assert.equal(normalizeDeskSettings({ loyaltyStampsRequired: 99 }).loyaltyStampsRequired, 20);
  assert.equal(normalizeDeskSettings({ loyaltyReward: "x" }).loyaltyReward, "Un corte gratis");
});

test("loyalty templates render stamps and reward placeholders", () => {
  const stamp = renderLoyaltyMessage(DEFAULT_LOYALTY_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    stamps: 3,
    required: 5,
    reward: "Un corte gratis",
    link: "https://micita.pe/tarjeta/t/token",
  });
  assert.ok(stamp.includes("Ana"));
  assert.ok(stamp.includes("3/5"));
  assert.ok(stamp.includes("/tarjeta/t/token"));

  const reward = renderLoyaltyMessage(DEFAULT_LOYALTY_REWARD_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    stamps: 0,
    required: 5,
    reward: "Un corte gratis",
    link: "https://micita.pe/tarjeta/t/token",
  });
  assert.ok(reward.includes("Un corte gratis"));
  assert.ok(!reward.includes("{recompensa}"));
});
