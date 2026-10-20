import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DEPOSIT_MESSAGE,
  DEFAULT_DEPOSIT_POLICY,
  DEFAULT_DESK_SETTINGS,
  normalizeDeskSettings,
  renderAppointmentMessage,
} from "../desk-settings.js";
import { calculateDeposit } from "../deposits.js";

test("percentage deposits round to cents and never exceed the service price", () => {
  assert.equal(calculateDeposit(30, "percent", 20), 6);
  assert.equal(calculateDeposit(25, "percent", 33), 8.25);
  assert.equal(calculateDeposit(25, "percent", 100), 25);
});

test("fixed deposits are capped at the service price", () => {
  assert.equal(calculateDeposit(30, "fixed", 10), 10);
  assert.equal(calculateDeposit(8, "fixed", 10), 8);
});

test("zero price or invalid value means no deposit", () => {
  assert.equal(calculateDeposit(0, "fixed", 10), 0);
  assert.equal(calculateDeposit(30, "percent", 0), 0);
  assert.equal(calculateDeposit(30, "fixed", -5), 0);
  assert.equal(calculateDeposit(Number.NaN, "percent", 20), 0);
});

test("deposit settings normalize defaults and clamp ranges", () => {
  const defaults = normalizeDeskSettings({});
  assert.equal(defaults.depositEnabled, false);
  assert.equal(defaults.depositType, "percent");
  assert.equal(defaults.depositValue, 20);
  assert.equal(defaults.depositHoldMinutes, 30);
  assert.equal(defaults.depositMessageTemplate, DEFAULT_DEPOSIT_MESSAGE);
  assert.equal(defaults.depositPolicy, DEFAULT_DEPOSIT_POLICY);

  const percent = normalizeDeskSettings({ depositValue: 999, depositHoldMinutes: 1 });
  assert.equal(percent.depositValue, 100);
  assert.equal(percent.depositHoldMinutes, 5);

  const fixed = normalizeDeskSettings({ depositType: "fixed", depositValue: 999 });
  assert.equal(fixed.depositType, "fixed");
  assert.equal(fixed.depositValue, 500);

  const invalidType = normalizeDeskSettings({ depositType: "bitcoin" });
  assert.equal(invalidType.depositType, "percent");

  const custom = normalizeDeskSettings({
    depositEnabled: true,
    depositPolicy: "Se descuenta del servicio y no es reembolsable.",
    depositMessageTemplate: "Hola {nombre}, deja S/ {monto} para tu cita en {negocio}",
  });
  assert.equal(custom.depositEnabled, true);
  assert.equal(custom.depositPolicy, "Se descuenta del servicio y no es reembolsable.");
  assert.equal(
    custom.depositMessageTemplate,
    "Hola {nombre}, deja S/ {monto} para tu cita en {negocio}",
  );
});

test("deposit WhatsApp template renders {monto}", () => {
  const message = renderAppointmentMessage(DEFAULT_DEPOSIT_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    serviceName: "Corte",
    date: "2026-10-20",
    time: "17:00",
    amount: "10.00",
    link: "https://micita.pe/cita/token",
  });
  assert.ok(message.includes("S/ 10.00"));
  assert.ok(message.includes("Barbería Lima"));
  assert.ok(message.includes("https://micita.pe/cita/token"));
  assert.ok(!message.includes("{monto}"));
});
