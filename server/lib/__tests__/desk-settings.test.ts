import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DESK_SETTINGS,
  DEFAULT_NOTIFICATION_TEMPLATE,
  DEFAULT_QUEUE_CALLED_MESSAGE,
  DEFAULT_QUEUE_JOINED_MESSAGE,
  normalizeDeskSettings,
  renderNotificationTemplate,
  renderQueueMessage,
} from "../desk-settings.js";

test("null settings fall back to owner-friendly defaults", () => {
  assert.deepEqual(normalizeDeskSettings(null), DEFAULT_DESK_SETTINGS);
  assert.deepEqual(normalizeDeskSettings({}), DEFAULT_DESK_SETTINGS);
});

test("unknown payment methods are dropped and duplicates collapsed", () => {
  const settings = normalizeDeskSettings({
    paymentMethods: ["yape", "bitcoin", "yape", "cash"],
  });
  assert.deepEqual(settings.paymentMethods, ["yape", "cash"]);
});

test("an empty method list means all methods stay enabled", () => {
  const settings = normalizeDeskSettings({ paymentMethods: ["bitcoin"] });
  assert.deepEqual(settings.paymentMethods, DEFAULT_DESK_SETTINGS.paymentMethods);
});

test("numeric settings are clamped to safe ranges", () => {
  const settings = normalizeDeskSettings({
    defaultDurationMinutes: 1,
    maxQueueLength: 9999,
  });
  assert.equal(settings.defaultDurationMinutes, 5);
  assert.equal(settings.maxQueueLength, 200);

  const other = normalizeDeskSettings({
    defaultDurationMinutes: 999,
    maxQueueLength: -5,
  });
  assert.equal(other.defaultDurationMinutes, 240);
  assert.equal(other.maxQueueLength, 0);
});

test("too-short templates fall back instead of sending empty WhatsApp text", () => {
  assert.equal(normalizeDeskSettings({ notificationTemplate: "hi" }).notificationTemplate, DEFAULT_NOTIFICATION_TEMPLATE);
  const custom = normalizeDeskSettings({ notificationTemplate: "Hola {nombre}, ven a {negocio} ya" });
  assert.equal(custom.notificationTemplate, "Hola {nombre}, ven a {negocio} ya");
});

test("template placeholders are replaced", () => {
  const message = renderNotificationTemplate("Hola {nombre}, tu turno en {negocio} casi llega", {
    name: "Carlos",
    businessName: "Barbería Lima",
  });
  assert.equal(message, "Hola Carlos, tu turno en Barbería Lima casi llega");
});

test("default queue messages render every placeholder", () => {
  const joined = renderQueueMessage(DEFAULT_QUEUE_JOINED_MESSAGE, {
    name: "Carlos",
    businessName: "Barbería Lima",
    position: 2,
    minutes: 25,
    link: "https://micita.pe/q/4?ticket=abc",
  });
  assert.ok(joined.includes("Carlos"));
  assert.ok(joined.includes("#2"));
  assert.ok(joined.includes("25 min"));
  assert.ok(joined.includes("?ticket=abc"));
  assert.ok(!joined.includes("{posicion}"));

  const called = renderQueueMessage(DEFAULT_QUEUE_CALLED_MESSAGE, {
    name: "Carlos",
    businessName: "Barbería Lima",
    link: "https://micita.pe/q/4?ticket=abc",
  });
  assert.ok(called.includes("Carlos"));
  assert.ok(called.includes("Barbería Lima"));
  assert.ok(called.includes("?ticket=abc"));
});

test("missing queue position/minutes render as empty strings", () => {
  const message = renderQueueMessage("Hola {nombre}, turno #{posicion} ({minutos} min)", {
    name: "Ana",
    businessName: "Barbería Lima",
    link: "https://micita.pe/q/4",
  });
  assert.equal(message, "Hola Ana, turno # ( min)");
});

test("queue WhatsApp toggle and templates are normalized", () => {
  const defaults = normalizeDeskSettings({});
  assert.equal(defaults.queueWhatsappEnabled, true);
  assert.equal(defaults.queueJoinedTemplate, DEFAULT_QUEUE_JOINED_MESSAGE);
  assert.equal(defaults.queueCalledTemplate, DEFAULT_QUEUE_CALLED_MESSAGE);

  const custom = normalizeDeskSettings({
    queueWhatsappEnabled: false,
    queueJoinedTemplate: "Hola {nombre}, eres el #{posicion} en {negocio}",
    queueCalledTemplate: "Hola {nombre}, ya es tu turno en {negocio}",
  });
  assert.equal(custom.queueWhatsappEnabled, false);
  assert.equal(custom.queueJoinedTemplate, "Hola {nombre}, eres el #{posicion} en {negocio}");

  const tooShort = normalizeDeskSettings({ queueJoinedTemplate: "hey" });
  assert.equal(tooShort.queueJoinedTemplate, DEFAULT_QUEUE_JOINED_MESSAGE);
});
