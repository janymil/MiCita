# Production Readiness Guide

Assessment of the MiCita ("Business Search Platform") codebase and the work done
to move it from an early MVP toward production, plus the remaining roadmap.

## Stack

- **Frontend**: React 19 + TypeScript + Vite, Shadcn/UI (Radix), Tailwind, Wouter, TanStack Query.
- **Backend**: Express 4 + TypeScript (ESM), Drizzle ORM.
- **Database**: PostgreSQL on **Neon** (live, pooled connection).
- **Auth**: self-hosted (replaced Stack Auth) — password, Google OAuth, email OTP, phone OTP.
- **Payments**: MercadoPago (Checkout Pro + Preapproval).

## What was true at the start (MVP findings)

| Area | Problem |
| --- | --- |
| Auth | Delegated to Stack Auth; local `users.password` was the literal string `stack-auth`; a Stack-authenticated user could be accepted by a plaintext comparison path. |
| Admin | `ADMIN_PASSWORD || 'admin123'` fallback; password compared with `!==`; stored in `localStorage`. |
| Sessions | `express-session` imported but never configured; no real session store. |
| Database | Required `DATABASE_URL` with no pool limits, no health check, no TLS handling. |
| Uploads | User email used directly in a filesystem path (path traversal); no sanitisation. |
| CSP | `frameSrc 'none'` blocked payment iframes; `connectSrc` allowed `api.stack-auth.com`. |
| Errors | ~262 pre-existing TypeScript errors; `npm run build` runs `vite build` which does not typecheck, so builds pass while `npm run check` fails. |
| Email | `.env` SMTP credentials rejected by Hostinger → all notification email silently failing. |
| Secrets | `.env` committed historically; Dockerfile copied `.env` into the image. |

## What was implemented

### Authentication (self-hosted)
- `argon2id` password hashing with transparent bcrypt upgrade and a strength policy.
- JWT access tokens (15m) + **rotating refresh tokens** hashed at rest, with
  reuse detection that revokes the entire token family.
- **Sign in with Google** via OIDC Authorization Code + PKCE (state + nonce + PKCE cookies).
- **Email OTP** (SMTP) and **phone OTP** (E.164 +51 aware) with cooldowns,
  attempt limits, single-use codes, and generic (non-enumerating) responses.
- Password reset with single-use hashed tokens; revokes all sessions on success.
- Per-request auth middleware (`requireAuth`, `requireAdmin`) that validates the
  JWT locally — no external verification hop.
- Double-submit **CSRF** protection for cookie-authenticated writes.
- **Audit log** for every auth event (`auth_audit_log`).

### Payments (MercadoPago)
- Checkout Pro one-off payments and Preapproval subscriptions (no SDK dependency).
- Signature-validated webhooks persisted for idempotency/replay; approved
  payments grant premium status.

### Database (Neon)
- Verified live: 8,580 scraped + 53,807 OSM businesses, plus real users/appointments.
- Pooled, TLS-aware `postgres-js` client with configurable pool limits.
- **Additive, idempotent** schema setup (`scripts/ensure-auth-schema.mjs`) that
  runs at boot — no destructive migrations. All 9 new tables created and verified.

### Security hardening
- Helmet CSP updated for Google Maps, MercadoPago frames, and reCAPTCHA-free flows.
- Strict CORS allowlist; `trust proxy` for correct client IPs behind a proxy.
- Tiered rate limiting (API / auth / OTP) with per-endpoint cooldowns.
- Tightened JSON/body limits; request logging with secret redaction.
- Upload path + filename sanitisation; `dotfiles: deny` static serving.
- Removed the `/api/debug/email-config` information leak.
- Production **fail-fast** config validation (no insecure secret fallbacks).
- Admin routes now require an authenticated `role=admin` user or an allow-listed
  email; the legacy bearer token is constant-time compared and disabled by default.
- Dockerfile no longer embeds `.env`; multi-stage build runs as a non-root user.

## Verification performed

```
npm run smoke:auth     # 18 checks: hashing, JWT, OTP round-trip, Neon ping, routers
npm run db:verify      # live Neon tables + counts
```

End-to-end against a running server: register (201), login (200), wrong password
(401), refresh rotation, logout, admin 401/403 gating, email + phone OTP
passwordless sign-in, password reset (single-use), payment auth gating, CSRF
(403 → 201).

## Typecheck: fixed and gated

`npm run typecheck` (`tsc --noEmit`) now passes with **0 errors**, down from
**262 pre-existing errors** (which rose to ~843 when the new `users` columns
exposed type debt in legacy admin routes).

What was fixed:

- `tsconfig` target raised to ES2022 (removed downlevel-iteration errors).
- Added `@types/google.maps` for the map components.
- Replaced the dead `MemStorage` fallback; `storage` is now a single,
  interface-checked `DBStorage` instance.
- Drizzle query builders no longer reassign across incompatible select shapes
  (map view, admin filters, search engine) — conditions are composed and passed
  once.
- JSONB array columns (`tags`, `gallery`, `blockedDates`, `blockedHours`,
  `workingHours`, `requiredSkills`) get explicit Zod types instead of broken
  inferred array types; networking insert types use `$inferInsert`.
- Replaced `db.sql` with drizzle operators; fixed a SQL-injection string in the
  admin business search; fixed a `clusterKey` reference bug in clustering.
- Null-safety for decimal/integer columns (`service.duration`, `price`,
  `reviewCount`, `rating`, `qualityScore`) and typed all client `useQuery`
  generics via `client/src/lib/api-types.ts`.
- Removed dead/broken pages that could not compile (`search.tsx`, `home.tsx`,
  unused admin analytics/apify pages).

CI now **blocks merges** on typecheck failure: `.github/workflows/ci.yml` runs
`npm ci`, `npm run typecheck`, and `npm run build` on every push/PR.

### Also fixed while in there

- `PATCH /api/dashboard/businesses/:id/settings` existed in the UI but not the
  API (405); added the route (shared with `PUT`).
- Microsite settings fields the UI wrote but the schema discarded
  (`websiteUrl`, `whatsappNumber`, per-day hours, `gallery`) now persist.
- The microsite save/upload calls bypassed auth and hit a non-existent
  `/api/upload/gallery`; both now use the authenticated `apiFetch` and
  `/api/upload`.
- `apify_businesses.is_active` was referenced by admin filters but did not
  exist; added the column.
- Added a Google Places enrichment service for the previously undefined
  `googlePlacesService` endpoint (returns 503 when no API key is configured).

## Remaining roadmap to launch

1. **Rotate every secret** currently in `.env` (DB, APIFY, OPENAI, PIXABAY, KAGI, SMTP) — treat as compromised; `.env` was in Git history at some point.
2. **Fix SMTP** — Hostinger rejects the current password; email OTP/reset/notifications all fail until corrected.
3. **Configure Google OAuth** credentials + redirect URI.
4. **Configure SMS/WhatsApp** provider for phone OTP (or accept email+Google only at first).
5. **Configure MercadoPago** live credentials + webhook secret; set `MERCADOPAGO_SANDBOX=false`.
6. **Promote an admin** (`UPDATE users SET role='admin' WHERE email='...'`) and remove `ADMIN_PASSWORD`.
7. **Object storage** for uploads (S3/Cloudflare R2) — local disk breaks on multi-instance deploys.
8. **Observability**: structured logs, error tracking (Sentry), uptime + `/api/health` alerts.
9. **Tests**: add Vitest for auth/payment units and a Playwright smoke flow.
10. **Legal/compliance**: privacy policy, terms, and a data-deletion path (scrubbing is already in the schema design).
11. **Backups**: confirm Neon PITR/branching policy for the production branch.

## Operational notes

- Port is `5000` (see `.replit` / Docker). Behind Hostinger/nginx the app must
  trust exactly one proxy hop (`TRUST_PROXY=1`, the default in production).
- Health: `GET /api/health` → `{ status, database, uptimeSeconds }`.
- The database schema is applied at startup; no manual migration step is required.
