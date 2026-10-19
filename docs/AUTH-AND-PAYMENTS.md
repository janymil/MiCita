# Authentication & Payments Setup (Self-Hosted Auth + MercadoPago)

This document describes the self-hosted authentication system (which replaced
Stack Auth) and the MercadoPago payment integration.

## Overview

| Concern | Implementation |
| --- | --- |
| Password hashing | `argon2id` (`server/auth/password.ts`), bcrypt legacy hashes auto-upgraded |
| Sessions | Short-lived JWT access token (15m) + rotating refresh token in an HttpOnly cookie |
| Refresh hardening | Hashed at rest, rotated on use, family-wide revocation on reuse detection |
| Sign in with Google | OAuth 2.0 / OIDC Authorization Code + PKCE (`openid-client`) |
| Email OTP | 6-digit codes, HMAC-SHA256 hashed, 10-min TTL, single-use, attempt-limited |
| Phone OTP | E.164 (+51 aware), provider-agnostic SMS/WhatsApp dispatch |
| Password reset | Single-use hashed tokens, 30-min TTL, revokes all sessions on success |
| CSRF | Double-submit cookie + `x-csrf-token` header on mutating cookie requests |
| Audit | Every auth event is written to `auth_audit_log` |
| Payments | MercadoPago Checkout Pro (one-off) + Preapproval (subscriptions) |

### Why not Stack Auth anymore

The previous implementation relied on Stack Auth for tokens and a local
`users` table synced by `stack_auth_id`. That created a hard external
dependency, a placeholder `password` value, and a token-verification hop to
`api.stack-auth.com` on every request. The new system is fully self-contained:
all identity data lives in your Neon database and tokens are verified locally
with a single symmetric secret.

## Environment variables

See `.env.example` for the full annotated list. The minimum for production:

```bash
NODE_ENV=production
APP_URL=https://micita.pe
JWT_SECRET=<48+ random bytes, base64url>       # openssl rand -base64 48
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
ALLOWED_ORIGINS=https://micita.pe,https://www.micita.pe
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> In production the server **refuses to start** without `JWT_SECRET` and
> `DATABASE_URL`.

## Sign in with Google

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create an **OAuth client ID** of type *Web application*.
3. Add an authorized redirect URI that **exactly** matches
   `GOOGLE_REDIRECT_URI` (e.g. `https://micita.pe/api/auth/google/callback`).
   Add the localhost URI too for development.
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

Endpoints:

- `GET /api/auth/google/start` → 302 to Google (sets a short-lived state cookie).
- `GET /api/auth/google/callback` → verifies, links/creates the user, sets the
  refresh cookie, and redirects to `/auth/callback?access_token=...`.

## Email OTP

Email OTP uses the SMTP transport (`server/auth/email-transport.ts`, nodemailer).

```bash
EMAIL_OTP_DRIVER=smtp     # or "console" in development
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USER=no-reply@micita.pe
EMAIL_PASS=<smtp password>
EMAIL_FROM=no-reply@micita.pe
```

Endpoints:

- `POST /api/auth/otp/email/request` `{ email }`
- `POST /api/auth/otp/email/verify` `{ email, code }` → creates the account if
  the email is unknown (passwordless sign-up) and returns a session.

> **Hostinger note:** the SMTP password currently in `.env` is rejected with
> `535 authentication failed`. All email (OTP, password reset, appointment
> notifications) will fail until valid credentials are supplied. Verify with:
> `node scripts/verify-email.mjs` (see below) or the server log.

## Phone OTP (SMS / WhatsApp)

The dispatcher (`server/auth/sms-transport.ts`) supports three drivers:

| `SMS_PROVIDER` | Behaviour |
| --- | --- |
| `console` | Logs the code (development only; disabled in production) |
| `twilio` | Twilio REST API — SMS or WhatsApp (`TWILIO_*` vars) |
| `webhook` | POSTs JSON to `SMS_WEBHOOK_URL` — point this at a self-hosted WhatsApp automation bridge |

For an open-source WhatsApp automation stack, set:

```bash
PHONE_OTP_DRIVER=webhook
SMS_PROVIDER=webhook
SMS_WEBHOOK_URL=https://your-bridge.example.com/send
SMS_WEBHOOK_TOKEN=<shared secret>
```

The bridge receives `{ "to": "+51987654321", "message": "MiCita: tu código..." }`.

Endpoints:

- `POST /api/auth/otp/phone/request` `{ phone }` (accepts `987654321`, `+51987654321`, etc.)
- `POST /api/auth/otp/phone/verify` `{ phone, code }`

## MercadoPago

Get credentials at <https://www.mercadopago.com.pe/developers/panel>:

```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=<from the Webhooks section>
MERCADOPAGO_SANDBOX=true     # false in production
```

Configure the webhook URL in the MercadoPago dashboard:

```
https://micita.pe/api/payments/webhook
```

The webhook validates the `x-signature` header
(`ts=<ts>,v1=<hmac>` over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) and
persists every event in `payment_webhook_events` for idempotency and replay.

Endpoints:

- `POST /api/payments/checkout` `{ businessId, amount, description }` → Checkout Pro `init_point`
- `POST /api/payments/subscribe` `{ businessId, plan: "premium" | "premium_plus" }` → Preapproval `init_point`
- `GET  /api/payments/history`
- `GET  /api/payments/subscription/:businessId`
- `GET  /api/payments/config` (public: public key + plan pricing)
- `POST /api/payments/webhook` (MercadoPago → us)

Approved payments set `businesses.is_premium = true`; authorized preapprovals do
the same for subscriptions.

## Database

All auth/payment tables are created **additively** (no destructive migrations):

```bash
npm run db:ensure-auth     # idempotent; also runs automatically at server start
npm run db:verify          # prints tables + row counts from Neon
```

Tables: `auth_identities`, `verification_otps`, `refresh_tokens`,
`password_reset_tokens`, `email_verification_tokens`, `auth_audit_log`,
`payments`, `payment_webhook_events`, `subscriptions`, plus new nullable
columns on `users`.

### Migrating existing Stack Auth users

Legacy rows keep their `stack_auth_id` and a placeholder `password`. To enable
password login for them, either:

1. Have them use **Forgot password** (works if their email is verified), or
2. Have them sign in with **Google** using the same email (auto-links the account), or
3. Seed a password directly:

```bash
npx tsx -e "import('./server/auth/password.ts').then(async ({hashPassword})=>{console.log(await hashPassword('TempPassword123'))})"
```

## Security checklist before launch

- [ ] `JWT_SECRET` set to a strong unique value (not the dev fallback).
- [ ] `NODE_ENV=production` and `ALLOWED_ORIGINS` restricted to your domains.
- [ ] `ADMIN_PASSWORD` set to a strong value (or left empty and admins promoted via `users.role='admin'`).
- [ ] Valid SMTP credentials (email notifications + OTP).
- [ ] SMS/WhatsApp provider configured (phone OTP).
- [ ] MercadoPago live credentials + webhook secret configured.
- [ ] `MERCADOPAGO_SANDBOX=false`.
- [ ] HTTPS terminated in front of the app (cookies are `Secure` in production).
