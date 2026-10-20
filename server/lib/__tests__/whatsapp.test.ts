import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWhatsAppSendResponse } from "../whatsapp.js";
import { isWebhookSecretValid } from "../../routes/whatsapp-webhook.js";

test("Formatika send success keeps optional provider ids", () => {
  assert.deepEqual(parseWhatsAppSendResponse({ ok: true, to: "51999999999" }), {
    providerMessageId: null,
    error: null,
    explicitlyFailed: false,
  });
  assert.equal(parseWhatsAppSendResponse({ id: "ABC" }).providerMessageId, "ABC");
  assert.equal(parseWhatsAppSendResponse({ messageId: 123 }).providerMessageId, "123");
  assert.equal(parseWhatsAppSendResponse({ key: { id: "K1" } }).providerMessageId, "K1");
  assert.equal(parseWhatsAppSendResponse({ data: { id: "D1" } }).providerMessageId, "D1");
  assert.equal(
    parseWhatsAppSendResponse({ data: { message_id: "M1" } }).providerMessageId,
    "M1",
  );
});

test("Formatika errors surface error/message/detail", () => {
  const unauthorized = parseWhatsAppSendResponse({
    error: "unauthorized",
    message: "Provide a valid API key via Authorization: Bearer <key>",
  });
  assert.equal(unauthorized.error, "Provide a valid API key via Authorization: Bearer <key>");
  assert.equal(unauthorized.explicitlyFailed, false);

  assert.equal(parseWhatsAppSendResponse({ detail: "No linked device" }).error, "No linked device");
  assert.equal(parseWhatsAppSendResponse({ ok: false, message: "failed" }).explicitlyFailed, true);
  assert.equal(parseWhatsAppSendResponse({ success: false }).explicitlyFailed, true);
  assert.equal(parseWhatsAppSendResponse(null).explicitlyFailed, false);
});

test("webhook secret is timing-safe and fails closed in production", () => {
  assert.equal(isWebhookSecretValid("abc", "abc", false), true);
  assert.equal(isWebhookSecretValid("abc", "abd", false), false);
  assert.equal(isWebhookSecretValid("abc", "abcd", false), false);
  assert.equal(isWebhookSecretValid(null, "abc", false), false);

  assert.equal(isWebhookSecretValid(undefined, "", false), true);
  assert.equal(isWebhookSecretValid(undefined, "", true), false);
  assert.equal(isWebhookSecretValid("anything", "", true), false);
});
