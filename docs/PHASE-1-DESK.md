# Fáza 1 — „Hoy" desk (Chair Mode + caja diaria)

Value-first vrstva pre walk-in podniky (barberi, nechty, tatéri v Peru): appka sa
neotvára ako kalendár, ale ako **asistent na viac peňazí a menej čakania**.
Rezervačný engine zostáva pod kapotou.

## Čo je hotové

### F6 — Chair Mode „Sentar cliente ahora"
- Veľké tlačidlo na novom mobile-first home screen `/dashboard/hoy`.
- 2 kliky: služba → (voliteľne) meno/telefón → klient je v sille.
- Server vytvorí `appointments` riadok so `status = in_progress`,
  `source = walk_in`, `started_at = now`, trvaním a cenou servisu.
- Ak je silla obsadená, API vráti `409` s časom uvoľnenia; owner môže vedome
  „Sentar igual" (`force: true`).
- Existujúca rezervácia sa dá posadiť cez `POST .../appointments/:id/seat`.

### F4 — Caja de hoy (Yape / Plin / efectivo)
- `service_transactions` je oddelená od MercadoPago `payments` — hotovosť a
  Yape/Plin nemajú webhook.
- „Terminar y cobrar" dokončí návštevu a v **jednom requeste** zaloguje platbu
  (`PATCH .../appointments/:id/finish`).
- Rýchly manuálny príjem (`+ Ingreso`) pre zákazníkov bez cesty v appke.
- Denný súhrn: total, počet, propiny, rozpad podľa metódy a služby, porovnanie
  s predchádzajúcim dňom. Rovnaký panel je aj vo Finanzas → Resumen.
- Všetko v `America/Lima` (deň = 05:00–05:00 UTC), sumy v PEN.

### Mobile navigation
- Bottom tab bar (Hoy, Citas, Clientes, Finanzas, Servicios) na `md:hidden`;
  desktop sidebar zostáva nezmenený.

## Dátový model

| Tabuľka / stĺpec | Účel |
| --- | --- |
| `appointments.source` | `booking \| walk_in \| queue \| promo` — analytika pôvodu návštevy |
| `appointments.started_at`, `completed_at` | priebeh Chair Mode |
| `service_transactions` | rýchly denný cash log (amount, tip, method, occurred_at, väzby na appointment/client/service) |

## API (všetko `requireAuth` + ownership check)

| Metóda | Cesta | Význam |
| --- | --- | --- |
| GET | `/api/dashboard/businesses/:id/today` | agenda dňa, stav sily, caja, služby |
| POST | `/api/dashboard/businesses/:id/walk-ins` | Chair Mode |
| POST | `/api/dashboard/businesses/:id/appointments/:apptId/seat` | posadiť existujúcu rezerváciu |
| PATCH | `/api/dashboard/businesses/:id/appointments/:apptId/finish` | dokončiť (+ voliteľne zaplatiť) |
| GET | `/api/dashboard/businesses/:id/cashflow/summary` | denný / rozsahový súhrn |
| GET/POST | `/api/dashboard/businesses/:id/cashflow/transactions` | zoznam / rýchly príjem |
| DELETE | `/api/dashboard/businesses/:id/cashflow/transactions/:txId` | zmazať omylom zapísaný príjem |

## Nasadenie schémy

Additive a idempotentné (nič sa nemaže):

```bash
npm run db:ensure-auth      # aplikuje aj Phase-1 statements
npm run db:verify-desk      # overí appointments.source + service_transactions
```

Alternatíva pre ručné spustenie: `migrations/add-walkin-cashflow.sql`.
Prihlásenie pri štarte servera volá `ensureAuthSchema()` (viď `server/db.ts`),
takže čerstvý deploy sa zabezpečí sám.

## Verifikácia

```bash
npm run typecheck
npm run test:unit
npm run build
# server na :5000 (alebo SMOKE_BASE_URL)
npm run smoke:desk
```

`scripts/smoke-desk.mjs` prejde login → walk-in → finish & collect → cash
summary → cleanup a na konci uprace vytvorené riadky.

## Konfigurácia (self-service)

Platobné metódy a propiny si owner zapína v **Configuración → Operación**
(`paymentMethods`, `allowTips`). Detail vrátane queue nastavení:
[`DESK-CONFIG.md`](./DESK-CONFIG.md).

## Fázy

1. ✅ **Fáza 1 (tento dokument)** — Chair Mode + caja diaria.
2. ✅ **Fáza 2 — Virtual queue** — viď [`PHASE-2-QUEUE.md`](./PHASE-2-QUEUE.md).
3. ✅ **Fáza 3 — Horas muertas (F2)** — viď [`PHASE-3B-DEAD-HOURS.md`](./PHASE-3B-DEAD-HOURS.md) a [`WHATSAPP-BOT.md`](./WHATSAPP-BOT.md).
4. ✅ **Fáza 3a — Retencia (F5)** — viď [`PHASE-3-RETENTION.md`](./PHASE-3-RETENTION.md).
5. ✅ **Fáza 4a — WhatsApp pripomienky a potvrdenia** — viď [`PHASE-4-WHATSAPP-REMINDERS.md`](./PHASE-4-WHATSAPP-REMINDERS.md).
6. ✅ **Fáza 4b — automatické WhatsApp updaty fronty** — viď [`PHASE-4B-QUEUE-WHATSAPP.md`](./PHASE-4B-QUEUE-WHATSAPP.md).
7. ✅ **Fáza 5 — no-show depozity** — viď [`PHASE-5-DEPOSITS.md`](./PHASE-5-DEPOSITS.md).
8. ✅ **Fáza 6 — automatické recenzie po službe** — viď [`PHASE-6-REVIEWS.md`](./PHASE-6-REVIEWS.md).
9. ✅ **Fáza 7 — čakacia listina pri zrušení** — viď [`PHASE-7-WAITLIST.md`](./PHASE-7-WAITLIST.md).
10. ✅ **Fáza 8 — tarjeta de fidelidad** — viď [`PHASE-8-LOYALTY.md`](./PHASE-8-LOYALTY.md).
11. **Ďalšie možnosti** — multi-staff/commissions alebo sezónne balíčky.
