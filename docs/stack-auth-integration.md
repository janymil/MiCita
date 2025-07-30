# Stack Auth Integration Guide

## Overview

This project uses Stack Auth (managed by Neon) for authentication. The integration includes:

1. **Client-side authentication** with React
2. **Server-side token verification** with Express
3. **Database synchronization** between Stack Auth and local PostgreSQL

## Configuration

### Environment Variables

The following environment variables are required:

```env
# Client-side (Vite)
VITE_STACK_PROJECT_ID='your-project-id'
VITE_STACK_PUBLISHABLE_CLIENT_KEY='your-publishable-key'

# Server-side
STACK_SECRET_SERVER_KEY='your-secret-key'
```

## Implementation Details

### 1. Client Configuration (`stack/client.ts`)

```typescript
export const stackClientApp = new StackClientApp({
  projectId: import.meta.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  tokenStore: "cookie",
  // ... rest of config
});
```

### 2. Server Configuration (`stack/server.ts`)

```typescript
export const stackServerApp = new StackServerApp({
  tokenStore: "memory",
  projectId: process.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY,
});
```

### 3. Authentication Middleware (`server/auth-middleware.ts`)

The middleware verifies Stack Auth tokens and attaches user info to requests:

```typescript
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.substring(7); // Remove 'Bearer '
  const user = await stackServerApp.verifyToken(token);
  req.user = user;
  next();
}
```

### 4. Database Synchronization (`server/auth-sync.ts`)

Stack Auth users are synchronized with the local database:

- When a Stack Auth user logs in, their data is synced to the local `users` table
- The `stack_auth_id` field links Stack Auth users to local database records

### 5. API Request Authentication (`client/src/lib/queryClient.ts`)

All API requests automatically include the authentication token:

```typescript
const token = await stackClientApp.getAccessToken();
headers["Authorization"] = `Bearer ${token}`;
```

## Usage

### Protected Routes

To protect server routes, use the auth middleware:

```typescript
import { requireAuth } from './auth-middleware.js';

app.get('/api/protected', requireAuth, (req, res) => {
  // req.user contains the authenticated user
});
```

### Client-side Authentication

Use the `useAuth` hook in React components:

```typescript
const { user, isAuthenticated, signInWithCredential, logout } = useAuth();
```

## Migration Steps

1. Run the database migration to add `stack_auth_id` column:
   ```bash
   npm run db:push
   ```

2. Update existing users to link with Stack Auth (optional):
   - Manually update `stack_auth_id` for existing users
   - Or let users re-authenticate to auto-sync

## Troubleshooting

### Common Issues

1. **401 Unauthorized errors**
   - Check that environment variables are set correctly
   - Verify that the token is being sent in requests
   - Ensure Stack Auth project is active

2. **User not syncing with database**
   - Check database connection
   - Verify the migration has been run
   - Check console logs for sync errors

3. **CORS issues**
   - Stack Auth handles CORS automatically
   - Ensure your app domain is added in Stack Auth dashboard

## Security Notes

- Never expose `STACK_SECRET_SERVER_KEY` on the client side
- Always use HTTPS in production
- Token expiration is handled automatically by Stack Auth
- Use the auth middleware on all protected endpoints
