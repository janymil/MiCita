# BuscarPerú Public - Project Documentation

## Project Overview

A standalone public business discovery platform for Peru, separated from the main MiCita business CRM application. This app focuses exclusively on helping users find and discover local businesses through advanced search and filtering capabilities.

**Purpose**: Public business search and discovery
**Target Users**: General public looking for services and businesses
**Tech Stack**: React + TypeScript + Express.js + PostgreSQL

## Key Features

- 🔍 **Advanced Business Search**: Text search with intelligent filtering
- 📍 **Location-Based Discovery**: City and district filtering 
- 🏢 **Category Browsing**: Organized by business types
- ⭐ **Business Profiles**: Read-only micrositio viewing
- 📱 **Mobile Responsive**: Optimized for all devices
- 🗺️ **Map Integration**: Visual business discovery

## Project Architecture

### Frontend Structure
```
client/
├── src/
│   ├── pages/           # Main pages (Home, Search, Business)
│   ├── components/      # Reusable UI components
│   ├── lib/            # Utilities and constants
│   └── index.css       # Global styles
```

### Backend Structure  
```
server/
├── index.ts            # Express server setup
├── routes.ts           # API route definitions
└── db.ts              # Database configuration
```

### Database Access
- **Read-only access** to shared PostgreSQL database
- No write operations (search analytics only)
- Tables used: `businesses`, `businessSettings`, `services`, `gallery`, `reviews`, `apifyBusinesses`

## Recent Changes

### July 31, 2025
✅ **Project Separation Completed**
- Extracted public search functionality from main MiCita app
- Created standalone application structure
- Implemented simplified routing (Home, Search, Business micrositios)
- Configured read-only database access
- Added comprehensive deployment documentation

### Core Components Migrated
- Landing page with hero search
- Advanced search with filters
- Category browsing interface
- Business card displays
- Public header navigation
- Modern search bar with suggestions

## User Preferences

### Communication Style
- Simple, non-technical language for user-facing content
- Professional tone without emojis
- Focus on user benefits and clear CTAs

### Design Preferences  
- Clean, modern interface
- Peru-inspired color scheme (red/orange gradients)
- Mobile-first responsive design
- Fast loading and smooth animations

## Technical Decisions

### Architecture Choices
- **Shared Database**: Uses same PostgreSQL as main app for real-time data
- **Stateless Frontend**: No user authentication or sessions
- **API-First**: Clean separation between frontend and backend
- **Read-Only**: No business data modification capabilities

### Performance Optimizations
- React Query for efficient data caching
- Debounced search inputs
- Pagination for large result sets
- Optimized database queries

## Deployment Configuration

### Required Environment Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
VITE_API_URL=http://localhost:5000
PORT=5000
```

### Recommended Deployment
- **Platform**: Replit Deployments for simplicity
- **Domain**: `buscar-peru.replit.app` 
- **CDN**: Automatic via Replit
- **Database**: Shared with main MiCita app

## API Endpoints

### Public Search API
- `GET /api/search` - Advanced business search with filters
- `GET /api/categories/counts` - Category statistics
- `GET /api/subcategories/:category` - Subcategory data
- `GET /api/featured` - Featured/premium businesses
- `GET /api/micrositio/:slug` - Business profile data

### Analytics (Write-Only)
- `POST /api/search-analytics` - Track search behavior

## Integration Points

### With Main MiCita App
- Links to business registration: `https://micita.replit.app/registro`
- Cross-references for business owners
- Shared branding and design consistency

### External Services
- OpenStreetMap for mapping functionality
- Google Places API compatibility (optional)
- Analytics tracking (configurable)

## Future Enhancements

### Phase 1 (Current)
- [x] Basic search functionality
- [x] Category browsing
- [x] Business profiles
- [x] Mobile responsiveness

### Phase 2 (Planned)
- [ ] Advanced map integration
- [ ] User reviews and ratings
- [ ] Social sharing features
- [ ] SEO optimization
- [ ] Progressive Web App features

### Phase 3 (Future)
- [ ] Personalized recommendations
- [ ] Location-based push notifications
- [ ] Multi-language support (Quechua/Spanish)
- [ ] Voice search capabilities

## Success Metrics

### User Engagement
- Search completion rate
- Category click-through rate
- Business profile views
- Mobile usage percentage

### Performance
- Page load times < 2 seconds
- Search response times < 500ms
- 99.9% uptime target
- Mobile Core Web Vitals compliance

## Development Guidelines

### Code Style
- TypeScript for type safety
- Tailwind CSS for styling
- ESLint/Prettier for formatting
- Component-based architecture

### Testing Strategy
- Unit tests for utilities
- Integration tests for API endpoints
- Manual testing for UI components
- Performance testing for search

## Support & Maintenance

### Monitoring
- Database performance tracking
- Search query analytics
- Error logging and alerts
- User behavior insights

### Updates
- Weekly dependency updates
- Monthly performance reviews
- Quarterly feature assessments
- Annual architecture review

---

**Status**: Ready for deployment and AI agent integration
**Last Updated**: July 31, 2025
**Version**: 1.0.0