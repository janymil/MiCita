# Phase 4b — Automatic WhatsApp queue updates

The virtual queue now talks to the customer on its own. One central MiCita
WhatsApp number serves every business; the owner only configures the messages.

## Owner flow

**Configuración → Operación → Cola virtual**

- **Actualizaciones automáticas por WhatsApp** (on by default)
- **Mensaje al tomar turno**
  Placeholders: `{nombre}`, `{negocio}`, `{posicion}`, `{minutos}`, `{link}`
- **Mensaje cuando ya es su turno**
  Placeholders: `{nombre}`, `{negocio}`, `{link}`

When the toggle is off, joining the queue and the **Llamar** button fall back to
the old behaviour: the customer sees the status page and the owner can still
open the pre-filled `wa.me` chat.

## Customer flow

1. Customer scans the queue QR or opens `/q/:businessId`.
2. Leaves a phone and takes a turn.
3. Receives a WhatsApp message with their position, ETA and a direct link:
   `/q/:businessId?ticket=<token>`.
4. The link works on any device: the queue page reads `?ticket=` and stores the
   token locally, so the customer does not need the original browser.
5. When the customer becomes next (previous ticket seated/skipped/finished, or
   the owner taps **Llamar**), the called message is sent automatically and the
   ticket moves to `notified`.

## Backend

- `server/lib/desk-settings.ts` — new `queueWhatsappEnabled`,
  `queueJoinedTemplate`, `queueCalledTemplate` + `renderQueueMessage()`.
- `server/routes/public-queue.ts` — sends `queue_joined` after a successful
  join; exposes `queue.whatsappUpdates` and reads `?ticket=` on the client.
- `server/lib/queue-notify.ts` — `notifyNextQueueTicket(businessId)` fires the
  `queue_next` message and marks the ticket notified. It never blocks the
  owner's tap (routes call it fire-and-forget).
- `server/routes/desk.ts` — manual **Llamar** sends `queue_called` through the
  gateway and still returns `whatsappUrl` as fallback.
- `server/routes/desk.ts` and `public-queue.ts` — trigger the next-customer ping
  after seat/skip/finish/cancel.

All messages are logged in `whatsapp_messages` with payload
`{ type: "queue_joined" | "queue_called" | "queue_next", ticketId }`.

## Delivery

Requires the same env as the rest of the bot:

```env
FORMATIKA_API_KEY=...
FORMATIKA_WEBHOOK_SECRET=...
WHATSAPP_BOT_NUMBER=...
APP_URL=https://your-public-app
```

Without a key the message is logged as `skipped`; the owner still gets the
`wa.me` fallback from **Llamar**.

## Verification

```bash
npm run check
npm run smoke:queue
```

`smoke:queue` covers join message, manual call message, automatic next-customer
ping, custom templates and cleanup (30 checks).
