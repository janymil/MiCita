# Customer-facing flows — kto čo vidí a kde

Tento dokument mapuje, kde sa každá nová funkcia **reálne objaví zákazníkovi**
a čo si owner nastaví. Cieľ: žiadna funkcia „len v API".

## Prehľad povrchov

| Povrch | Kto ho otvára | Čo tam je |
| --- | --- | --- |
| `https://micita.pe/<slug>` | zákazník z Instagramu/Google | **microsite**: fila v živom prenose, promo karty, služby, recenzie, kontakt |
| `/q/<businessId>` | z micrositu / QR na dverách | turno v rade: výber služby, pozícia, ETA, zrušenie |
| `/p/<code>` | z promo karty / QR / WhatsApp | rezervácia promo slotu: čas, meno, telefón, zrušenie |
| `wa.me/<BOT_NUMBER>` | z Instagram bio / plagátu | centrálny bot: `turno <slug>`, `promos <slug>`, `promo <kód>`, `estado <token>` |
| `/:slug` (owner) → `Dashboard → Hoy` | owner | Chair Mode, caja, fronta, retencia, promos |
| `Dashboard → Promos` | owner | vytvorenie/pauza/ukončenie promos, rezervácie, QR |

## Funkcia „Saca tu turno"

| Vrstva | Kde |
| --- | --- |
| Backend | `GET/POST /api/public/queue/:businessId`, `GET /api/public/queue/tickets/:token` |
| Owner config | `Configuración → Operación`: `queueEnabled`, `queueOpen`, `maxQueueLength`, `defaultDurationMinutes`, `showQueueOnMicrosite`, `queueWhatsappEnabled`, `queueJoinedTemplate`, `queueCalledTemplate` |
| Owner UI | `Hoy → Cola virtual` (Llamar / Sentar / No vino, QR, otvoriť/zavrieť) |
| Customer UI | **microsite** karta „Fila en vivo / Saca tu turno" + hero CTA → `/q/:businessId` |
| Customer akcia | vyberie službu, zadá meno/telefón, vidí pozíciu/ETA, môže zrušiť; token v localStorage aj v odkaze `?ticket=`; pri zapnutých updatoch dostane WhatsApp s pozíciou a avízo „už si na rade" |

## Funkcia „Horas muertas" (promos)

| Vrstva | Kde |
| --- | --- |
| Backend | `GET /api/public/promos/by-business/:businessId`, `GET/POST /api/public/promos/:code…`, owner CRUD `/api/dashboard/businesses/:id/promos` |
| Owner config | `promosEnabled`, `promoMessageTemplate`, `ownerWhatsApp`, `notifyOwnerOnClaim`, `showPromosOnMicrosite` |
| Owner UI | `Dashboard → Promos` (vytvorenie, QR, WhatsApp share, pauza, rezervácie) + karta na `Hoy` |
| Customer UI | **microsite** sekcia „Promos de horas muertas" s cenou, časom a zvyšnými cupos → `/p/:code` |
| Customer akcia | vyberie konkrétny čas, meno/telefón, dostane potvrdenie, môže zrušiť |

## Funkcia „Retenencia"

| Vrstva | Kde |
| --- | --- |
| Backend | `GET /api/dashboard/businesses/:id/retention` |
| Owner config | `retentionDays`, `retentionMessage` |
| Owner UI | `Hoy → Clientes para recuperar` + WhatsApp tlačidlo |
| Customer UI | dostane WhatsApp správu (keď je bot nakonfigurovaný); **nič nekonfiguruje** |

## Funkcia „WhatsApp pripomienky a potvrdenia"

| Vrstva | Kde |
| --- | --- |
| Backend | `runWhatsAppReminderPass` (scheduler 15 min), `POST /api/dashboard/businesses/:id/reminders/run`, potvrdenie v `POST /api/appointments/public` |
| Owner config | `whatsappRemindersEnabled`, `reminderHoursBefore`, `whatsappReminderTemplate`, `whatsappConfirmationsEnabled`, `whatsappConfirmationTemplate` |
| Owner UI | `Configuración → Operación → Recordatorios y confirmaciones` + tlačidlo „Enviar recordatorios ahora" |
| Customer UI | WhatsApp potvrdenie po rezervácii a pripomienka pred termínom s linkom `/cita/<token>` |
| Customer akcia | cez link zruší alebo reprogramuje termín |

## Funkcia „Depozit proti no-show"

| Vrstva | Kde |
| --- | --- |
| Backend | `POST /api/appointments/public` (pending hold), `POST /api/public/appointments/:token/deposit` (MercadoPago), `PATCH /api/dashboard/businesses/:id/appointments/:id/deposit`, expiry job každých 5 min |
| Owner config | `depositEnabled`, `depositType`, `depositValue`, `depositHoldMinutes`, `depositMessageTemplate`, `depositPolicy` |
| Owner UI | `Configuración → Operación → Depósitos anti no-show` + `Hoy → Depósitos por cobrar` |
| Customer UI | `/cita/<token>` karta „Depósito de reserva" s online platbou alebo WhatsApp fallbackom |
| Customer akcia | rezervuje → zaplatí depozit online / v lokále; po zaplatení sa cita potvrdí |

## Funkcia „Automatické recenzie po službe"

| Vrstva | Kde |
| --- | --- |
| Backend | `runReviewRequestPass` (scheduler 10 min), `POST /api/dashboard/businesses/:id/reviews/run`, `GET/POST /api/public/reviews/:token` |
| Owner config | `reviewRequestsEnabled`, `reviewDelayMinutes`, `reviewMessageTemplate` |
| Owner UI | `Configuración → Operación → Reseñas automáticas` + `Dashboard → Reseñas` (moderovanie) |
| Customer UI | `/review/<token>` — hviezdičky 1–5, komentár, po odoslaní read-only poďakovanie |
| Customer akcia | po skončení služby dostane WhatsApp link, ohodnotí návštevu; recenzia čaká na schválenie |

## Funkcia „Lista de espera pri zrušení"

| Vrstva | Kde |
| --- | --- |
| Backend | `notifyWaitlistForSlot` + `claimWaitlistSlot`, `GET/POST /api/public/waitlist/...`, owner `GET/DELETE /api/dashboard/businesses/:id/waitlist` |
| Owner config | `waitlistEnabled`, `showWaitlistOnMicrosite`, `waitlistNotifyLimit`, `waitlistMessageTemplate` |
| Owner UI | `Configuración → Operación → Lista de espera` + karta „Lista de espera" na Hoy |
| Customer UI | `/lista/<businessId>` formulár; `/lista/t/<token>` ponuka uvoľneného termínu |
| Customer akcia | zapíše sa na deň/službu; po zrušení dostane WhatsApp link a prvý potvrdí slot |

## Funkcia „Tarjeta de fidelidad"

| Vrstva | Kde |
| --- | --- |
| Backend | `awardLoyaltyStamp` po dokončení služby, `redeemLoyaltyReward`, `GET/POST /api/public/loyalty/...`, owner `/api/dashboard/businesses/:id/loyalty` |
| Owner config | `loyaltyEnabled`, `showLoyaltyOnMicrosite`, `loyaltyStampsRequired`, `loyaltyReward`, `loyaltyMessageTemplate`, `loyaltyRewardMessageTemplate` |
| Owner UI | `Configuración → Operación → Tarjeta de fidelidad` + `Dashboard → Lealtad` + karta na Hoy |
| Customer UI | `/tarjeta/<businessId>` podľa telefónu; `/tarjeta/t/<token>` z WhatsApp linku |
| Customer akcia | každá dokončená služba = 1 sello; po dosiahnutí cieľa ukáže kartu a owner canjeuje prémiu |

## Funkcia „Bonos prepagados" (Fáza 9)

| Vrstva | Kde |
| --- | --- |
| Backend | `createManualPackagePurchase` / `activatePackagePurchase` / `redeemPackageUse`, owner `/api/dashboard/businesses/:id/packages`, public `/api/public/packages/...` |
| Owner config | `packagesEnabled`, `showPackagesOnMicrosite`, `packageSaleMessageTemplate`, `packageUseMessageTemplate`, `packageLowBalanceMessageTemplate`, `packageExpiryMessageTemplate` |
| Owner UI | `Dashboard → Bonos` (crear/pausar/vender) + `Configuración → Bonos prepagados` |
| Customer UI | `/bono/<packageId>` compra online; `/bono/t/<token>` saldo, vencimiento e historial |
| Customer akcia | compra un paquete de usos; al terminar la visita el dueño descuenta 1 uso y el cliente recibe el saldo por WhatsApp |

## Môže zákazník niečo konfigurovať?

Zákazník nemá účet a nemá čo nastavovať v paneli. Jeho „konfigurácia" je výber v
flow, ktorý je zámerne 2–3 kliky:

- **Queue:** služba → meno/telefón (nepovinné) → turno; môže zrušiť.
- **Promo:** čas → meno/telefón (nepovinné) → rezervácia; môže zrušiť.
- **Bot:** prirodzený text (`Quiero turno en barberia-demo`) alebo príkazy.

Všetko, čo mení správanie businessu (ceny, kapacity, viditeľnosť, texty), je
**owner config** v `Configuración → Operación` / `Promos`, nie zákaznícky panel.
