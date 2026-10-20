# Central WhatsApp bot (Formatika gateway)

## Model, ktorý používame

Platforma vlastní **jedno oficiálne číslo** („MiCita Perú" / „TuTurno Assistant").
Číslo je raz pripojené ku gateway `msg.formatika.dev`. Biznis **nepripája svoje
osobné číslo** — zákazníci píšu na číslo platformy, bot odpovedá a owner dostane
avízo na svoj WhatsApp.

```
zákazník ──wa.me/<BOT_NUMBER>──▶ Formatika gateway ──webhook──▶ MiCita
                                      ▲                          │
                                      └────── /api/send ◀────────┘
                                                                  │
                                                    owner WhatsApp ◀┘ (avízo)
```

- Zákaznícke odkazy: `https://wa.me/<BOT_NUMBER>?text=...`
  - `Quiero turno en <slug>` → bot vráti `/q/<businessId>`
  - `promo <kód>` → bot vráti share text + `/p/<kód>`
  - `promos <slug>` → zoznam aktívnych promos
  - `estado <token>` → stav turnu v rade
- Owner dostane pri rezervácii promo správu na `ownerWhatsApp` (fallback
  `business.phone`), ak má `notifyOwnerOnClaim = true`.

## Nastavenie (raz pre celú platformu)

1. Na `https://msg.formatika.dev` pripoj oficiálne číslo (QR alebo pairing code).
2. V sekcii **Connected Apps** vytvor API key pre MiCitu:
   - **Webhook URL**: `https://<APP_URL>/api/webhooks/whatsapp`
   - **Webhook Secret Header**: dlhý náhodný reťazec
   - Alias `https://<APP_URL>/api/webhooks/whatsapp/formatika` zostáva podporovaný.
3. Doplň env (viď `.env.example`):

```env
APP_URL=https://micita.pe
WHATSAPP_BOT_NUMBER=51999999999        # digits only, country code
# Interný gateway na tom istom serveri (produkcia, má prednosť):
FORMATIKA_BASE_URL=http://127.0.0.1:8790
# Alternatíva pre staršie nasadenia:
# FORMATIKA_API_URL=https://msg.formatika.dev
FORMATIKA_API_KEY=...                  # z Connected Apps
FORMATIKA_WEBHOOK_SECRET=...           # rovnaký ako v gateway
```

4. Reštartuj app. Pri `GET /api/health` app funguje aj bez kľúča; správy sa len
   zalogujú ako `skipped` (bezpečné pre vývoj).
5. Test: pošli z WhatsApp na číslo bota `promo <existujúci kód>`.

## Implementácia

- **Outbound**: `server/lib/whatsapp.ts`
  - `POST {FORMATIKA_API_URL}/api/send` (confirmed against the live gateway
    dashboard on 2026-10-19)
  - `Authorization: Bearer <FORMATIKA_API_KEY>` (gateway also accepts
    `X-API-Key` / `apikey`, but MiCita uses Bearer)
  - `{ "to": "51999999999", "text": "..." }`
  - success: HTTP 2xx (the dashboard confirms delivery via `to`); error:
    `{ "error": "unauthorized", "message": "..." }`
  - telefón sa normalizuje na digits; 9-miestne peruánske čísla dostanú `51`.
  - každá správa sa loguje do `whatsapp_messages` (`sent|skipped|failed`).
- **Inbound webhook**: `server/routes/whatsapp-webhook.ts`
  - production endpoint `/api/webhooks/whatsapp`; legacy alias `/api/webhooks/whatsapp/formatika`
  - prijíma tolerantne Evolution aj Cloud-API payloady (`data.key.remoteJid`,
    `message.conversation`, `entry[0]…messages[0].text.body`),
  - overí `x-webhook-secret` / `x-formatika-secret` / `Bearer` timing-safe porovnaním,
  - CSRF je pre túto cestu exempt (server-to-server), chránia ju secret + limiter,
  - odpovie cez `/api/send`.
- **Parser**: `server/lib/whatsapp-bot.ts` (unit testy).
- **Audit**: `whatsapp_messages` — `direction`, `phone`, `text`, `status`,
  `provider_message_id`, `error`, `payload`, `created_at`.

## Deep linky v UI

- Promo share kit: `botUrl = wa.me/<BOT>?text=promo%20<kód>`.
- QR na colu: `/q/<businessId>` (priamy link, nevyžaduje bota).
- Do Instagram bio / plagátu sa dá dať:
  `https://wa.me/<BOT>?text=Quiero turno en <customUrl>`.

## Pripomienky a potvrdenia termínov

- Potvrdenie: `POST /api/appointments/public` po vytvorení appointmentu pošle
  WhatsApp s `{fecha}`, `{hora}`, `{link}` na `/cita/<token>` (fire-and-forget).
- Pripomienka: scheduler každých 15 min volá `runWhatsAppReminderPass`;
  okno je `reminderHoursBefore` (1–72 h), idempotencia cez
  `appointments.whatsapp_reminder_sent_at`.
- Owner ich zapína a edituje v `Configuración → Operación`; manuálny pass cez
  `POST /api/dashboard/businesses/:id/reminders/run`.
- Detail: [`PHASE-4-WHATSAPP-REMINDERS.md`](./PHASE-4-WHATSAPP-REMINDERS.md).

## Automatické WhatsApp updaty fronty

- Po vstupe do fronty dostane zákazník `queue_joined` (pozícia, ETA, link
  `/q/:businessId?ticket=<token>`).
- Keď sa uvolní miesto (Sentar / No vino / dokončenie / zrušenie) alebo owner
  stlačí **Llamar**, ide `queue_next` / `queue_called` a ticket prejde do
  `notified`.
- Owner vypína/zapína v `Configuración → Operación` a edituje šablóny
  `queueJoinedTemplate` / `queueCalledTemplate`.
- Detail: [`PHASE-4B-QUEUE-WHATSAPP.md`](./PHASE-4B-QUEUE-WHATSAPP.md).

## Depozity pri rezervácii

- Pri zapnutých depozitoch pošle booking `booking_deposit_request` so sumou a
  linkom `/cita/<token>`; potvrdenie sa pošle až po zaplatení.
- Manuálne zaplatenie v Hoy alebo MercadoPago webhook označí depozit ako `paid`
  a spustí `booking_confirmation` + e-mail.
- Detail: [`PHASE-5-DEPOSITS.md`](./PHASE-5-DEPOSITS.md).

## Recenzie po službe

- Po `completed_at` + `reviewDelayMinutes` pošle scheduler `review_request` s
  linkom `/review/<token>`; `review_request_sent_at` zabráni duplicite.
- Zákazník vyberie 1–5 hviezdičiek a komentár; recenzia ide do moderovania.
- Detail: [`PHASE-6-REVIEWS.md`](./PHASE-6-REVIEWS.md).

## Čakacia listina pri zrušení

- Pri zrušení appointmentu (alebo uvoľnení depozitného holdu) pošle
  `notifyWaitlistForSlot` správu `waitlist_slot` najstarším čakajúcim na ten
  istý service/deň, s linkom `/lista/t/<token>`.
- Prvý klient, ktorý potvrdí, dostane appointment; ostatní sa vrátia do radu.
- Detail: [`PHASE-7-WAITLIST.md`](./PHASE-7-WAITLIST.md).

## Tarjeta de fidelidad

- Po dokončení služby `awardLoyaltyStamp` pridá sello (idempotentne podľa
  appointmentu) a pošle `loyalty_stamp` s progresom alebo prémiou.
- Odkaz `/tarjeta/t/<token>` zobrazí kartu; owner canjeuje prémiu v Lealtad.
- Detail: [`PHASE-8-LOYALTY.md`](./PHASE-8-LOYALTY.md).

## Bezpečnosť a limity

- Webhook secret je povinný v produkcii; bez neho sa každý request odmietne
  (`401`). Vo vývoji je webhook bez secretu povolený. Nastav
  `FORMATIKA_WEBHOOK_SECRET` aj v gateway.
- Gateway API key drž len na serveri (env), nikdy v kliente.
- Bot neposiela citlivé údaje iných zákazníkov; `estado <token>` je scoped na token.
- Ak gateway neodpovie do 10 s, správa sa označí `failed`; rezervácia/claim
  nikdy nepadne kvôli WhatsAppu.
- Bez kľúča sa nič neodošle — v logu sa objaví `[whatsapp] (not configured)`.

## Kontrola kontraktu

```bash
npm run whatsapp:check
# jedna reálna testovacia správa:
WHATSAPP_TEST_TO=51999999999 npm run whatsapp:check -- --send
```

Skript najprv overí, že neautorizovaný `POST /api/send` vráti `401` s JSON
`{ error, message }` (bez odoslania správy), potom overí env. Ak je API kľúč
nastavený, pošle prázdny payload: platný kľúč dostane `400 invalid_phone`
namiesto `401`, takže sa overí bez odoslania WhatsApp správy. S `--send`
odošle **jednu** správu na `WHATSAPP_TEST_TO`; bez tohto flagu nič neposiela.

## Testovanie

```bash
npm run test:unit       # extractInboundMessage + parseBotCommand
npm run smoke:promos    # bot reply pre promo kód (dry-run bez API key)
```
