import assert from "node:assert/strict";
import { test } from "node:test";
import { extractInboundMessage, parseBotCommand } from "../whatsapp-bot.js";

test("extracts a simple Evolution-style payload", () => {
  const message = extractInboundMessage({
    data: {
      key: { remoteJid: "51987654321@s.whatsapp.net", id: "ABC123" },
      message: { conversation: "promo PRM-1234" },
    },
  });

  assert.deepEqual(message, { from: "51987654321", text: "promo PRM-1234", messageId: "ABC123" });
});

test("extracts a Cloud-API style payload", () => {
  const message = extractInboundMessage({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ from: "51911111111", id: "wamid.1", text: { body: "turno barberia-demo" } }],
            },
          },
        ],
      },
    ],
  });

  assert.equal(message.from, "51911111111");
  assert.equal(message.text, "turno barberia-demo");
  assert.equal(message.messageId, "wamid.1");
});

test("missing fields never throw", () => {
  assert.deepEqual(extractInboundMessage(null), { from: null, text: "", messageId: null });
});

test("parses ticket status command", () => {
  assert.deepEqual(parseBotCommand("estado abcdef123456"), {
    type: "ticket_status",
    token: "abcdef123456",
  });
});

test("parses promo and promo list commands", () => {
  assert.deepEqual(parseBotCommand("promo PRM-1234"), { type: "promo", code: "PRM-1234" });
  assert.deepEqual(parseBotCommand("promos barberia-demo"), {
    type: "promo_list",
    slug: "barberia-demo",
  });
});

test("parses queue commands including natural language", () => {
  assert.deepEqual(parseBotCommand("turno barberia-demo"), {
    type: "queue",
    slug: "barberia-demo",
  });
  assert.deepEqual(parseBotCommand("Quiero turno en barberia-demo"), {
    type: "queue",
    slug: "barberia-demo",
  });
});

test("falls back to help", () => {
  assert.deepEqual(parseBotCommand("hola"), { type: "help" });
});
