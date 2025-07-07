# BuscarPeru - Business Management Platform & Public Search Engine

## Overview

BuscarPeru is a comprehensive full-stack business management platform designed specifically for the Peruvian market. It serves as both an internal business operations platform for registered businesses and a public search engine/directory for discovering local businesses across Peru. The application combines modern web technologies with localized features to create a culturally appropriate solution for Peruvian businesses and consumers.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Peruvian-themed color variables
- **State Management**: React Context for authentication, TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handlers
- **Development**: Custom Vite integration for development mode with HMR

### Data Layer
- **Database**: PostgreSQL using Neon Database (via Replit's PostgreSQL service)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Validation**: Zod schemas for type-safe data validation

## Key Components

### Multi-Tenant Business Management
- **Dashboard**: Comprehensive analytics with KPIs and revenue tracking
- **Appointment System**: Full scheduling system with calendar integration
- **Client Management**: Detailed customer profiles with history tracking
- **Service Management**: Catalog with pricing and service descriptions
- **Financial Tracking**: Revenue analytics and business reporting

### Public Search Engine
- **Landing Page**: Acts as comprehensive business discovery platform
- **Advanced Search**: Category filtering, location-based search with GPS
- **Business Directory**: Combines registered microsites with external listings
- **Geographic Integration**: Google Maps integration for location services

### Business Microsites
- **Custom URLs**: Individual business pages at `/negocio/:slug`
- **Public Booking**: Customer-facing appointment scheduling
- **Media Management**: Photo galleries with CDN integration
- **Professional Themes**: Customizable business presentation

### Peruvian Market Specialization
- **Language**: Complete Spanish localization
- **Categories**: Specialized business categories (Belleza, Salud, Fitness, etc.)
- **Location**: Lima, Perú as default with Peruvian geography
- **Cultural Design**: Peru-inspired gradients and color schemes

## Data Flow

### Authentication Flow
1. User registration/login through `/api/auth` endpoints
2. JWT-style authentication with localStorage persistence
3. Context-based authentication state management
4. Protected routes for dashboard access

### Search Flow
1. Public search through `/api/search` with query parameters
2. Combined results from registered businesses and public directory
3. Category and location filtering
4. Real-time search with TanStack Query caching

### Business Management Flow
1. Authenticated users access dashboard through `/dashboard`
2. CRUD operations for services, clients, and appointments
3. Real-time updates through optimistic UI patterns
4. Analytics data aggregation for business insights

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Comprehensive UI component primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling
- **tailwindcss**: Utility-first CSS framework

### Optional Integrations
- **Bunny CDN**: Image and media storage (planned)
- **Nodemailer**: Email notifications (planned)
- **Google Maps API**: Location services (planned)

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- TypeScript compilation with strict mode
- Replit integration with cartographer plugin
- Runtime error overlay for debugging

### Production Build
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles server to `dist/index.js`
3. **Database**: Drizzle migrations via `drizzle-kit push`
4. **Environment**: PostgreSQL connection via `DATABASE_URL`

### File Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Changelog

Changelog:
- July 07, 2025: Initial setup with React frontend and Express backend
- July 07, 2025: Integrated PostgreSQL database using Replit's PostgreSQL service
- July 07, 2025: Set up Drizzle ORM with schema-first approach
- July 07, 2025: Implemented database storage layer with automatic fallback to memory storage
- July 07, 2025: Created two separate modern landing pages:
  - Public search landing page (/) - Business discovery with modern search UI
  - Business landing page (/business) - Business registration and SaaS features
- July 07, 2025: Enhanced micrositio configuration with comprehensive settings:
  - Identity and access configuration (custom URL, professional title, public description)
  - Brand images management (profile and cover images)
  - Extended contact information (address, district, region, postal code)
  - Social media links (Facebook, Instagram, TikTok, YouTube)
  - Feature toggles (public booking, contact form, gallery)
  - Business hours display and schedule notes
- July 07, 2025: Completed dynamic micrositio system implementation:
  - All configuration tabs fully functional with editing capabilities
  - Dynamic public pages generated at /negocio/[custom-url] routes
  - Real-time form validation and database integration
  - No hardcoded data - everything driven by user configuration
  - Fixed React form context errors and ensured stable operation
- July 07, 2025: Enhanced micrositio system with advanced features:
  - Fixed form data persistence issues preventing configuration loss
  - Implemented working toggle functionality for public features (booking, contact, gallery)
  - Added comprehensive blocked dates and hours system in Horarios tab
  - Enhanced public micrositio pages to respect all toggle settings dynamically
  - Restored and secured "barberianicolas" test configuration data
  - All toggle effects immediately visible on public micrositio pages

## User Preferences

Preferred communication style: Simple, everyday language.