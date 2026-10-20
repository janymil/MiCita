import { config } from "../config.js";
import { storage } from "../storage.js";
import { renderQueueMessage } from "./desk-settings.js";
import { getQueueSnapshot } from "./queue-service.js";
import { sendWhatsAppMessage } from "./whatsapp.js";

/**
 * Automatically ping the next waiting customer when the queue advances.
 * Called after seat/skip/finish/cancel. Fire-and-forget from routes so the
 * owner's tap is never blocked by the WhatsApp gateway.
 */
export async function notifyNextQueueTicket(businessId: number): Promise<{
  status: "sent" | "skipped" | "disabled" | "no_ticket";
  ticketId?: number;
}> {
  const snapshot = await getQueueSnapshot(businessId);
  const settings = snapshot.settings;

  if (!settings.queueWhatsappEnabled) return { status: "disabled" };

  const next = snapshot.tickets.find((ticket) => ticket.status === "waiting");
  if (!next) return { status: "no_ticket" };

  const [ticketRow, business] = await Promise.all([
    storage.getQueueTicket(next.id),
    storage.getBusiness(businessId),
  ]);
  if (!ticketRow || !business) return { status: "no_ticket" };

  const link = `${config.appUrl.replace(/\/$/, "")}/q/${businessId}?ticket=${ticketRow.token}`;
  const text = renderQueueMessage(settings.queueCalledTemplate, {
    name: ticketRow.name,
    businessName: business.name,
    position: next.position,
    minutes: next.etaMinutes,
    link,
  });

  const result = await sendWhatsAppMessage({
    businessId,
    to: ticketRow.phone,
    text,
    payload: { type: "queue_next", ticketId: ticketRow.id },
  });

  // Mark as notified even if the provider skipped, so we never spam in a loop.
  await storage.updateQueueTicket(ticketRow.id, {
    status: "notified",
    notifiedAt: new Date(),
  });

  return { status: result.sent ? "sent" : "skipped", ticketId: ticketRow.id };
}
