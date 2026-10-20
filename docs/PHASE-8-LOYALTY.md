# Phase 8 — Loyalty stamps (repeat-visit rewards)

Every completed service adds one stamp to the customer’s card. When the card
reaches the owner’s target, a reward is unlocked and can be redeemed at the shop.

## A → B flow

1. Owner configures **Configuración → Operación → Tarjeta de fidelidad**:
   - stamps required (2–20)
   - reward text (e.g. “Un corte gratis”)
   - WhatsApp messages for a normal stamp / completed card
   - microsite visibility
2. Owner taps **Terminar y cobrar** (walk-in, queue or booking).
   `awardLoyaltyStamp()` runs once per appointment (idempotent by
   `appointment_id`).
3. The customer receives a WhatsApp message with:
   - stamp progress `{sellos}/{meta}`
   - a `/tarjeta/t/<token>` link
   - a special reward message when the target is reached
4. Customer opens the card:
   - `/tarjeta/<businessId>` → lookup by phone
   - or the token link from WhatsApp
   - sees stamps, reward and recent movements
5. Owner opens **Dashboard → Lealtad**:
   - sees all cards and how many rewards are ready
   - taps **Canjear** to redeem one reward
6. The card stays active with lifetime stamps; the next cycle starts immediately.

## Owner UI

- `client/src/components/desk-settings-card.tsx` — loyalty configuration
- `client/src/pages/dashboard/loyalty.tsx` — cards, search, redeem
- `client/src/pages/dashboard/hoy.tsx` — summary card + link
- Dashboard navigation: **Lealtad**

## Customer UI

- `client/src/pages/loyalty.tsx`
  - `LoyaltyLookupPage` at `/tarjeta/:businessId`
  - `LoyaltyCardPage` at `/tarjeta/t/:token`
- Microsite CTA “Ver mi tarjeta” when enabled

## Backend

| Piece | Location |
| --- | --- |
| Award stamp | `server/lib/loyalty.ts` → `awardLoyaltyStamp()` |
| Reward redemption | `server/lib/loyalty.ts` → `redeemLoyaltyReward()` |
| Progress math | `loyaltyProgress()` + `normalizeLoyaltyPhone()` |
| Finish hook | `server/routes/desk.ts` (`PATCH .../appointments/:id/finish`) |
| Owner APIs | `GET /api/dashboard/businesses/:id/loyalty`, `POST .../loyalty/:cardId/redeem` |
| Public APIs | `server/routes/public-loyalty.ts` |

### API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/public/loyalty/:businessId` | business + enabled + reward info |
| POST | `/api/public/loyalty/:businessId/lookup` | find card by phone |
| GET | `/api/public/loyalty/t/:token` | card view from WhatsApp link |
| GET | `/api/dashboard/businesses/:id/loyalty` | owner cards + ready rewards |
| POST | `/api/dashboard/businesses/:id/loyalty/:cardId/redeem` | redeem one reward |

## Data

`loyalty_cards`: one row per `business_id + phone` (unique), with `token`,
`total_stamps` (lifetime), `rewards_redeemed`, `last_stamp_at`.
`loyalty_events`: append-only ledger (`stamp | redeem | adjust`) with
`appointment_id` for idempotency.
Migration: [`migrations/add-loyalty.sql`](../migrations/add-loyalty.sql).

Available rewards = `floor(total_stamps / required) - rewards_redeemed`.
Progress = `total_stamps % required`.

## Owner settings

| Field | Default | Notes |
| --- | --- | --- |
| `loyaltyEnabled` | `true` | opt-out |
| `showLoyaltyOnMicrosite` | `true` | microsite CTA |
| `loyaltyStampsRequired` | `5` | 2–20 |
| `loyaltyReward` | `Un corte gratis` | 3–80 chars |
| `loyaltyMessageTemplate` | Spanish text | `{nombre}`, `{negocio}`, `{sellos}`, `{meta}`, `{link}` |
| `loyaltyRewardMessageTemplate` | Spanish text | `{nombre}`, `{negocio}`, `{recompensa}`, `{link}` |

## Verification

```bash
npm run check
npm run test:unit      # 64 tests incl. phone/progress/template
npm run smoke:loyalty  # 20 checks
```

`smoke:loyalty` covers two completed walk-ins, stamp/reward WhatsApp messages,
card creation, public lookup, token view, owner redemption, duplicate rejection
and ledger counts.

## Limitations

- Cards are looked up by phone in the public page; the token link is the
  stronger identifier.
- Rewards do not expire automatically.
- Redemption is an owner action; there is no customer-side self-redeem.
- One stamp per completed appointment; adjustments are not exposed in the UI.
