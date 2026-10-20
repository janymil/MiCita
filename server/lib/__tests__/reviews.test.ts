import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DESK_SETTINGS,
  DEFAULT_REVIEW_MESSAGE,
  normalizeDeskSettings,
  renderAppointmentMessage,
} from "../desk-settings.js";

test("review requests default on with a two-hour delay", () => {
  const settings = normalizeDeskSettings({});
  assert.equal(settings.reviewRequestsEnabled, true);
  assert.equal(settings.reviewDelayMinutes, 120);
  assert.equal(settings.reviewMessageTemplate, DEFAULT_REVIEW_MESSAGE);
});

test("review delay is clamped between 0 and 1440 minutes", () => {
  assert.equal(normalizeDeskSettings({ reviewDelayMinutes: -10 }).reviewDelayMinutes, 0);
  assert.equal(normalizeDeskSettings({ reviewDelayMinutes: 5000 }).reviewDelayMinutes, 1440);
  assert.equal(normalizeDeskSettings({ reviewDelayMinutes: 45 }).reviewDelayMinutes, 45);
});

test("review toggle and template are normalized", () => {
  const disabled = normalizeDeskSettings({ reviewRequestsEnabled: false });
  assert.equal(disabled.reviewRequestsEnabled, false);
  assert.equal(DEFAULT_DESK_SETTINGS.reviewRequestsEnabled, true);

  const custom = normalizeDeskSettings({
    reviewMessageTemplate: "Gracias {nombre}, reseña de {negocio}: {link}",
  });
  assert.equal(custom.reviewMessageTemplate, "Gracias {nombre}, reseña de {negocio}: {link}");

  const tooShort = normalizeDeskSettings({ reviewMessageTemplate: "hey" });
  assert.equal(tooShort.reviewMessageTemplate, DEFAULT_REVIEW_MESSAGE);
});

test("review template renders name, business, service and link", () => {
  const message = renderAppointmentMessage(DEFAULT_REVIEW_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    serviceName: "Corte + barba",
    date: "2026-10-19",
    time: "18:00",
    link: "https://micita.pe/review/token",
  });
  assert.ok(message.includes("Ana"));
  assert.ok(message.includes("Barbería Lima"));
  assert.ok(message.includes("Corte + barba"));
  assert.ok(message.includes("https://micita.pe/review/token"));
  assert.ok(!message.includes("{link}"));
});
