import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DESK_SETTINGS,
  DEFAULT_WAITLIST_MESSAGE,
  normalizeDeskSettings,
  renderAppointmentMessage,
} from "../desk-settings.js";

test("waitlist defaults are enabled with a shared message", () => {
  const settings = normalizeDeskSettings({});
  assert.equal(settings.waitlistEnabled, true);
  assert.equal(settings.showWaitlistOnMicrosite, true);
  assert.equal(settings.waitlistNotifyLimit, 3);
  assert.equal(settings.waitlistMessageTemplate, DEFAULT_WAITLIST_MESSAGE);
  assert.equal(DEFAULT_DESK_SETTINGS.waitlistEnabled, true);
});

test("waitlist notify limit is clamped between 1 and 10", () => {
  assert.equal(normalizeDeskSettings({ waitlistNotifyLimit: 0 }).waitlistNotifyLimit, 1);
  assert.equal(normalizeDeskSettings({ waitlistNotifyLimit: 99 }).waitlistNotifyLimit, 10);
  assert.equal(normalizeDeskSettings({ waitlistNotifyLimit: 5 }).waitlistNotifyLimit, 5);
});

test("waitlist toggle and template are normalized", () => {
  const disabled = normalizeDeskSettings({ waitlistEnabled: false });
  assert.equal(disabled.waitlistEnabled, false);

  const custom = normalizeDeskSettings({
    waitlistMessageTemplate: "Cupo libre en {negocio} a las {hora}: {link}",
  });
  assert.equal(custom.waitlistMessageTemplate, "Cupo libre en {negocio} a las {hora}: {link}");

  const tooShort = normalizeDeskSettings({ waitlistMessageTemplate: "hey" });
  assert.equal(tooShort.waitlistMessageTemplate, DEFAULT_WAITLIST_MESSAGE);
});

test("waitlist template renders the freed slot", () => {
  const message = renderAppointmentMessage(DEFAULT_WAITLIST_MESSAGE, {
    name: "Ana",
    businessName: "Barbería Lima",
    serviceName: "Corte",
    date: "2026-10-20",
    time: "17:00",
    link: "https://micita.pe/lista/t/token",
  });
  assert.ok(message.includes("Ana"));
  assert.ok(message.includes("Barbería Lima"));
  assert.ok(message.includes("Corte"));
  assert.ok(message.includes("17:00"));
  assert.ok(message.includes("/lista/t/token"));
  assert.ok(!message.includes("{hora}"));
});
