# Fáza 4a — WhatsApp pripomienky a potvrdenia

Cieľ: znížiť no-show a „zabudnuté" termíny bez toho, aby owner čokoľvek robil
ručne. Všetko ide cez **centrálny bot platformy** (Formatika), nie cez osobné
číslo barbera.

## Tok A → B

### Owner
1. `Configuración → Operación → Recordatorios y confirmaciones por WhatsApp`:
   - `whatsappRemindersEnabled` — zapnúť automatické pripomienky,
   - `reminderHoursBefore` — koľko hodín pred termínom (1–72, default 24),
   - `whatsappReminderTemplate` — text pripomienky,
   - `whatsappConfirmationsEnabled` — potvrdenie hneď po rezervácii,
   - `whatsappConfirmationTemplate` — text potvrdenia.
2. Tlačidlo **„Enviar recordatorios ahora"** spustí rovnaký job manuálne
   (užitočné pri testovaní / po zapnutí).
3. Automatický scheduler beží každých 15 minút.

### Zákazník
- Po rezervácii cez microsite dostane **WhatsApp potvrdenie** s dátumom, časom,
  službou a linkom na `/cita/<token>`.
- Pred termínom dostane **pripomienku** s rovnakým linkom, kde vie zrušiť alebo
  reprogramovať.
- Ak telefón nemá, systém to preskočí a appointment sa označí ako spracovaný.

## Šablóny

Placeholdery: `{nombre}`, `{negocio}`, `{servicio}`, `{fecha}`, `{hora}`, `{link}`.

Default pripomienka:

> Hola {nombre}, te recuerdo tu cita en {negocio}: {servicio} el {fecha} a las
> {hora}. Si no puedes, cancela o reprograma aquí: {link} — MiCita

Default potvrdenie:

> ¡Listo, {nombre}! Tu cita en {negocio} quedó confirmada para {fecha} a las
> {hora} ({servicio}). Puedes cancelar o reprogramar aquí: {link} — MiCita

## Implementácia

- `server/jobs/reminders.ts`
  - e-mail pass zostáva T-24 (existujúce správanie),
  - **`runWhatsAppReminderPass(now, businessId?)`**:
    - vyberie appointments v okne `teraz … teraz + reminderHoursBefore`,
    - `whatsappReminderSentAt` zaručuje idempotenciu (druhý beh neposiela),
    - rešpektuje `whatsappRemindersEnabled` (ak je vypnuté, timestamp nechá
      `NULL`, aby sa po zapnutí ešte poslalo),
    - označí appointment aj keď provider správu preskočí (výpadok gateway).
- `server/lib/whatsapp.ts` — odoslanie cez Formatika `/api/send` + audit.
- `server/routes.ts` (`POST /api/appointments/public`) — potvrdenie sa posiela
  fire-and-forget po vytvorení appointmentu, takže gateway nikdy nezdrží
  rezerváciu.
- `server/routes/desk.ts` — `POST /api/dashboard/businesses/:id/reminders/run`.
- DB: `appointments.whatsapp_reminder_sent_at`,
  `appointments.whatsapp_confirmation_sent_at`.

## API

| Metóda | Cesta | Kto |
| --- | --- | --- |
| POST | `/api/dashboard/businesses/:id/reminders/run` | owner — manuálny pass pre svoj business |

## Overenie

```bash
npm run typecheck
npm run test:unit        # renderovanie šablón
npm run smoke:reminders  # 17 kontrol end-to-end
```

Smoke overí: uloženie okna/šablón, manuálny pass, stamp na appointmente, text
správy + `/cita/` link, idempotenciu, vypnuté pripomienky, verejnú rezerváciu
a potvrdenie.

## Obmedzenia

- Bez `FORMATIKA_API_KEY` sa správy zalogujú ako `skipped`; logika a stamping
  fungujú, takže po doplnení kľúča sa nové termíny odošlú.
- E-mail pripomienky zostávajú na pôvodnom T-24 cykle; WhatsApp má vlastné okno.
- Opakované odoslanie po zlyhaní transportu sa zámerne nerobí (proti loopom);
  owner môže použiť manuálny pass pre nové appointments.
