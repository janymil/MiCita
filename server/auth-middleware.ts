import { Request, Response, NextFunction } from 'express';
import { stackServerApp } from '../stack/server.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    primaryEmail?: string;
    displayName?: string | null;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token with Stack Auth
    const user = await stackServerApp.verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.primaryEmail || user.email || '',
      primaryEmail: user.primaryEmail,
      displayName: user.displayName
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await stackServerApp.verifyToken(token);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.primaryEmail || user.email || '',
          primaryEmail: user.primaryEmail,
          displayName: user.displayName
        };
      }
    }
  } catch (error) {
    // Silently continue without user
    console.error('Optional auth error:', error);
  }
  
  next();
}
