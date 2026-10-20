# Phase 7 — Cancellation waitlist

When a booked slot is cancelled, matching customers waiting for that service/day
get a WhatsApp link. The first valid claim creates the replacement appointment.

## A → B flow

1. Owner enables it in **Configuración → Operación → Lista de espera**:
   - show on the microsite
   - how many waiting customers to notify per freed slot (1–10)
   - WhatsApp template
2. Customer sees **“¿No hay cupo? Avísame si se libera”** on:
   - the microsite live-queue section
   - the booking widget when the selected day has no slots
   - or opens `/lista/<businessId>` directly
3. Customer chooses service + date + name/phone → entry is stored as `waiting`.
4. A booking is cancelled:
   - public `/cita/<token>` cancel
   - owner releasing an unpaid deposit hold from Hoy
5. The waitlist helper finds the oldest matching entries (`serviceId`, `date`,
   status `waiting|notified`), messages up to the owner limit, and marks them
   `notified` with `offered_date` / `offered_time`.
6. Customer opens `/lista/t/<token>`:
   - sees the freed date/time and service
   - taps **Reservar este cupo**
7. The claim endpoint:
   - re-checks the slot against active appointments
   - creates/finds the client
   - creates an appointment with `source = "waitlist"` (confirmed, or pending
     with a deposit if deposits are enabled)
   - marks the entry `claimed`
   - puts other notified entries for that same slot back to `waiting`
8. First claim wins; later claims get `409` and the message says the slot was taken.

## Owner UI

- `client/src/components/desk-settings-card.tsx` — waitlist card + public link
- `client/src/pages/dashboard/hoy.tsx` — **Lista de espera** card with waiting /
  notified entries, WhatsApp and remove actions
- `server/routes/desk.ts` — `GET /:businessId/waitlist`, `DELETE .../:id`

## Customer UI

- `/lista/:businessId` — join form (`client/src/pages/waitlist.tsx`)
- `/lista/t/:token` — claim/status page (`client/src/pages/waitlist-claim.tsx`)
- Microsite CTA in `business-microsite.tsx`
- Booking widget fallback link when no slots are available

## Backend

| Piece | Location |
| --- | --- |
| Notify matching entries | `server/lib/waitlist.ts` → `notifyWaitlistForSlot()` |
| Claim + conflict check | `server/lib/waitlist.ts` → `claimWaitlistSlot()` |
| Public APIs | `server/routes/public-waitlist.ts` |
| Cancellation hook | `server/routes.ts` (`POST /api/public/appointments/:token/cancel`) |
| Deposit-release hook | `server/routes/desk.ts` (`PATCH .../deposit` → `released`) |
| Table | `waitlist_entries` |

### API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/public/waitlist/:businessId` | business + enabled + services |
| POST | `/api/public/waitlist/:businessId` | join (idempotent per phone/service/day) |
| GET | `/api/public/waitlist/t/:token` | entry + offer + claim state |
| POST | `/api/public/waitlist/t/:token/claim` | claim the offered slot |
| GET | `/api/dashboard/businesses/:id/waitlist` | owner active list |
| DELETE | `/api/dashboard/businesses/:id/waitlist/:entryId` | remove entry |

## Data

`waitlist_entries`: `business_id`, `service_id`, `name`, `phone`, `date`,
`token` (unique), `status`, `offered_date`, `offered_time`, `notified_at`,
`claimed_at`, `appointment_id`, `created_at`.
Migration: [`migrations/add-waitlist.sql`](../migrations/add-waitlist.sql).

Statuses: `waiting | notified | claimed | expired | cancelled`.

## Owner settings

| Field | Default | Notes |
| --- | --- | --- |
| `waitlistEnabled` | `true` | opt-out |
| `showWaitlistOnMicrosite` | `true` | CTA on public page |
| `waitlistNotifyLimit` | `3` | 1–10 per freed slot |
| `waitlistMessageTemplate` | Spanish text | `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{hora}`, `{link}` |

## Verification

```bash
npm run check
npm run test:unit       # 60 tests incl. waitlist config/template
npm run smoke:waitlist  # 18 checks
```

`smoke:waitlist` covers join/idempotency, owner list, cancellation notification,
offer persistence, claim page, replacement appointment, duplicate claim and
cleanup.

## Limitations

- Notifications fire on the public cancel route and deposit-release action; an
  owner manually editing an appointment status in the legacy calendar does not
  trigger them yet.
- Stale `waiting` entries are not auto-expired; the owner can remove them.
- The claim link is first-come-first-served, not a reserved hold.
- If the business uses deposits, the claimed slot becomes a pending deposit
  booking and follows the Phase 5 flow.
