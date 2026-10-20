# Fáza 2 — Virtual queue („Saca tu turno")

Rovnaká logika ako kalendár, ale zabalená do veci, ktorú walk-in podnik reálne
chce: **zákazník neodíde, keď vidí plnú lavicu**. Skenuje QR pri dverách, vidí
svoju pozíciu a ETA, a owner ho posadí z obrazovky „Hoy".

## Toky

### Zákazník (bez účtu)
1. Naskenuje QR na dverách / IG → `/q/:businessId`.
2. Vidí počet ľudí v rade, odhad čakania, služby a stav sily.
3. Vyplní meno (+ voliteľne telefón) → dostane `#pozíciu`, `~ETA` a token.
4. Stránka sa obnovuje každých 15 s; token je v `localStorage`, takže môže
   odísť na kávu a vrátiť sa k rovnakému turnu.
5. Keď ho owner označí ako „avizovaný", vidí „¡Ya casi es tu turno!".
6. Po dokončení služby sa turno zobrazí ako `served`.

### Owner
- Karta **Cola virtual** priamo na `/dashboard/hoy`.
- **Llamar** → označí turno ako `notified` a pošle automatickú WhatsApp
  správu cez centrálneho bota; `wa.me` odkaz ostáva ako fallback, keď gateway
  nie je nakonfigurovaná. Bez telefónu len označí a vyzve avizovať osobne.
- **Sentar** → vytvorí `in_progress` appointment so `source = queue`
  (rovnaká cesta ako Chair Mode; pri obsadenej sili ponúkne „Sentar igual").
- **No vino** (UserX) → turno `left`.
- **Mi QR** → dialóg s PNG QR, kopírovaním odkazu, WhatsApp zdieľaním a
  stiahnutím obrázka na tlač.

## Dátový model

`queue_tickets`: business/client/service/appointment väzby, `name`, `phone`,
`status` (`waiting | notified | seated | served | left | cancelled`), opaque
`token` (unique), `joined_at`, `notified_at`, `seated_at`, `closed_at`.

## ETA engine

`server/lib/queue.ts` — čistá funkcia `computeQueuePlan()`:
- poradie podľa `joined_at` (stabilne podľa `id`),
- ak je niekto v sile, jeho **zvyšný čas** posunie celý rad,
- trvanie sa berie zo služby, fallback 30 min,
- prekročená služba nikdy nedá záporné ETA.

Rovnaký plán používa owner karta aj verejná stránka, takže čísla sú vždy
konzistentné. Testy: `server/lib/__tests__/queue.test.ts` (5 prípadov).

## API

| Metóda | Cesta | Kto |
| --- | --- | --- |
| GET | `/api/public/queue/:businessId` | verejné — biznis, rad, služby |
| POST | `/api/public/queue/:businessId/tickets` | verejné — join (rate limit 20/10 min) |
| GET | `/api/public/queue/tickets/:token` | verejné — vlastný turno |
| POST | `/api/public/queue/tickets/:token/cancel` | verejné — cancel |
| GET | `/api/public/queue/:businessId/qr` | verejné — PNG QR |
| GET | `/api/dashboard/businesses/:id/queue` | owner — živý rad |
| POST | `/api/dashboard/businesses/:id/queue/tickets/:tid/call` | owner — notify (bot + wa.me fallback) |
| POST | `/api/dashboard/businesses/:id/queue/tickets/:tid/seat` | owner — posadiť |
| POST | `/api/dashboard/businesses/:id/queue/tickets/:tid/skip` | owner — no vino |

Bezpečnosť: verejné zápisy majú vlastný rate limiter a CSRF double-submit
(rovnako ako zvyšok appky). Cudzie turny nie sú adresovateľné — len cez token.

## Nasadenie

```bash
npm run db:ensure-auth   # aplikuje aj queue_tickets
npm run db:verify-desk   # overí obe tabuľky
npm run smoke:queue      # server na :5000
```

QR obsahuje `${APP_URL}/q/:businessId`. V produkcii nastav `APP_URL` na
verejnú doménu (default `https://micita.pe`). Na localhoste QR zobrazí
`localhost` — z telefónu ho naskenuješ len cez LAN IP alebo tunel
(napr. `APP_URL=http://192.168.1.10:5000 npm run dev`).

## Konfigurácia (self-service)

Owner si všetko nastaví v **Configuración → Operación**: zapnutie/zavretie
coly, limit radu, fallback dĺžku, automatické WhatsApp updaty a ich šablóny,
povolené platobné metódy a propiny. Detail: [`DESK-CONFIG.md`](./DESK-CONFIG.md).

## Microsite (customer entry point)

- Karta „Fila en vivo / Saca tu turno" priamo na `/:slug` s počtom ľudí, ETA a
  stavom sily; CTA vedie na `/q/:businessId`.
- Hero tlačidlo „Saca tu turno" (ak je queue zapnutá).
- Owner toggles: `showQueueOnMicrosite` (a `queueEnabled`) v
  `Configuración → Operación`.
- Dáta sa obnovujú z `GET /api/public/queue/:businessId` každých 30 s.

## Obmedzenia fázy 2

- Notifikácia je automatická cez centrálneho bota (fáza 4b); `wa.me` ostáva
  fallback. Detail: [`PHASE-4B-QUEUE-WHATSAPP.md`](./PHASE-4B-QUEUE-WHATSAPP.md).
- Jeden rad / jedna sila. Multi-staff a viac sál = ďalšia iterácia.
- `served` sa nastaví pri „Terminar y cobrar"; ak owner len zmení status
  appointmentu v starom kalendári, turno treba zavrieť manuálne cez skip.
