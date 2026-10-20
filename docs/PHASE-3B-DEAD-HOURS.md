# Fáza 3b — „Horas muertas" (promos)

Cieľ: premeniť tiché hodiny (napr. utorok 11:00–15:00) na zaplatené termíny bez
toho, aby sa barber musel učiť kalendár. Owner vytvorí promo na 2 kliky, zvyšok
je link/QR a zákazník si sám rezervuje konkrétny čas.

## Tok A → B

### Owner
1. **Configuración → Operación**:
   - `promosEnabled` — zapnuté defaultne,
   - `ownerWhatsApp` — jeho číslo, kam chodia avíza (NIE číslo bota),
   - `notifyOwnerOnClaim` — má/nemá dostávať správu o každej rezervácii,
   - `promoMessageTemplate` — text na zdieľanie s `{titulo}`, `{precio}`, `{negocio}`, `{link}`.
2. **Dashboard → Promos** (alebo karta na Hoy):
   - vyberie službu, cenu, dátum, okno `od–do`, počet cupos,
   - vidí predbežný počet slotov podľa dĺžky služby.
3. Po vytvorení dostane **share kit**: QR, kopírovateľný link, WhatsApp share text
   a odkaz do centrálneho bota.
4. V karte promo vidí `claimed/capacity`, môže **pauznúť / aktivovať / ukončiť**
   a v „Reservas" zrušiť konkrétnu rezerváciu.

### Zákazník (bez účtu)
1. Otvorí `/p/:code` (z QR / Instagramu / WhatsApp statusu).
2. Vidí cenu, prečiarknutú pôvodnú cenu, dátum, okno, zvyšné cupos.
3. Vyberie konkrétny čas (nedostupné sloty sú prečiarknuté), zadá meno a telefón.
4. Rezervácia sa uloží ako **normálna cita** (`source = promo`) v Hoy agende.
5. Cez token v `localStorage` vidí stav a môže rezerváciu zrušiť.

## Pravidlá

- Slot = `service.duration` (fallback `defaultDurationMinutes`), musí sa zmestiť
  do okna; posledný slot končí najneskôr na `endTime`.
- Kapacita sa počíta z aktívnych (`reserved`) claims.
- Jeden slot = jedna rezervácia (partial unique index chráni aj pri súbehu).
- Zrušením claimu sa uvoľní slot aj appointment.
- Po `endTime`/dni alebo po `paused/ended` je public stránka zatvorená s dôvodom.
- Ak sú promos vypnuté v settings, public stránka vráti `state=disabled`.

## Dátový model

- `promos`: business, service, `code` (PRM-XXXXXX), title, price, date,
  start/end, capacity, status (`active|paused|ended`), message.
- `promo_claims`: promo, appointment, client, name/phone, date/time, status
  (`reserved|cancelled`), token, cancelledAt, **partial unique (promo,date,time)**.
- `whatsapp_messages`: audit inbound/outbound správ centrálneho bota.

## API

| Metóda | Cesta | Kto |
| --- | --- | --- |
| GET | `/api/public/promos/:code` | verejné — promo, sloty, zvyšné cupos |
| POST | `/api/public/promos/:code/claims` | verejné — rezervácia (rate limit) |
| GET | `/api/public/promos/:code/claims/:token` | verejné — stav rezervácie |
| POST | `/api/public/promos/:code/claims/:token/cancel` | verejné — zrušenie |
| GET | `/api/public/promos/:code/qr` | verejné — PNG QR |
| GET | `/api/dashboard/businesses/:id/promos` | owner — zoznam + share kit |
| POST | `/api/dashboard/businesses/:id/promos` | owner — vytvorenie |
| PATCH | `/api/dashboard/businesses/:id/promos/:promoId` | owner — pauza/aktivácia/koniec |
| GET | `/api/dashboard/businesses/:id/promos/:promoId/claims` | owner — rezervácie |
| POST | `.../claims/:claimId/cancel` | owner — zrušenie rezervácie |

## WhatsApp (centrálny bot)

Pozri [`WHATSAPP-BOT.md`](./WHATSAPP-BOT.md). Krátko: platforma vlastní jedno
číslo (`WHATSAPP_BOT_NUMBER`) napojené na `msg.formatika.dev`; biznis svoje
osobné číslo nepripája. Bot odpovedá na `promo <kód>`, `promos <slug>`,
`turno <slug>`, `estado <token>` a ownerovi posiela avíza cez `FORMATIKA_API_KEY`.
Ak kľúč nie je nastavený, správy sa zalogujú ako `skipped` a rezervácia funguje.

## Microsite (customer surface)

Owner-controlled section directly on `/:slug`:

- **Fila en vivo** karta: počet ľudí, ETA, stav sily, CTA „Pedir mi turno" →
  `/q/<businessId>`.
- **Promos de horas muertas**: karty s cenou, prečiarknutou pôvodnou cenou,
  časom a zvyšnými cupos → `/p/<code>`.
- Hero CTA „Saca tu turno" (ak je queue zapnutá).
- Dáta sa načítavajú z `GET /api/public/queue/:businessId` a
  `GET /api/public/promos/by-business/:businessId` (live refresh 30/60 s), aby
  microsite cache neskrývala zmeny.
- Prepínače: `showQueueOnMicrosite`, `showPromosOnMicrosite` v
  `Configuración → Operación`.

## Overenie

```bash
npm run typecheck
npm run test:unit       # promos slots + bot parser testy
npm run smoke:promos    # 21 kontrol end-to-end
```

Smoke pokrýva vytvorenie, QR, rezerváciu, dvojitý slot, kapacitu, zrušenie,
uvoľnenie slotu, owner zoznam, bot odpoveď, vypnutie promos a cleanup.

## Obmedzenia

- Notifikácie sú best-effort; bez `FORMATIKA_API_KEY` sa neodosielajú.
- Kapacita sa kontroluje pred insertom; partial unique chráni slot, nie súčet
  kapacity pri extrémnom súbehu (prakticky zanedbateľné pre solo biznis).
- Presuny rezervácie (reschedule) zatiaľ nie sú; zákazník zruší a vyberie nový čas.
