# BuscarPerú Public - Business Discovery Platform

A standalone public business search and discovery platform for Peru, separated from the main MiCita business CRM application.

## 🚀 Features

- **Advanced Business Search**: Text search with intelligent filtering
- **Location-Based Discovery**: City and district filtering throughout Peru
- **Category Browsing**: Organized by business types (Belleza, Salud, Fitness, etc.)
- **Business Profiles**: Read-only micrositio viewing with contact information
- **Mobile Responsive**: Optimized for all devices
- **Real-time Data**: Synced with comprehensive business database

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Search**: Advanced filtering with real-time results
- **Deployment**: Ready for Replit, Vercel, or Railway

## 📦 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/buscar-peru-public.git
cd buscar-peru-public

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://username:password@host:port/database
VITE_API_URL=http://localhost:5000
PORT=5000
```

## 🎯 Usage

### Public Search
- Visit `/` for the main landing page with search functionality
- Use `/buscar` for advanced search with filters
- Access business profiles at `/:slug` for individual micrositios

### API Endpoints
- `GET /api/search` - Advanced business search
- `GET /api/categories/counts` - Category statistics  
- `GET /api/micrositio/:slug` - Business profile data

## 🌟 Key Components

- **ModernSearchBar**: Advanced search with voice input and suggestions
- **BusinessCard**: Professional business display cards
- **CategoryCard**: Organized category browsing
- **PublicHeader**: Clean navigation for public users

## 📱 Mobile First

Fully responsive design optimized for mobile users with:
- Touch-friendly interfaces
- Fast loading times
- Optimized search experience
- Mobile-specific layouts

## 🔧 Development

### Project Structure
```
├── client/           # React frontend
├── server/          # Express backend  
├── shared/          # Shared types and schemas
└── docs/           # Documentation
```

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Push database schema changes
```

## 🚀 Deployment

### Replit (Recommended)
1. Import this repository to Replit
2. Set environment variables in Secrets
3. Run `npm install` and `npm run dev`
4. Deploy via Replit Deployments

### Vercel
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically on push

### Railway/Render
1. Connect repository
2. Add PostgreSQL addon
3. Set environment variables
4. Deploy

## 🔗 Related Projects

- **MiCita**: Main business CRM and appointment management system
- **Business Registration**: Link to business owner registration

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For questions about deployment or customization, check the [Deployment Guide](DEPLOYMENT-GUIDE.md) or create an issue.

---

**Built for Peru's business community** 🇵🇪