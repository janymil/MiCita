# AI Coding Instructions for Business Search Platform

## Big Picture Architecture

This is a **full-stack Peruvian business discovery and appointment management platform** combining:
- **Frontend**: React 18 + TypeScript + Vite with Shadcn/UI components and Tailwind CSS
- **Backend**: Express.js API with TypeScript ES modules  
- **Database**: PostgreSQL with Drizzle ORM and schema-first approach
- **Auth**: Stack Auth for authentication with local database sync
- **Data Sources**: Apify web scraping + OpenStreet business data + user-generated content

## Critical Project Structure

```
/client/                    # React frontend (Vite build)
  /src/pages/dashboard/     # Business owner dashboard pages
  /src/pages/admin/         # Admin panel for data management
  /src/components/          # Shadcn/UI components
  /src/contexts/auth-context.tsx  # Stack Auth integration
/server/                    # Express backend
  /routes.ts               # Main API routes (2,470+ lines)
  /auth-middleware.ts      # Stack Auth token verification  
  /auth-helpers.ts         # Business ownership verification
  /performance-optimizer.ts # Search caching & optimization
/shared/schema.ts          # Database schema (620+ lines) - SINGLE SOURCE OF TRUTH
/stack/                    # Stack Auth configuration
/scrapers/                 # Web scraping scripts for data acquisition
/*.js                      # Data import/analysis scripts (120+ files)
```

## Development Workflow

### Key Commands
- `npm run dev` - Full-stack development server with HMR
- `npm run build` - Production build (client + server)
- `npm run db:push` - Apply schema changes to database
- `npm start` - Production server

### Database Workflow
1. **Schema changes**: Edit `/shared/schema.ts` (Drizzle + Zod validation)
2. **Apply changes**: `npm run db:push` 
3. **Data scripts**: Use `.js` files in root for data import/analysis

## Authentication Architecture

**Hybrid Stack Auth + Local Database Pattern:**
- Stack Auth handles authentication, tokens, and user sessions
- Local `users` table synced via `stack_auth_id` foreign key
- All business data owned by local user records
- API routes protected with `requireAuth` middleware + ownership verification

```typescript
// Pattern for protected business operations
app.post("/api/dashboard/businesses", requireAuth, async (req: AuthenticatedRequest, res) => {
  const dbUser = await getAuthenticatedUser(req, res);
  const isOwner = await verifyBusinessOwnership(req, res, businessId);
  // ... business logic
});
```

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
// All requests auto-include Stack Auth token
const response = await fetch('/api/dashboard/businesses', {
  headers: { 
    'x-stack-access-token': localStorage.getItem('stack-access-token') 
  }
});
```

## Common Debugging Patterns

### Authentication Issues
1. Check Stack Auth token in browser localStorage
2. Verify user sync: `node debug-list-users.js`
3. Test ownership: `node test-auth-fix.js`

### Database Issues  
1. Schema validation: `node check-schema.js`
2. Data analysis: `node analyze-complete.js`
3. Import status: `node check-osm-import-status.js`

### Performance Issues
1. Check cache stats via `performanceOptimizer.getCacheStats()`
2. Monitor query performance in route logs
3. Use `analyze-district-coverage.js` for geographic data insights

## Key Integration Points

- **Google Maps**: Business locations, district detection, street view
- **SendGrid**: Email notifications for appointments
- **Apify**: Professional web scraping for business data
- **Neon Database**: PostgreSQL hosting with connection pooling
- **Stack Auth**: Enterprise authentication with React integration

This codebase prioritizes Peruvian market needs, performance optimization, and hybrid authentication patterns. Focus on understanding the data flow between external sources → database → API → React UI.
