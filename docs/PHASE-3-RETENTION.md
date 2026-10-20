# Fáza 3a — Retencia „Ya te toca corte"

Barberi a solo služby strácajú pravidelných klientov hlavne preto, že si
jednoducho zabudnú prísť. Táto fáza dáva ownerovi **hotový zoznam ľudí, ktorí
neprišli v jeho okne**, a jedno kliknutie na WhatsApp správu — bez CRM školenia.

## Tok pre ownera (A → B)

1. V **Configuración → Operación** nastaví:
   - `retentionDays` — po koľkých dňoch bez návštevy sa má ozvať (7–180, default 21),
   - `retentionMessage` — text s `{nombre}`, `{negocio}`, `{dias}`.
2. Na **Hoy** vidí kartu **„Clientes para recuperar"** s počtom a zoznamom
   (posledná návšteva, koľko dní, počet návštev, celková útrata).
3. Klikne **WhatsApp** → otvorí sa `wa.me` s predvyplnenou personalizovanou správou.
4. Po návšteve klient zmizne zo zoznamu (počíta sa posledná **dokončená** návšteva).

## Pravidlá výpočtu (`server/lib/retention.ts`)

- Počíta sa len `appointments.status = completed` a dátum ≤ dnes.
- Zrušené / no-show návštevy sa ignorujú.
- Klient, ktorý ešte nikdy nebol dokončený, nie je „lapsed" (nový zákazník).
- `daysSince = dnes − posledná návšteva`; zoradené najdlhšou absenciou.
- Limit 50 klientov na jeden response; UI zobrazí prvých 5.

## API

| Metóda | Cesta | Význam |
| --- | --- | --- |
| GET | `/api/dashboard/businesses/:id/retention` | zoznam + hotové `whatsappUrl` pre každého |

Nastavenia sú súčasťou `desk_settings` (JSONB), takže žiadna nová tabuľka.

## UI

- `client/src/components/desk-settings-card.tsx` → tretia karta „Recuperar clientes".
- `client/src/pages/dashboard/hoy.tsx` → karta „Clientes para recuperar" s odkazom
  na nastavenia a WhatsApp tlačidlami.

## Verifikácia

```bash
npm run test:unit     # 6 testov pre retention engine
npm run smoke:queue   # 26 kontrol vrátane lapsed fixture a custom šablóny
```

Smoke vytvorí klienta s dokončenou návštevou spred 60 dní, overí jeho zobrazenie,
custom okno 30 dní a text správy, a na konci všetko zmaže.

## Obmedzenia

- Zoznam sa obnovuje pri otvorení Hoy (poll 5 min); žiadny cron/e-mail.
- WhatsApp je v1 click-to-chat (rovnako ako fronta).
- „Lapsed" sa počíta z dokončených návštev; budúce rezervácie klienta nevyradia,
  čo je zámer (owner chce vidieť aj toho, kto má termín, ale dlho nebol).
