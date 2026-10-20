# Self-service configuration — mostrador y cola

Všetko, čo Fázy 1–2 priniesli, si owner nastavuje **sám po prihlásení**:
`Dashboard → Configuración → Operación` (alebo ikona ozubeného kolieska na karte
„Cola virtual" v `Hoy`). Žiadny admin zásah, žiadny deploy, žiadne env premenné.

## Kde to je

| Miesto v UI | Čo tam je |
| --- | --- |
| `/dashboard/configuracion?tab=operacion` | celá konfigurácia (taby sú priamo linkovateľné) |
| `/dashboard/hoy` → karta „Cola virtual" | rýchle **Otvoriť / Zavrieť colu**, QR, odkaz na nastavenia |
| `Hoy` → „Terminar y cobrar" / „+ Ingreso" | používajú iba povolené platobné metódy a rešpektujú propiny |

## Čo si používateľ nastaví

| Nastavenie | Default | Rozsah / pravidlo | Kde sa prejaví |
| --- | --- | --- | --- |
| `queueEnabled` — používať colu | `true` | bool | verejná stránka `/q/:id`, karta v Hoy |
| `queueOpen` — cola otvorená teraz | `true` | bool | blokuje nové turny, existujúce platia |
| `maxQueueLength` — max. ľudí v rade | `0` (bez limitu) | 0–200 | pri naplnení vráti 409 „cola llena" |
| `defaultDurationMinutes` | `30` | 5–240 | ETA vo fronte + dĺžka walk-inu bez servisu |
| `notificationTemplate` | španielsky text | 10–300 znakov, `{nombre}`, `{negocio}` | starší text pre owner notifikácie |
| `queueWhatsappEnabled` | `true` | bool | automatické WhatsApp updaty fronty (join/next/call) |
| `queueJoinedTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{posicion}`, `{minutos}`, `{link}` | správa po vstupe do fronty |
| `queueCalledTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{link}` | správa „už si na rade" / Llamar |
| `paymentMethods` | všetkých 5 | aspoň 1 z `cash, yape, plin, card, transfer` | select v oboch pokladničných dialógoch; server odmietne vypnutú metódu |
| `allowTips` | `true` | bool | skryje pole propiny; server tip vynuluje |
| `retentionDays` | `21` | 7–180 | karta „Clientes para recuperar" v Hoy |
| `retentionMessage` | španielsky text | 10–300 znakov, `{nombre}`, `{negocio}`, `{dias}` | WhatsApp správa pre lapsed klientov |
| `promosEnabled` | `true` | bool | `/p/:code`, karta Promos v Hoy |
| `ownerWhatsApp` | `null` (fallback business phone) | 6–30 znakov | avíza o nových promo rezerváciách |
| `notifyOwnerOnClaim` | `true` | bool | posielať avíza cez centrálny bot |
| `promoMessageTemplate` | španielsky text | 10–300 znakov, `{titulo}`, `{precio}`, `{negocio}`, `{link}` | share text promos |
| `showQueueOnMicrosite` | `true` | bool | karta „Fila en vivo / Saca tu turno" na `/:slug` |
| `showPromosOnMicrosite` | `true` | bool | promo karty na `/:slug` |
| `whatsappRemindersEnabled` | `true` | bool | automatické pripomienky cez centrálny bot |
| `reminderHoursBefore` | `24` | 1–72 | okno pripomienky pred termínom |
| `whatsappReminderTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{hora}`, `{link}` | text pripomienky |
| `whatsappConfirmationsEnabled` | `true` | bool | potvrdenie hneď po rezervácii |
| `whatsappConfirmationTemplate` | španielsky text | 10–400, rovnaké placeholdery | text potvrdenia |
| `depositEnabled` | `false` | bool | vyžadovať depozit pri verejnej rezervácii |
| `depositType` | `percent` | `percent` / `fixed` | percento z ceny alebo fixná suma |
| `depositValue` | `20` | percent 1–100, fixed 1–500 | výška depozitu |
| `depositHoldMinutes` | `30` | 5–120 | ako dlho drží slot bez zaplatenia |
| `depositMessageTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{fecha}`, `{hora}`, `{monto}`, `{link}` | WhatsApp žiadosť o depozit |
| `depositPolicy` | španielsky text | 10–500 | text na `/cita/<token>` |
| `reviewRequestsEnabled` | `true` | bool | automatická žiadosť o recenziu po službe |
| `reviewDelayMinutes` | `120` | 0–1440 | minúty po `completed_at` |
| `reviewMessageTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{link}` | WhatsApp žiadosť o recenziu |
| `waitlistEnabled` | `true` | bool | notifikácie pri uvoľnenom termíne |
| `showWaitlistOnMicrosite` | `true` | bool | CTA „Lista de espera" na `/:slug` |
| `waitlistNotifyLimit` | `3` | 1–10 | koľko čakajúcich sa osloví na jeden slot |
| `waitlistMessageTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{hora}`, `{link}` | WhatsApp ponuka uvoľneného termínu |
| `loyaltyEnabled` | `true` | bool | tarjeta de fidelidad |
| `showLoyaltyOnMicrosite` | `true` | bool | CTA „Ver mi tarjeta" na `/:slug` |
| `loyaltyStampsRequired` | `5` | 2–20 | sellos na prémiu |
| `loyaltyReward` | `Un corte gratis` | 3–80 znakov | text prémie |
| `loyaltyMessageTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{sellos}`, `{meta}`, `{link}` | správa po získaní sellu |
| `loyaltyRewardMessageTemplate` | španielsky text | 10–400, `{nombre}`, `{negocio}`, `{recompensa}`, `{link}` | správa po dokončení karty |

## Ako je to uložené

`business_settings.desk_settings` (JSONB, nullable). Pri každom čítaní prejde
`normalizeDeskSettings()`:

- neznáme metódy sa zahodia,
- čísla sa orežú do bezpečného rozsahu,
- prázdny/poškodený template sa nahradí defaultom,
- chýbajúce polia doplní `DEFAULT_DESK_SETTINGS`.

Takže staré businessy bez konfigurácie fungujú hneď a nič nemigrujeme ručne.

## API (owner, `requireAuth` + ownership)

| Metóda | Cesta | Význam |
| --- | --- | --- |
| GET | `/api/dashboard/businesses/:id/desk-settings` | načíta normalized settings |
| PUT | `/api/dashboard/businesses/:id/desk-settings` | uloží celú konfiguráciu (validácia zod) |
| PATCH | `/api/dashboard/businesses/:id/desk-settings/queue-status` | rýchle `{ open: boolean }` z Hoy |
| PATCH | `/api/dashboard/businesses/:id/appointments/:aid/deposit` | `{ status: paid\|waived\|released, method? }` |
| POST | `/api/public/appointments/:token/deposit` | MercadoPago checkout pre depozit |
| POST | `/api/dashboard/businesses/:id/reviews/run` | manuálny review-request pass |
| GET/POST | `/api/public/reviews/:token` | tokenizovaná recenzia po službe |
| GET/POST | `/api/public/waitlist/:businessId` | prihlásenie do listiny |
| GET/POST | `/api/public/waitlist/t/:token(/claim)` | stav a prevzatie uvoľneného slotu |
| GET | `/api/dashboard/businesses/:id/waitlist` | aktívna listina pre owner kartu |
| DELETE | `/api/dashboard/businesses/:id/waitlist/:entryId` | odstránenie čakajúceho |
| GET | `/api/dashboard/businesses/:id/loyalty` | tarjetas + dostupné prémie |
| POST | `/api/dashboard/businesses/:id/loyalty/:cardId/redeem` | canje jednej prémie |
| GET/POST | `/api/public/loyalty/:businessId(/lookup)` | snapshot / hľadanie tarjety podľa telefónu |
| GET | `/api/public/loyalty/t/:token` | tarjeta z WhatsApp linku |
| GET | `/api/dashboard/businesses/:id/retention` | lapsed klienti + hotové `wa.me` odkazy |

Nastavenia sa okamžite premietnu do:

- `GET /api/public/queue/:businessId` → `queue.enabled / isOpen / isFull / closedReason`,
- `POST /api/public/queue/:businessId/tickets` → 403 pri zavretej, 409 pri plnej,
- `GET /api/dashboard/businesses/:id/today` → `deskSettings` pre dialógy,
- `GET /api/dashboard/businesses/:id/queue` → `settings` pre owner kartu,
- `PATCH .../appointments/:id/finish` a `POST .../cashflow/transactions` → validácia metódy,
- `POST .../queue/tickets/:id/call` → text z `queueCalledTemplate`, odošle bot
  a vráti `whatsappUrl` fallback.

## Overenie

```bash
npm run typecheck
npm run test:unit        # normalize/template testy
npm run smoke:queue      # 30 kontrol vrátane config a WhatsApp updatov
npm run smoke:deposits   # 18 kontrol depozitného flow
npm run smoke:reviews    # 16 kontrol recenzií po službe
npm run smoke:waitlist   # 18 kontrol listiny pri zrušení
npm run smoke:loyalty    # 20 kontrol tarjety fidelidad
```

`smoke:queue` okrem happy-path overí: zavretie coly, blokovanie joinu, limit
dĺžky, uloženie metód/šablóny, odmietnutie vypnutej platby a **obnovenie
pôvodného nastavenia** na konci (žiadne testovacie dáta nezostanú).
