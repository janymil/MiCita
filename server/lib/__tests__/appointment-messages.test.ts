import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CONFIRMATION_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  renderAppointmentMessage,
} from "../desk-settings.js";

const vars = {
  name: "Carlos",
  businessName: "Barbería Lima",
  serviceName: "Corte + barba",
  date: "2026-10-20",
  time: "17:00",
  link: "https://micita.pe/cita/token123",
};

test("default reminder renders every placeholder", () => {
  const message = renderAppointmentMessage(DEFAULT_REMINDER_MESSAGE, vars);
  assert.ok(message.includes("Carlos"));
  assert.ok(message.includes("Barbería Lima"));
  assert.ok(message.includes("Corte + barba"));
  assert.ok(message.includes("2026-10-20"));
  assert.ok(message.includes("17:00"));
  assert.ok(message.includes(vars.link));
  assert.ok(!message.includes("{nombre}"));
});

test("default confirmation renders every placeholder", () => {
  const message = renderAppointmentMessage(DEFAULT_CONFIRMATION_MESSAGE, vars);
  assert.ok(message.startsWith("¡Listo, Carlos!"));
  assert.ok(message.includes(vars.link));
  assert.ok(!message.includes("{link}"));
});

test("owner templates can use any subset of fields", () => {
  const message = renderAppointmentMessage("Hola {nombre}, te esperamos a las {hora} en {negocio}", vars);
  assert.equal(message, "Hola Carlos, te esperamos a las 17:00 en Barbería Lima");
});
