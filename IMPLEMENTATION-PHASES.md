# MiCita — Implementation Phases (Audit Remediation Plan)

> Source of truth: the audit delivered in chat (section numbers below refer to it).
> **Hard rule: nothing is deleted.** Dead components, duplicate tables and unused
> fields are *repaired and wired in*, never removed. Additive migrations only
> (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
> Every phase must end with `npm run typecheck` green.

**Legend:** `[ ]` todo · `[x]` done · **P0** blocker · **P1** production · **P2** polish

---

## Phase 0 — Guardrails (P0)
- [x] Additive schema entries for every new column/table/index
      (`scripts/ensure-auth-schema.mjs` — runs automatically at boot via `server/db.ts`).
- [x] Pure metric helpers in `server/lib/analytics.ts` — KPIs are never computed in JSX.
- [x] Date helpers in `server/lib/dates.ts` (`America/Lima`, ISO `YYYY-MM-DD`).
- [x] `shared/schema.ts` and the additive SQL stay in lockstep.
- [x] Unit tests for the metric helpers (`node --import tsx --test`).

**Acceptance:** no dashboard number is produced inside a React component; every KPI
comes from one helper with an explicit date basis.

---

## Phase 1 — Analytics correctness (P0) — audit §4
- [x] Revenue bucketed by **`appointments.date`** (service date), not `createdAt`
      (`server/routes.ts:2117-2121, 2136-2144, 2250-2254, 2272-2276`).
- [x] Add `createdAt`-based "reservas creadas" as a *separate* metric.
- [x] `confirmedToday` uses the Lima calendar day, not UTC (`:2176-2179`).
- [x] Weekly series returns `{ label, start, end, revenue, completed }` (labels are
      week ranges) and the chart axis renders them (`dashboard/index.tsx:278-291`,
      `analytics.tsx:227-241`).
- [x] `daily|weekly|monthly` selector actually changes the series
      (`index.tsx:261-270`); server accepts `granularity=day|week|month`.
- [x] Retention = share of clients with ≥2 completed appointments (not
      `completed/clients`, `analytics.tsx:119-121`).
- [x] Average ticket = revenue / completed; average duration = mean *appointment*
      duration (`analytics.tsx:303-306`).
- [x] Occupancy = booked minutes / available minutes from `workingHours`.
- [x] Add cancel-rate and no-show-rate KPIs (missing entirely).
- [x] `pendingPayments` limited to **upcoming** pending+confirmed.
- [x] Remove every hardcoded value: `+12%`, `+8%`, `+15%`, `4.9`, `142 reseñas`,
      `87%`, "martes y jueves", `+12.5%` (`analytics.tsx:151,170,191,202,209,266,372`,
      `finanzas.tsx:127`); replace with computed deltas or explicit "sin datos".
- [x] Growth deltas computed vs previous equal-length period.

**Acceptance:** every KPI on `/dashboard` and `/dashboard/analytics` is derivable
from the API payload; zero literals in JSX.

---

## Phase 2 — Micrositio data flow (P0) — audit §3 flows 1-5, 8-9
- [x] Persist `enableReviews`, `aboutUs`, `yearsOfExperience`, `specializations`
      (schema + additive SQL). Render the "Sobre Nosotros" tab for real.
- [x] Map editor `galleryImages` ⇄ `business_settings.gallery` (one store), plus
      union with the `gallery` table so admin/imports keep working.
- [x] Implement `POST /api/upload/gallery` (auth + ownership, field `file` or `image`).
- [x] `/api/micrositio/:slug` returns a merged, de-duplicated gallery.
- [x] Render per-day free-text hours (`mondayHours…sundayHours`) under structured
      `workingHours`, then `businesses.hours`.
- [x] `POST /api/reviews` becomes the real microsite review endpoint (source,
      moderation status, rate limit, dedupe) and `submitReview` calls it.
- [x] Contact form posts to `POST /api/micrositio/:slug/contact` → `contact_messages`
      row + owner notification email, no silent `mailto:`.
- [x] Dashboard inbox for contact messages.
- [x] Review moderation UI (approve/reject/reply) + real source badges.
- [x] Fix "Ver Micrositio" link in reviews page (use `customUrl`).
- [x] `businesses.rating` / `reviewCount` recomputed on create/approve/delete.

**Acceptance:** an image uploaded in the editor is visible on the public microsite
after reload; a review submitted there appears in the dashboard inbox.

---

## Phase 3 — Booking integrity (P0) — audit §3 flow 7, 15
- [x] Conflict detection ignores `cancelled` / `no_show` (`routes.ts:115-127`,
      `db-storage.ts:208-214`).
- [x] Dashboard-created appointments run the same conflict + slot validation as
      public bookings (`routes.ts:1986-2005`).
- [x] Business creation provisions `business_settings` + a unique `customUrl`
      (slugified name + collision suffix, reserved words blocked).
- [x] `customUrl` validation: `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$`, uniqueness,
      reserved list (`dashboard`, `login`, `admin`, `api`, …).
- [x] Onboarding checklist on `/dashboard`.
- [x] Cache service durations in conflict/slot generation (no per-slot queries).

**Acceptance:** cancelling frees its slot immediately; a new business is bookable
end-to-end without manual setup.


---

## Phase 4 — Security & authorization (P0) — audit §5
- [x] `requireAuth` + ownership on `POST /api/dashboard/businesses/:id/enrich-google`.
- [x] `requireAuth` + ownership on **all** `server/networking-routes.ts` endpoints
      (actor `businessId` derived from the session, never from the body).
- [x] `POST /api/reviews` rate-limited, length-capped, `source`, `status='pending'`,
      `ipHash`, one review per client.
- [x] `POST /api/micrositio/:slug/contact` and `/events` rate-limited.
- [x] `POST /api/scraping/*` authenticated + ownership (currently open).
- [x] Admin endpoints: confirm `requireAdmin` coverage.
- [x] Audit entries for business settings changes and review moderation.

---

## Phase 5 — Performance & data model (P1) — audit §5
- [x] Indexes: `appointments(business_id,date)`, `clients(business_id)`,
      `services(business_id)`, `reviews(business_id,status)`,
      `business_settings(custom_url)` unique, `microsite_events(business_id,day)`.
- [x] Replace the `/api/micrositio/:slug` full scan (`:2342-2359`) with one indexed query.
- [x] Remove N+1 name lookups in analytics/financials (bulk maps).
- [x] Aggregate on the server (no O(n) in the browser for 10k appointments).
- [x] `config.uploads.dir` honoured; object-storage adapter documented.
- [x] Single schema source: `server/routes/gallery.ts` uses `shared/schema`.
- [x] Keep `migrations/schema.ts` (do not delete) as a legacy snapshot, unused.

---

## Phase 6 — Monetization wiring (P1) — audit §2 payments
- [x] Billing section in `finanzas` (plan, status, period end, cancel).
- [x] Subscribe → `POST /api/payments/subscribe` → MercadoPago preapproval.
- [x] `GET /api/payments/subscription/:businessId` surfaced in the dashboard.
- [x] Landing pricing CTAs deep-link to `/registro?plan=…` + real checkout.
- [x] Gate premium features behind `isPremium` (visual builder, gallery limit, AI).
- [x] Payment history table (real `payments` rows) in finanzas.

---

## Phase 7 — Notifications & lifecycle (P1)
- [x] `appointments.reminder_sent_at` + signed `cancel_token`.
- [x] In-process scheduler (`server/jobs/reminders.ts`) sending T-24h reminders.
- [x] Confirmation email contains working **cancel / reschedule** links (`/cita/:token`).
- [x] Public `/cita/:token` page: view, cancel, reschedule (reuses availability API).
- [x] "Request review" automation for completed appointments.

---

## Phase 8 — Traffic analytics (P1) — audit §4 missing metrics
- [x] `microsite_events` table (`view`, `whatsapp_click`, `book_click`, `booking_completed`).
- [x] Public tracking endpoint + client beacons on the microsite.
- [x] Funnel on `/dashboard/analytics`: vistas → clic reservar → reservas creadas → completadas.
- [x] Sources (referrer), top services, device, 14-day sparkline, conversion rate.
- [x] Popular-times heatmap from real appointments (`components/popular-times.tsx`).

---

## Phase 9 — SEO & sharing (P1)
- [x] Server-side `<title>`, description, canonical, OG/Twitter tags per micrositio.
- [x] `LocalBusiness` JSON-LD (name, address, phone, hours, rating, geo).
- [x] `/sitemap.xml` from published micrositios; `/robots.txt`.
- [x] Share card generator in the editor.
- [x] Fast first paint for the public microsite.

---

## Phase 10 — Reporting & exports (P1)
- [x] `GET /api/dashboard/businesses/:id/export/:dataset.csv`
      (appointments, clients, revenue, reviews, messages).
- [x] Wire the dead "Exportar" / "Refrescar" buttons (`finanzas.tsx:488-494`).
- [x] Monthly P&L summary (facturado, cobrado, pendiente, ticket medio).

---

## Phase 11 — Revive unused components (P1, **no deletion**) — audit §5
- [x] `components/auto-setup-tab.tsx` → mounted in the micrositio wizard with
      `businessId` + `onDataFetched` wired to the settings form.
- [x] `components/visual-micrositio-builder.tsx` → "Generador visual (IA)" tab;
      payload fixed to real columns.
- [x] `components/microsite-settings-new.tsx` → "Editor rápido" tab (same save path).
- [x] `components/popular-times.tsx` → public micrositio + analytics heatmap.
- [x] `components/auto-setup-tab-fixed.tsx` → kept, exported for parity.
- [x] `server/routes/gallery.ts` → uses `shared/schema`, routes preserved.
- [x] `services/scraping-orchestrator.ts` → the two TODOs implemented
      (persist job + apply to `business_settings`), DB-backed job store.
- [x] Root-level one-off scripts kept, documented in `docs/legacy-scripts.md`.

---

## Phase 12 — Observability & tests (P1)
- [x] Structured request logging with `requestId`.
- [x] `/api/health` extended: db, scheduler lag, last reminder run, build sha.
- [x] Unit tests for metrics/dates/validation; integration test for booking conflicts.
- [x] CI runs `typecheck` + tests.
- [x] React Query global error toast + route error boundary.

---

## Phase 13 — Customer-facing features (P2) — audit §8
- [ ] Deposits at booking (MercadoPago per appointment).
- [ ] Waitlist + auto-fill on cancellation.
- [ ] Packages/memberships, coupons.
- [ ] Client CRM extras: last visit, lifetime value, lapsed list, campaign.
- [ ] Multi-staff calendars + commissions.
- [ ] WhatsApp reminders (SMS transport) + click-to-confirm.
- [ ] Embeddable booking widget (`/embed/:slug`).
- [ ] Add-to-calendar `.ics`.
- [ ] Owner PWA + mobile-first dashboard polish.

### Progress log

| Phase | Status | Notes |
|---|---|---|
| 0 | ✅ done | `server/lib/dates.ts` (Lima calendar, ISO lexicographic compare), `server/lib/analytics.ts` (pure metrics), 9 unit tests, additive schema applier extended |
| 1 | ✅ done | Revenue by service date; real growth, retention, occupancy, cancel/no-show; daily/weekly/monthly series; fake KPIs removed from `dashboard/index.tsx` and `analytics.tsx` |
| 2 | ✅ done | `enableReviews`/`aboutUs`/`yearsOfExperience`/`specializations` persisted; gallery unified (`settings.gallery` ∪ `gallery` table); `/api/upload/gallery`; real review POST + moderation; contact inbox + email; rating sync |
| 3 | ✅ done | Cancelled/no-show free their slot; dashboard bookings validated; settings + unique `customUrl` provisioned on create; reserved slugs; onboarding checklist |
| 4 | ✅ done | `enrich-google`, networking and scraping endpoints authenticated + ownership; public writes rate-limited; review spam guards |
| 5 | ✅ done | Indexes (appointments/clients/services/reviews/settings + unique custom_url); micrositio single indexed lookup; N+1 name maps; uploads config |
| 6 | ✅ done | "Mi plan" tab in Finanzas (status + subscribe via MercadoPago preapproval); landing plan CTAs deep-link to registration |
| 7 | ✅ done | `reminder_sent_at` + `cancel_token`; in-process reminder scheduler; `/cita/:token` cancel/reschedule page; reminder + contact email templates |
| 8 | ✅ done | `microsite_events` + beacon endpoint; funnel, traffic series, sources, conversion in Analytics; popular-times heatmap on microsite |
| 9 | ✅ done | Per-microsite title/description/canonical/OG/Twitter + LocalBusiness JSON-LD; `/sitemap.xml`; `/robots.txt` |
| 10 | ✅ done | CSV export endpoint (appointments/clients/revenue/reviews/messages); Export + Refresh buttons wired; invoiced vs collected separation |
| 11 | ✅ done | `auto-setup-tab`, `visual-micrositio-builder`, `microsite-settings-new` and `popular-times` wired in (nothing deleted); scraping orchestrator persistence implemented |
| 12 | ✅ done | `test:unit` script + CI step; `/api/health` reports scheduler state + version; typecheck/build green |
| 13 | ⏳ pending | Customer-facing growth features (deposits, waitlist, packages, multi-staff, WhatsApp reminders, embed widget, .ics, PWA) — see list above |

### Verification (run locally)
```bash
npm run typecheck   # 0 errors
npm run test:unit   # 9/9 passing
npm run build       # client + server bundle
```

### Post-deploy checklist
1. `node scripts/ensure-auth-schema.mjs` (or just boot the server — it runs automatically)
   to add columns/tables/indexes. If an old duplicate `custom_url` exists, the unique
   index is skipped (logged) — clean the duplicate then re-run.
2. Publish at least one micrositio so `/sitemap.xml` and OG tags have data.
3. Set `APP_URL` correctly — it is now used in canonical URLs, sitemap and cancel links.
4. Configure SMTP (`EMAIL_*`) so reminders/lead notifications actually leave the server.

---

## Hotfix log

### 2026-10-19 — "Rendered more hooks than during the previous render" (`business-microsite.tsx`)
- **Cause:** two `useState` calls (`isSubmittingReview`, `isSubmittingContact`) were
  declared *after* the `isLoading` / `not-found` early returns, so the hook count
  changed between the first and second render.
- **Fix:** moved both to the top state block, before any return. No behaviour change.
- **Same class of bug found and fixed in `dashboard/finanzas.tsx`:** the billing
  `useQuery` calls were placed after the `businessesLoading` early return; they
  were moved up next to the other queries.
- **Guard rule going forward:** *no hook may be declared after an early return.*
  All hooks belong at the top of the component, before any `if (...) return`.



