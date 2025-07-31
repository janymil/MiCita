# BuscarPerú - Public Search Platform

A public business discovery platform for Peru, allowing users to search and discover local businesses across the country.

## Features

- 🔍 Advanced business search with filters
- 📍 Location-based discovery
- 🏢 Category browsing
- ⭐ Business ratings and reviews
- 📱 Mobile-responsive design
- 🗺️ Interactive maps
- 🎯 Personalized recommendations

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (shared with business CRM)
- **Backend**: Express.js
- **Maps**: OpenStreetMap integration

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`

## Environment Variables

```env
DATABASE_URL=postgresql://username:password@host:port/database
VITE_API_URL=http://localhost:5000
```

## Project Structure

```
buscar-peru-public/
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Shared types and schemas
└── public/           # Static assets
```

## Deployment

This app can be deployed on Replit, Vercel, or any platform supporting Node.js applications.