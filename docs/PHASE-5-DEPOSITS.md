# Phase 5 — No-show protection (booking deposits)

Public bookings can require a partial prepayment. The deposit is **credited to
the service**: the customer pays S/ 10 now and the finish dialog charges only the
remaining balance.

## A → B flow

1. Owner enables deposits in **Configuración → Operación → Depósitos anti no-show**:
   - percent of the service or fixed soles
   - hold window (5–120 min)
   - customer policy text
   - WhatsApp request template
2. Customer books on the microsite.
3. `POST /api/appointments/public` creates the appointment as `pending` with:
   - `deposit_amount`, `deposit_status = pending`, `deposit_expires_at`
   - the slot is blocked while the hold is active
4. The customer is redirected to `/cita/<token>` and receives:
   - `booking_deposit_request` on WhatsApp (when the bot is configured)
   - a **Pagar depósito online** button (MercadoPago Checkout Pro), or
   - “coordinate with the business” when the gateway is not configured
5. Owner can also collect it at the desk from **Hoy → Depósitos por cobrar**:
   - **Yape** or **Efectivo** marks it paid and confirms the booking
   - **Exonerar** confirms without a deposit
   - **Liberar** cancels the hold and frees the slot
6. Payment approval (webhook or owner action):
   - appointment → `confirmed`
   - `deposit_status = paid`, `deposit_paid_at`
   - normal booking confirmation + email are sent
7. If the hold expires unpaid, the scheduler cancels the appointment
   (`deposit_status = expired`) and the slot becomes bookable again.

## Owner UI

- `client/src/components/desk-settings-card.tsx` — deposit card + gateway status
- `client/src/pages/dashboard/hoy.tsx` — **Depósitos por cobrar** card
- `client/src/components/finish-service-dialog.tsx` — amount defaults to
  `price − paid deposit` and shows the credit

## Customer UI

- `client/src/components/booking-widget.tsx` — redirects to the manage page when
  a deposit is required
- `client/src/pages/appointment-manage.tsx` — deposit status, policy, online
  payment button, WhatsApp fallback, expiry notice

## Backend

| Piece | Location |
| --- | --- |
| Amount math | `server/lib/deposits.ts` → `calculateDeposit()` |
| Deposit request | `server/lib/deposits.ts` → `sendDepositRequest()` |
| Confirm on payment | `server/lib/deposits.ts` → `markDepositPaid()` / `waiveDeposit()` |
| Checkout preference | `server/routes/public-deposits.ts` (`POST /api/public/appointments/:token/deposit`) |
| Owner actions | `server/routes/desk.ts` (`PATCH /:businessId/appointments/:id/deposit`) |
| Expiry job | `server/jobs/deposits.ts` (5 min, started in `server/index.ts`) |
| Webhook | `server/payment-routes.ts` — `metadata.type = booking_deposit` confirms the booking and **does not grant premium** |

Manual deposits are written to `payments` with `provider = "manual"` and
`status = "approved"`, so they count as collected revenue. Online deposits use
`provider = "mercadopago"`.

## Data

`appointments`: `deposit_amount`, `deposit_status`, `deposit_paid_at`,
`deposit_expires_at`, `deposit_payment_id`.
Migration: [`migrations/add-deposits.sql`](../migrations/add-deposits.sql).

Statuses: `pending | paid | waived | refunded | expired`.

## Owner settings

| Field | Default | Notes |
| --- | --- | --- |
| `depositEnabled` | `false` | opt-in |
| `depositType` | `percent` | `percent` or `fixed` |
| `depositValue` | `20` | percent 1–100, fixed S/ 1–500 |
| `depositHoldMinutes` | `30` | 5–120 |
| `depositMessageTemplate` | Spanish text | `{nombre}`, `{negocio}`, `{fecha}`, `{hora}`, `{monto}`, `{link}` |
| `depositPolicy` | Spanish text | shown on `/cita/<token>` |

## Verification

```bash
npm run check
npm run test:unit        # 52 tests incl. deposit math/templates
npm run smoke:deposits   # 18 checks
npm run smoke:queue      # 30 checks
npm run smoke:reminders  # 17 checks
```

`smoke:deposits` covers pending hold, WhatsApp request, manage-page payload,
offline gateway fallback, owner cash/Yape registration, payments ledger,
confirmation after payment, and releasing a hold.

## Limitations

- Refunds are not automated; `deposit_status = refunded` exists for manual
  reconciliation.
- Online checkout requires `MERCADOPAGO_ACCESS_TOKEN`; without it the customer
  pays at the shop and the owner records it from Hoy.
- Deposits apply to public bookings only (not queue tickets or promos).
