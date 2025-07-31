# 🚀 BuscarPerú Public - Deployment Guide

This document explains how to deploy the separated public search application as a new repository and integrate it with an AI agent.

## 📋 Overview

The `buscar-peru-public` folder contains a complete, standalone public search application extracted from the main MiCita business CRM. This app focuses solely on:

- Public business search and discovery
- Category browsing 
- Business micrositio viewing
- No authentication required
- Read-only database access

## 🎯 Step 1: Create New Repository

### Option A: Manual Repository Creation

1. **Create a new repository** on GitHub/GitLab:
   ```
   Repository name: buscar-peru-public
   Description: Public business search platform for Peru
   Public/Private: Your choice
   ```

2. **Copy the files** from `buscar-peru-public/` folder to the new repository:
   ```bash
   # Copy all files from buscar-peru-public folder
   cp -r buscar-peru-public/* /path/to/new-repo/
   ```

3. **Initialize and push**:
   ```bash
   cd /path/to/new-repo
   git init
   git add .
   git commit -m "Initial commit: Public search platform"
   git remote add origin https://github.com/yourusername/buscar-peru-public.git
   git push -u origin main
   ```

### Option B: Using Replit's GitHub Integration

1. Create new Replit project
2. Import the `buscar-peru-public` folder
3. Connect to GitHub directly from Replit
4. Push to new repository

## 🎯 Step 2: AI Agent Integration 

### With Replit Agent

1. **Create new Replit project** from the repository
2. **Set environment variables**:
   ```env
   DATABASE_URL=your_shared_database_url
   VITE_API_URL=http://localhost:5000
   PORT=5000
   ```
3. **The AI agent will automatically**:
   - Detect the project structure
   - Install dependencies via `npm install`
   - Start development server with `npm run dev`

### With Other AI Agents (v0.dev, Bolt, etc.)

1. **Upload project files** to the AI platform
2. **Provide context**:
   ```
   "This is a public business search platform for Peru. 
   It includes search functionality, category browsing, and business pages.
   Uses React + TypeScript + Express + PostgreSQL."
   ```
3. **Configure environment** as needed

## 🎯 Step 3: Database Configuration

### Option A: Shared Database (Recommended)

Use the same PostgreSQL database as the main MiCita app:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

**Benefits:**
- Real-time data sync
- No data duplication
- Single source of truth
- Cost effective

### Option B: Separate Database

Create a new database and sync data:

1. **Create new PostgreSQL database**
2. **Run migrations**: `npm run db:push`
3. **Set up data sync** from main app (requires custom solution)

## 🎯 Step 4: Domain & Deployment

### Recommended URLs

- **Main CRM**: `https://micita.replit.app` (business dashboard)
- **Public Search**: `https://buscar-peru.replit.app` (public search)

### Deployment Platforms

1. **Replit Deployments** (Recommended)
   - Automatic deployments
   - Built-in database
   - Custom domains available

2. **Vercel**
   - Frontend: Auto-deploy from GitHub
   - Backend: Requires serverless functions setup

3. **Railway/Render**
   - Full-stack deployment
   - PostgreSQL add-on available

## 🎯 Step 5: Features Separation

### ✅ Included in Public App

- Landing page with search
- Advanced search with filters
- Category browsing
- Business micrositio viewing
- Map integration
- Mobile responsive design

### ❌ Removed from Public App

- User authentication
- Business dashboard
- Appointment management
- Client management
- Financial tracking
- Admin features

## 🎯 Step 6: Customization Guide

### Branding Changes

1. **Update app name** in:
   - `package.json`
   - `README.md`
   - Footer components
   - Page titles

2. **Modify colors/styling** in:
   - `client/src/index.css`
   - Tailwind config
   - Component styles

### API Endpoints

The app uses these main endpoints:
- `GET /api/search` - Business search
- `GET /api/categories/counts` - Category data
- `GET /api/featured` - Featured businesses
- `GET /api/micrositio/:slug` - Business pages

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
PORT=5000

# Optional
VITE_GOOGLE_ANALYTICS_ID=GA-XXXX
VITE_API_URL=https://your-api-domain.com
```

## 🎯 Step 7: Testing & Validation

### Local Development

```bash
cd buscar-peru-public
npm install
npm run dev
```

### Validation Checklist

- [ ] Search functionality works
- [ ] Categories display correctly
- [ ] Business pages load
- [ ] Mobile responsive
- [ ] Database connection successful
- [ ] No authentication required

## 🎯 Step 8: Future Integration

### Cross-App Links

From public app to business CRM:
```html
<a href="https://micita.replit.app/registro">
  Registrar mi negocio
</a>
```

From business CRM to public search:
```html
<a href="https://buscar-peru.replit.app">
  Ver mi perfil público
</a>
```

### Shared Components

Consider creating a shared component library for:
- Business cards
- Category displays
- Common UI elements

## 📞 Support

For questions about deployment or customization:

1. Check the README.md in the repository
2. Review the code comments
3. Test locally first before deploying
4. Use AI agent assistance for modifications

## 🎉 Success Metrics

After deployment, you should have:

- ✅ Standalone public search platform
- ✅ Fast business discovery
- ✅ Mobile-friendly interface
- ✅ No business management complexity
- ✅ Focused user experience
- ✅ Easy maintenance and updates

---

**Next Steps**: Copy the `buscar-peru-public` folder to a new repository and follow this guide for deployment!