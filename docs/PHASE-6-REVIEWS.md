# Phase 6 — Automatic post-service review requests

After a visit is completed, the central WhatsApp bot asks the customer for a
rating. The link is tied to that specific appointment, so reviews cannot be
submitted for arbitrary bookings.

## A → B flow

1. Owner enables reviews in **Configuración → Operación → Reseñas automáticas**:
   - delay after completion (0–1440 min; default 120)
   - WhatsApp template
2. Owner taps **Terminar y cobrar** (or a walk-in/queue visit is finished).
   The appointment stores `completed_at`.
3. The review scheduler (every 10 min) finds completed visits whose delay has
   passed and sends `review_request` with `/review/<token>`.
4. Customer opens the link:
   - sees business, service, date and their name
   - selects 1–5 stars and an optional comment
   - submits
5. The review is created with:
   - `source = "appointment"`
   - `status = "pending"`
   - `appointment_id` (one review per visit)
6. Owner moderates and replies on **Dashboard → Reseñas**; approved reviews
   appear on the microsite.
7. The link becomes read-only after submission (“¡Gracias por tu reseña!”).

## Owner UI

- `client/src/components/desk-settings-card.tsx` — toggle, delay, template and
  **Enviar solicitudes ahora**
- `client/src/pages/dashboard/reviews.tsx` — existing moderation + new
  **Post-visita** source badge/filter

## Customer UI

- New public page `/review/:token`:
  - `client/src/pages/review.tsx`
  - star picker, comment, thank-you state, invalid/expired link state
  - works without an account

## Backend

| Piece | Location |
| --- | --- |
| Request pass | `server/jobs/reviews.ts` → `runReviewRequestPass()` |
| Scheduler | every 10 min, started/stopped in `server/index.ts` |
| Manual trigger | `POST /api/dashboard/businesses/:id/reviews/run` |
| Public link | `server/routes/public-reviews.ts` |
| Token lookup | `appointments.cancel_token` (same token as `/cita/<token>`) |
| Idempotency | `appointments.review_request_sent_at` |
| Duplicate guard | `storage.getReviewByAppointmentId()` + 409 |

The job skips (and stamps) visits without a phone, and leaves disabled
businesses unstamped so re-enabling later still sends. A missing token is
generated at send time.

## Data

- `appointments.review_request_sent_at` (migration:
  [`migrations/add-deposits.sql`](../migrations/add-deposits.sql))
- `reviews.appointment_id` already existed; `source` now accepts `appointment`.
- Review status stays `pending` until the owner approves it.

## Owner settings

| Field | Default | Notes |
| --- | --- | --- |
| `reviewRequestsEnabled` | `true` | opt-out |
| `reviewDelayMinutes` | `120` | 0 = next pass (≤10 min) |
| `reviewMessageTemplate` | Spanish text | `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{link}` |

## Verification

```bash
npm run check
npm run test:unit       # 56 tests incl. review config/template
npm run smoke:reviews   # 16 checks
```

`smoke:reviews` covers the completed-visit fixture, request message + link,
stamping/idempotency, public link payload, submission, duplicate rejection and
the owner moderation list.

## Limitations

- Reviews still require owner moderation before appearing publicly.
- No automatic Google review deep link; the link is MiCita-owned.
- The request is sent once per appointment; no reminder if the customer ignores
  it.
