# AI Coding Instructions for Business Search Platform

## Big Picture Architecture

This is a **full-stack Peruvian business discovery and appointment management platform** combining:
- **Frontend**: React 19 + TypeScript + Vite with Shadcn/UI components and Tailwind CSS
- **Backend**: Express.js API with TypeScript ES modules  
- **Database**: PostgreSQL (Neon) with Drizzle ORM and schema-first approach
- **Auth**: **Self-hosted** — JWT access tokens + rotating refresh cookies, argon2id passwords, Google OAuth, email + phone OTP
- **Payments**: MercadoPago (Checkout Pro + Preapproval subscriptions)
- **Data Sources**: Apify web scraping + OpenStreet business data + user-generated content

## Critical Project Structure

```
/client/                    # React frontend (Vite build)
  /src/pages/dashboard/     # Business owner dashboard pages
  /src/pages/admin/         # Admin panel for data management
  /src/pages/auth/          # Login, register, OTP, password reset
  /src/components/          # Shadcn/UI components
  /src/contexts/auth-context.tsx  # Auth provider (useAuth)
  /src/lib/auth-api.ts      # Typed auth client + authenticated fetch
/server/                    # Express backend
  /config.ts               # Central env config (fail-fast in production)
  /routes.ts               # Main API routes
  /auth-routes.ts          # Self-hosted auth endpoints
  /auth/                   # password, tokens, otp, google, refresh services
  /payment-routes.ts       # MercadoPago endpoints + webhook
  /payments/mercadopago.ts # MercadoPago REST client
  /auth-middleware.ts      # requireAuth / optionalAuth / requireAdmin
  /auth-helpers.ts         # Business/service/client ownership checks
/shared/schema.ts          # Database schema - SINGLE SOURCE OF TRUTH
/scripts/                  # ensure-auth-schema, verify-neon, smoke-auth, verify-email
```

## Development Workflow

### Key Commands
- `npm run dev` — full-stack dev server with HMR
- `npm run build` — production build (client + server)
- `npm start` — production server
- `npm run typecheck` — `tsc --noEmit` (must pass; CI blocks on it)
- `npm run db:ensure-auth` — additive, idempotent auth/payment schema
- `npm run db:verify` — inspect live Neon tables/counts
- `npm run smoke:auth` — runtime checks for auth/payments modules

### Database Workflow
1. **Schema changes**: edit `/shared/schema.ts` (includes `auth_identities`, `refresh_tokens`, `verification_otps`, `payments`, `subscriptions`, `auth_audit_log`).
2. **Apply**: `npm run db:push`, or add an idempotent statement to `scripts/ensure-auth-schema.mjs`.
3. The additive schema is also applied automatically at server startup.

## Authentication Architecture

**Self-hosted, no external auth provider:**
- Passwords: argon2id (`server/auth/password.ts`); legacy bcrypt hashes auto-upgraded.
- Tokens: 15-minute JWT access token + rotating refresh token in an HttpOnly cookie, hashed at rest with reuse detection.
- Providers share `auth_identities`: `password`, `google`, `email_otp`, `phone_otp`.
- All auth events are written to `auth_audit_log`.

```typescript
// Protected business operation pattern
app.post("/api/dashboard/businesses", requireAuth, async (req: AuthenticatedRequest, res) => {
  const dbUser = await getAuthenticatedUser(req, res);
  const owns = await verifyBusinessOwnership(req, res, businessId);
  // ... business logic
});
```

Admin routes (`/api/admin/*`) use the shared `adminAuth` gate in
`server/admin-auth.ts`: an authenticated user with `role='admin'` / an
allow-listed email, or a constant-time-compared legacy bearer token.
Never reintroduce a hardcoded admin password fallback.

## Frontend Auth Pattern

```typescript
// All requests go through apiFetch, which attaches the access token,
// refreshes it transparently, and sends the CSRF header on writes.
import { apiFetch } from "@/lib/auth-api";
const res = await apiFetch("/api/dashboard/businesses");
```

Never call the Stack Auth APIs or use `x-stack-access-token`; that system was removed.

## Data Architecture Layers

### Core Business Tables
- `businesses` - User-owned business profiles with micrositio URLs
- `services` - Business service catalog with pricing
- `appointments` - Full booking system with 6 status states
- `clients` - Customer database per business
- `business_settings` - Micrositio customization & working hours

### External Data Sources  
- `apify_businesses` - Web-scraped businesses (enhanced with badges, marketing analysis)
- `openstreet_businesses` - Geographic business data
- Deduplication via `place_id` constraints

## Peru-Specific Patterns

### Geographic Structure
- **Districts**: 49 Lima districts + major cities (Arequipa, Trujillo, etc.)
- **Address format**: `address` + `district` + `referencia` (landmark)
- **Phone format**: `+51` country code with formatting validation

### Business Categories
```javascript
// Main categories mapped to Peruvian market
const categories = {
  'Gastronomía': ['Restaurantes', 'Cafeterías', 'Bars'],
  'Belleza': ['Salones', 'Spas', 'Centros de belleza'],
  'Salud': ['Clínicas', 'Farmacias', 'Dentistas'],
  'Servicios': ['Profesionales', 'Reparaciones'],
  'Fitness': ['Gimnasios', 'Estudios de yoga'],
  'Automotriz': ['Talleres', 'Repuestos']
};
```

## Performance & Data Processing

### Search Optimization
- Spatial clustering for map searches via `SpatialClusterer`
- Redis-like caching in `performance-optimizer.ts` with TTL
- Field optimization per view type (list/map/grid)
- Query result pagination with lazy loading

### Web Scraping Workflow
- Run individual scrapers: `node scrapers/{category}-scraper.js`
- Bulk import: Use `import-*.js` scripts
- Analysis: Use `analyze-*.js` scripts for data insights
- Deduplication handled automatically via database constraints

## Frontend Patterns

### Component Architecture
- **Shadcn/UI**: All UI components from Radix primitives
- **Forms**: React Hook Form + Zod validation (matches backend schemas)
- **State**: TanStack Query for server state, React Context for auth
- **Routing**: Wouter for lightweight routing

### Dashboard Organization
```
/dashboard/                 # Business owner area
/dashboard/micrositio       # Drag-and-drop site builder  
/admin/                     # Platform admin area
/{customUrl}               # Business microsites (catch-all route)
```

### API Request Pattern
```typescript
// All requests go through apiFetch, which attaches the access token,
// refreshes it transparently on 401, and sends the CSRF header on writes.
import { apiFetch } from "@/lib/auth-api";
const response = await apiFetch('/api/dashboard/businesses');
```

## Common Debugging Patterns

### Authentication Issues
1. Auth endpoints live in `server/auth-routes.ts`; check the audit trail in `auth_audit_log`.
2. Inspect users: `node scripts/check-users.mjs`
3. Runtime auth checks: `npm run smoke:auth`
4. Email/SMTP health: `node scripts/verify-email.mjs you@example.com`

### Database Issues  
1. Live Neon tables/counts: `npm run db:verify`
2. Apply additive auth schema: `npm run db:ensure-auth`
3. Health probe: `GET /api/health`

### Performance Issues
1. Check cache stats via `performanceOptimizer.getCacheStats()`
2. Monitor query performance in route logs
3. Use `analyze-district-coverage.js` for geographic data insights

## Key Integration Points

- **Google Maps**: Business locations, district detection, street view
- **SMTP (nodemailer)**: Email OTP, password reset, appointment notifications
- **Apify**: Professional web scraping for business data
- **Neon Database**: PostgreSQL hosting with connection pooling
- **MercadoPago**: Checkout Pro (one-off) + Preapproval (subscriptions)
- **Google OAuth**: Sign in with Google (Authorization Code + PKCE)

This codebase prioritizes Peruvian market needs, performance optimization, and self-hosted authentication. Focus on understanding the data flow between external sources → database → API → React UI.
