import { NextFunction, Request, Response } from 'express';

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
    // Get access token from x-stack-access-token header
    const accessToken = req.headers['x-stack-access-token'] as string;

    if (!accessToken) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    // Verify token using Stack's REST API
    const response = await fetch('https://api.stack-auth.com/api/v1/users/me', {
      headers: {
        'x-stack-access-type': 'server',
        'x-stack-project-id': process.env.VITE_STACK_PROJECT_ID!,
        'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
        'x-stack-access-token': accessToken,
      },
    });

    if (response.status !== 200) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await response.json();

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.primary_email || user.email || '',
      primaryEmail: user.primary_email || undefined,
      displayName: user.display_name
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const accessToken = req.headers['x-stack-access-token'] as string;

    if (accessToken) {
      // Try to verify token using Stack's REST API
      const response = await fetch('https://api.stack-auth.com/api/v1/users/me', {
        headers: {
          'x-stack-access-type': 'server',
          'x-stack-project-id': process.env.VITE_STACK_PROJECT_ID!,
          'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
          'x-stack-access-token': accessToken,
        },
      });

      if (response.status === 200) {
        const user = await response.json();
        req.user = {
          id: user.id,
          email: user.primary_email || user.email || '',
          primaryEmail: user.primary_email || undefined,
          displayName: user.display_name
        };
      }
    }
  } catch (error) {
    // Silently continue without user
  }

  next();
}
