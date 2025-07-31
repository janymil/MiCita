# 🤖 Replit AI Agent Prompt - BuscarPerú Public App Creation

Copy and paste this entire prompt to a Replit AI agent to automatically create the separated business search platform:

---

## PROJECT REQUEST

Create a standalone **BuscarPerú Public** business search and discovery platform for Peru. This is a public-facing React + Express application separated from a main business CRM system.

### TECHNICAL REQUIREMENTS

**Frontend Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS + Shadcn/ui components  
- Wouter for routing
- TanStack Query for state management
- Mobile-first responsive design

**Backend Stack:**
- Express.js + Node.js + TypeScript
- PostgreSQL database with Drizzle ORM
- RESTful API architecture
- CORS enabled for frontend integration

**Database Schema (Drizzle ORM):**
```typescript
// Key tables needed:
- businesses (id, name, slug, description, category, subcategory, district, city, rating, phone, website, email, coordinates)
- apify_businesses (scraped business data with same structure)
- business_settings (micrositio configuration)
- categories (business categories for Peru market)
```

### CORE FEATURES TO IMPLEMENT

**1. Public Landing Page (`/`)**
- Modern hero section with search functionality
- Category browsing cards (Belleza, Salud, Fitness, Gastronomía, etc.)
- Featured businesses showcase
- Mobile-optimized design with Peru-inspired gradients

**2. Advanced Search Page (`/buscar`)**
- Text search with real-time filtering
- Category and subcategory dropdowns
- City and district filtering (Lima, Arequipa, Trujillo, etc.)
- Rating filter (1-5 stars)
- Advanced filters: phone, website, email, open now
- Pagination with 12 results per page
- Map view toggle option

**3. Business Profile Pages (`/:slug`)**
- Individual business micrositio pages
- Display: name, description, services, contact info, photos
- Business hours and location
- Review display (read-only)
- Contact buttons (call, website, email)
- Mobile-responsive layout

**4. Core Components**
- `ModernSearchBar`: Advanced search with voice input
- `BusinessCard`: Professional business display cards
- `CategoryCard`: Organized category browsing
- `PublicHeader`: Clean navigation for public users
- `NotFound`: 404 page with navigation options

### API ENDPOINTS TO CREATE

```typescript
// Search and discovery
GET /api/search - Advanced business search with all filters
GET /api/categories/counts - Category statistics
GET /api/featured - Featured businesses for homepage

// Business profiles  
GET /api/micrositio/:slug - Individual business data
GET /api/business/:id - Business details

// Health check
GET /api/health - API status check
```

### DATABASE CONFIGURATION

**Connection Strategy:**
- Use environment variable `DATABASE_URL` for PostgreSQL connection
- Implement Drizzle ORM with schema-first approach
- Support for both registered businesses and scraped Apify data
- Efficient indexing for search performance

**Sample Environment Variables:**
```env
DATABASE_URL=postgresql://username:password@host:port/database
PORT=5000
NODE_ENV=development
VITE_API_URL=http://localhost:5000
```

### PERU MARKET SPECIALIZATION

**Business Categories:**
- Belleza (Beauty): Peluquerías, Salones, Barbería, Spa
- Salud (Health): Farmacias, Clínicas, Dentistas, Veterinarios  
- Fitness: Gimnasios, Yoga, Deportes
- Gastronomía: Restaurantes, Cafeterías, Delivery
- Servicios: Reparaciones, Limpieza, Técnicos
- Educación: Colegios, Academias, Institutos

**Geographic Focus:**
- Primary: Lima with 43 districts
- Secondary: Arequipa, Trujillo, Chiclayo, Cusco, Piura
- Spanish language throughout
- Peruvian address formats and phone numbers

### DESIGN REQUIREMENTS

**Visual Theme:**
- Peru-inspired color palette with warm gradients
- Modern glass-morphism effects
- Professional business directory aesthetic
- Excellent mobile responsiveness
- Fast loading times with optimized images

**User Experience:**
- Intuitive search flow
- Clear business information display
- Easy navigation between pages
- Accessible design following web standards

### PROJECT STRUCTURE

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/       # Main application pages
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and configurations
├── server/          # Express backend
│   ├── routes.ts    # API route handlers
│   ├── db.ts        # Database connection
│   └── storage.ts   # Data access layer
├── shared/          # Shared types and schemas
└── docs/           # Documentation
```

### DEPLOYMENT READINESS

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "db:push": "drizzle-kit push:pg"
  }
}
```

**Key Dependencies:**
- @tanstack/react-query, wouter, drizzle-orm
- @radix-ui/* components, tailwindcss
- lucide-react icons, react-hook-form
- express, cors, dotenv

### SUCCESS CRITERIA

✅ **Functional Requirements:**
- Search works with real-time filtering
- Business profiles load correctly
- Mobile responsive on all devices
- Database integration functional
- API endpoints return proper data

✅ **Technical Requirements:**
- TypeScript compilation without errors
- Proper error handling and loading states
- SEO-friendly routing and meta tags
- Production build successfully creates
- Environment variables properly configured

✅ **User Experience:**
- Fast page load times (< 3 seconds)
- Intuitive navigation flow
- Professional business directory appearance
- Clear calls-to-action
- Accessible design

### IMPORTANT NOTES

- This is a **PUBLIC-ONLY** application - no authentication required
- Focus on **search and discovery** functionality
- Design for **Peru market** with Spanish localization
- Optimize for **mobile users** (primary traffic source)
- Prepare for **shared database** strategy with main CRM app

---

**Create this as a complete, deployable application ready for immediate use as a business discovery platform for Peru.**