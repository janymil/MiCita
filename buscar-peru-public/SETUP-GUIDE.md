# 🛠️ BuscarPerú Public - Setup Guide

## Quick Setup Commands

Once you have the repository cloned, run these commands:

```bash
# Navigate to project directory
cd buscar-peru-public

# Install all dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables (required)
nano .env  # or use your preferred editor

# Push database schema (if using new database)
npm run db:push

# Start development server
npm run dev
```

## Environment Setup

Edit `.env` file with your actual values:

```env
# Replace with your actual database URL
DATABASE_URL=postgresql://username:password@host:port/database

# Keep these for local development
PORT=5000
NODE_ENV=development
VITE_API_URL=http://localhost:5000
```

## Database Options

### Option 1: Shared Database (Recommended)
Use the same database as your main MiCita app for real-time sync:
```env
DATABASE_URL=your_existing_micita_database_url
```

### Option 2: New Database
Create a new PostgreSQL database and run migrations:
```bash
npm run db:push
```

## Verification

After setup, verify everything works:

1. **Development server**: Visit http://localhost:5000
2. **Search functionality**: Try searching for businesses
3. **Database connection**: Check console for connection success

## Deployment

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for production deployment instructions.

## Troubleshooting

### Common Issues

**Database connection fails:**
- Check DATABASE_URL format
- Verify database server is running
- Check firewall/network access

**Frontend not loading:**
- Verify VITE_API_URL matches your server port
- Check if port 5000 is available
- Look for console errors in browser

**Search not working:**
- Ensure database has business data
- Check API endpoints are responding
- Verify CORS settings if needed

## Support

Check the main [README.md](README.md) for more details or create an issue if you encounter problems.