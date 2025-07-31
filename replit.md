# MiCita - Comprehensive Appointment Management System

## Overview
MiCita is a comprehensive full-stack appointment management platform for Spanish-speaking small to medium businesses. It offers an internal dashboard for appointment scheduling, client management, and analytics, alongside public business microsites for discovery and online booking. The platform aims to provide a culturally appropriate solution for appointment-based service businesses using modern web technologies and Spanish localization.

## Recent Changes (January 31, 2025)
- **Fixed Authentication Issues**: Resolved 401 errors in scraped data application by correcting API endpoint and enhancing token handling
- **Enhanced Image Scraping**: Significantly improved Facebook, Instagram, and Google Maps image extraction with comprehensive logging and better Apify configuration
- **AI Model Optimization**: Changed from GPT-4o to GPT-4o-mini for cost efficiency in content generation
- **Comprehensive Logging**: Added detailed debugging logs to track image extraction process and identify data flow issues
- **Improved Apify Configuration**: Enhanced scraper settings for better image capture (Facebook: 50 images, Instagram: 30 posts with highlights/reels)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with Peruvian-themed color variables
- **State Management**: React Context (authentication), TanStack Query (server state)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Modern glass-morphism design, gradient color schemes, responsive grid layouts, enhanced typography, interactive elements, card-based information display, tabbed configuration interfaces.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API
- **Development**: Custom Vite integration for HMR

### Data Layer
- **Database**: PostgreSQL (Neon Database via Replit)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit
- **Validation**: Zod schemas

### Key Components & Technical Implementations
- **Multi-Tenant Business Management**: Dashboard with KPIs, appointment scheduling, client management, service management, financial tracking.
- **Public Search Engine**: Landing page, advanced search with category/location filtering, business directory with Google Maps integration.
- **Business Microsites**: Custom URLs (`/negocio/:slug`), public booking, media management, customizable professional themes.
- **Automated Scraping System**: Extracts data from Google Maps, Facebook, Instagram, and Kagi search. Features automatic database saving, priority-based data merging, media asset management, review system integration, and quality scoring.
- **AI Content Enhancement**: AI-powered content improvement for business descriptions and services.
- **Micrositio Configuration**: Redesigned with a tabbed interface for `Básico`, `Marca`, `Contacto`, `Redes`, `Galería`, `Funciones`, and `Bloqueos` settings.
- **Reviews Management System**: Dual-source (scraped and customer submitted) review system with a dedicated dashboard for analytics and management.
- **Security**: Critical user data isolation enforced with authentication and business ownership verification on all sensitive endpoints.
- **Theme System Architecture**: Separated CRM dashboard themes from microsite configuration for modularity and maintainability.
- **Business Hours Synchronization**: Dual-save system ensures consistency between CRM and public microsite displays.
- **Smart Scheduling Algorithm**: Advanced time overlap detection, real-time availability checking, and buffer time management.
- **Peruvian Market Specialization**: Complete Spanish localization, specialized business categories, Lima (Perú) default location, and Peru-inspired design.

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL database connection
- `drizzle-orm`: Database ORM
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: UI component primitives
- `react-hook-form`: Form state management
- `zod`: Runtime type validation

### Development Tools
- `vite`: Build tool
- `tsx`: TypeScript execution
- `esbuild`: Production bundling
- `tailwindcss`: CSS framework

### Optional Integrations (Planned/Future)
- Bunny CDN: Image and media storage
- Nodemailer: Email notifications
- Google Maps API: Location services
- Google OAuth authentication
- Payment processing (Stripe/PayPal)
- SMS notifications