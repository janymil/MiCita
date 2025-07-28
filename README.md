# Business Search Platform - Comprehensive Peruvian Business Discovery & Management System

## 🚀 Overview

**Business Search Platform** (formerly BuscarPeru/MiCita) is a comprehensive full-stack business discovery and appointment management platform specifically designed for the Peruvian market. The platform serves dual purposes: a public business discovery engine for customers and a complete business management dashboard for service providers.

### Key Value Propositions
- **For Customers**: Discover and book appointments with local businesses across Peru
- **For Businesses**: Complete appointment management, client tracking, and revenue analytics
- **For the Platform**: Comprehensive business directory with advanced search and filtering

## 🏗️ System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Peruvian-themed design system
- **State Management**: 
  - React Context API for authentication state
  - TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React for consistent iconography

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES Modules
- **API Design**: RESTful API with modular route handlers
- **Development**: Custom Vite integration with HMR for full-stack development

### Database & Data Layer
- **Database**: PostgreSQL (Neon Database for production)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Validation**: Zod schemas for runtime type safety
- **Connection**: Native postgres client with connection pooling

## 📊 Database Schema

### Core Entities
- **Users**: Authentication and account management
- **Businesses**: Business profiles with location and metadata
- **Services**: Service catalog with pricing and duration
- **Clients**: Customer profiles and contact information
- **Appointments**: Booking system with status tracking
- **Business Settings**: Customization and notification preferences
- **Gallery**: Image management for business portfolios
- **Reviews**: Customer feedback and rating system

### External Data Sources
- **Apify Businesses**: Scraped business data from web sources
- **OpenStreet Businesses**: Geographic business data integration
- **Public Businesses**: External directory listings

## 🎯 Core Features

### Public Business Discovery
- **Advanced Search Engine**: Text, category, and location-based search
- **Geographic Integration**: Google Maps integration with district-level filtering
- **Dynamic Filtering**: Real-time filters by rating, price, hours, amenities
- **Multiple View Modes**: Grid, list, and map views
- **Business Profiles**: Detailed business pages with photos, reviews, and contact info
- **Location Services**: GPS-based "near me" search functionality

### Business Management Dashboard
- **Analytics Dashboard**: Revenue tracking, appointment analytics, client insights
- **Appointment Management**: Full scheduling system with calendar integration
- **Client Database**: Customer profiles with appointment history
- **Service Catalog**: Pricing, duration, and service description management
- **Financial Tracking**: Revenue reports and business performance metrics
- **Settings Management**: Business profile, hours, and notification preferences

### Appointment System
- **Public Booking**: Customer-facing appointment scheduling
- **Status Management**: Pending, confirmed, completed, cancelled, rescheduled, no-show
- **Email Notifications**: Automated confirmation and reminder emails
- **Calendar Integration**: Appointment scheduling with availability checking
- **Client Notes**: Customer preferences and special requirements

### Business Microsites
- **Custom URLs**: Individual business pages at `/{customUrl}`
- **Professional Themes**: Customizable business presentation
- **Photo Galleries**: Image management with CDN integration
- **Contact Information**: Complete business details and contact options
- **Online Booking**: Direct appointment scheduling for customers

## 🛠️ Technology Stack

### Dependencies Analysis

#### Core Runtime Dependencies
```json
{
  "express": "^4.21.2",           // Web server framework
  "react": "^18.3.1",             // Frontend framework
  "react-dom": "^18.3.1",         // React DOM bindings
  "typescript": "5.6.3",          // Type safety and development
  "drizzle-orm": "^0.39.1",       // Database ORM
  "postgres": "^3.4.7",           // PostgreSQL client
  "zod": "^3.24.2"                // Runtime type validation
}
```

#### UI & Component Libraries
```json
{
  "@radix-ui/*": "Latest",         // Headless UI primitives (20+ components)
  "tailwindcss": "^3.4.17",      // Utility-first CSS framework
  "lucide-react": "^0.453.0",    // Icon library
  "framer-motion": "^11.18.2",   // Animation library
  "class-variance-authority": "^0.7.1", // Component variant management
  "tailwind-merge": "^2.6.0"     // Tailwind class merging utility
}
```

#### Data Fetching & State Management
```json
{
  "@tanstack/react-query": "^5.60.5", // Server state management
  "react-hook-form": "^7.55.0",       // Form handling
  "@hookform/resolvers": "^3.10.0",   // Form validation resolvers
  "wouter": "^3.3.5"                  // Lightweight routing
}
```

#### External Integrations
```json
{
  "@googlemaps/js-api-loader": "^1.16.10", // Google Maps integration
  "apify-client": "^2.12.6",              // Web scraping service
  "@sendgrid/mail": "^8.1.5",             // Email service
  "nodemailer": "^7.0.5",                 // Alternative email service
  "multer": "^2.0.1"                      // File upload handling
}
```

#### Development Tools
```json
{
  "vite": "^5.4.19",              // Build tool and dev server
  "tsx": "^4.19.1",               // TypeScript execution
  "drizzle-kit": "^0.30.4",       // Database migration tool
  "esbuild": "^0.25.0",           // Fast bundler for production
  "@vitejs/plugin-react": "^4.3.2" // React plugin for Vite
}
```

## 🗂️ Project Structure

```
BusinessSearchPlatform/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Route components
│   │   │   ├── auth/               # Authentication pages
│   │   │   ├── dashboard/          # Business dashboard pages
│   │   │   └── admin/              # Admin panel pages
│   │   ├── contexts/               # React context providers
│   │   ├── hooks/                  # Custom React hooks
│   │   └── lib/                    # Utility functions and constants
│   └── index.html                  # HTML entry point
├── server/                         # Backend Express.js application
│   ├── routes.ts                   # Main API routes (2,470 lines)
│   ├── db.ts                       # Database connection and setup
│   ├── email-service.ts            # Email notification system
│   ├── admin-*.ts                  # Admin panel API routes
│   └── *.ts                        # Various service modules
├── shared/                         # Shared TypeScript schemas
│   └── schema.ts                   # Database schema definitions (620 lines)
├── migrations/                     # Database migration files
├── scrapers/                       # Web scraping scripts
│   ├── master-scraper.js           # Orchestrates all scrapers
│   ├── belleza-scraper.js          # Beauty industry scraper
│   ├── gastronomia-scraper.js      # Restaurant scraper
│   └── *.js                        # Specialized category scrapers
├── docs/                           # Documentation and guides
└── *.js                            # Data import and analysis scripts
```

## 🌎 Peruvian Market Specialization

### Geographic Coverage
- **49 Lima Districts**: Complete coverage of metropolitan Lima
- **Major Cities**: Arequipa, Trujillo, Chiclayo, Piura, Cusco, and more
- **District-Level Filtering**: Precise location-based search
- **Local Business Focus**: Emphasis on small to medium enterprises

### Business Categories
- **Gastronomía**: Restaurants, cafés, bars, food services
- **Belleza**: Hair salons, spas, beauty centers, nail salons
- **Salud**: Clinics, dentists, pharmacies, medical services
- **Servicios**: Professional services, repairs, consultancy
- **Fitness**: Gyms, yoga studios, sports centers
- **Automotriz**: Car services, mechanics, auto parts

### Cultural Adaptations
- **Spanish Language**: Complete Spanish localization
- **Local Business Hours**: Adapted to Peruvian business practices
- **Payment Methods**: Integration with local payment systems
- **Contact Preferences**: Phone-first communication culture

## 📡 Data Acquisition Strategy

### Web Scraping Infrastructure
- **Apify Integration**: Professional web scraping service
- **Multi-Source Strategy**: Google Maps, business directories, social media
- **Enhanced Data Collection**: 
  - Email addresses (40% coverage rate)
  - Social media profiles (Facebook, Instagram)
  - Business photos (10 per business)
  - Operating hours and busy times
  - Accessibility information

### Data Quality & Deduplication
- **Automatic Deduplication**: Via `place_id` unique constraints
- **Data Enrichment**: Continuous updates from multiple sources
- **Quality Assurance**: Automated validation and manual verification
- **Performance Optimization**: Spatial clustering and indexed searches

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment variables configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://username:password@host:port/database
APIFY_API_TOKEN=your_apify_token
EMAIL_USER=your_smtp_username
EMAIL_PASS=your_smtp_password
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/janymil/BusinessSearchPlatform.git
cd BusinessSearchPlatform

# Install dependencies
npm install

# Set up the database
npm run db:push

# Start development server
npm run dev
```

### Production Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📈 Business Model & Monetization

### Revenue Streams
1. **Premium Business Listings**: Enhanced visibility and features
2. **Appointment Booking Fees**: Transaction-based revenue
3. **Advertising & Sponsored Listings**: Featured placement for businesses
4. **Business Analytics**: Advanced reporting and insights
5. **Email Marketing Services**: Customer outreach campaigns

### Target Market
- **Primary**: Small to medium businesses in service industries
- **Secondary**: Customers seeking local services and appointments
- **Geographic**: Peru (starting with Lima, expanding nationally)

## 🔧 API Endpoints

### Public API
- `GET /api/search` - Business search with filters
- `GET /api/business/:id` - Business profile details
- `GET /api/categories` - Business categories with counts
- `POST /api/appointments` - Create appointment booking

### Business Dashboard API
- `GET /api/dashboard/businesses` - Business management
- `GET /api/dashboard/appointments` - Appointment management
- `GET /api/dashboard/analytics` - Business analytics
- `POST /api/dashboard/services` - Service management

### Admin API
- `GET /api/admin/businesses` - Business administration
- `POST /api/admin/scraping` - Data scraping controls
- `GET /api/admin/analytics` - Platform analytics

## 🛡️ Security & Performance

### Security Features
- **Authentication**: Session-based authentication with secure cookies
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **File Upload Security**: Multer with file type validation
- **Environment Security**: Sensitive data in environment variables

### Performance Optimizations
- **Database Indexing**: Optimized queries with proper indexing
- **Caching Strategy**: Query result caching with TanStack Query
- **Image Optimization**: CDN integration for media assets
- **Spatial Queries**: Geographic search optimization
- **Pagination**: Efficient large dataset handling

## 📱 Mobile Responsiveness

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Touch-Optimized**: Mobile-friendly interface components
- **Progressive Web App**: PWA capabilities for app-like experience
- **Location Services**: GPS integration for mobile users

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request with detailed description

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Component Architecture**: Modular, reusable components
- **Database Migrations**: Version-controlled schema changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

- **Repository**: https://github.com/janymil/BusinessSearchPlatform
- **Issues**: GitHub Issues tracker
- **Documentation**: See `/docs` directory for detailed guides

---

**Business Search Platform** - Connecting businesses and customers across Peru through technology and innovation.
