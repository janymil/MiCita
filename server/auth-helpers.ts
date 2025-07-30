import { Response } from 'express';
import { AuthenticatedRequest } from './auth-middleware.js';
import { storage } from './storage.js';

/**
 * Helper function to verify that the authenticated user owns the specified business
 * @param req - Authenticated request object
 * @param res - Response object
 * @param businessId - Business ID to verify ownership for
 * @returns The synced database user if authorized, null if not authorized (response already sent)
 */
export async function verifyBusinessOwnership(
    req: AuthenticatedRequest,
    res: Response,
    businessId: number
) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return null;
        }

        // Get Stack Auth user and sync to database
        const { syncUserWithDatabase } = await import('./auth-sync.js');
        const dbUser = await syncUserWithDatabase(req.user.id);

        // Check if user owns this business
        const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
        const ownsThisBusiness = userBusinesses.some(b => b.id === businessId);

        if (!ownsThisBusiness) {
            res.status(403).json({ message: "No tienes acceso a este negocio" });
            return null;
        }

        return dbUser;
    } catch (error) {
        console.error('Error verifying business ownership:', error);
        res.status(500).json({ message: "Error verificando permisos" });
        return null;
    }
}

/**
 * Helper function to verify that the authenticated user owns the business that contains the specified service
 * @param req - Authenticated request object
 * @param res - Response object
 * @param serviceId - Service ID to verify ownership for
 * @returns The synced database user if authorized, null if not authorized (response already sent)
 */
export async function verifyServiceOwnership(
    req: AuthenticatedRequest,
    res: Response,
    serviceId: number
) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return null;
        }

        // Get Stack Auth user and sync to database
        const { syncUserWithDatabase } = await import('./auth-sync.js');
        const dbUser = await syncUserWithDatabase(req.user.id);

        // Get the service to find its business
        const service = await storage.getService(serviceId);
        if (!service) {
            res.status(404).json({ message: "Servicio no encontrado" });
            return null;
        }

        // Check if user owns the business that contains this service
        const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
        const ownsServiceBusiness = userBusinesses.some(b => b.id === service.businessId);

        if (!ownsServiceBusiness) {
            res.status(403).json({ message: "No tienes acceso a este servicio" });
            return null;
        }

        return dbUser;
    } catch (error) {
        console.error('Error verifying service ownership:', error);
        res.status(500).json({ message: "Error verificando permisos" });
        return null;
    }
}

/**
 * Helper function to verify that the authenticated user owns the business that contains the specified client
 * @param req - Authenticated request object
 * @param res - Response object
 * @param clientId - Client ID to verify ownership for
 * @returns The synced database user if authorized, null if not authorized (response already sent)
 */
export async function verifyClientOwnership(
    req: AuthenticatedRequest,
    res: Response,
    clientId: number
) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return null;
        }

        // Get Stack Auth user and sync to database
        const { syncUserWithDatabase } = await import('./auth-sync.js');
        const dbUser = await syncUserWithDatabase(req.user.id);

        // Get the client to find its business
        const client = await storage.getClient(clientId);
        if (!client) {
            res.status(404).json({ message: "Cliente no encontrado" });
            return null;
        }

        // Check if user owns the business that contains this client
        const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
        const ownsClientBusiness = userBusinesses.some(b => b.id === client.businessId);

        if (!ownsClientBusiness) {
            res.status(403).json({ message: "No tienes acceso a este cliente" });
            return null;
        }

        return dbUser;
    } catch (error) {
        console.error('Error verifying client ownership:', error);
        res.status(500).json({ message: "Error verificando permisos" });
        return null;
    }
}

/**
 * Helper function to get the authenticated user's synced database record
 * @param req - Authenticated request object
 * @param res - Response object
 * @returns The synced database user if successful, null if error (response already sent)
 */
export async function getAuthenticatedUser(req: AuthenticatedRequest, res: Response) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Usuario no autenticado" });
            return null;
        }

        // Get Stack Auth user and sync to database
        const { syncUserWithDatabase } = await import('./auth-sync.js');
        const dbUser = await syncUserWithDatabase(req.user.id);

        return dbUser;
    } catch (error) {
        console.error('Error getting authenticated user:', error);
        res.status(500).json({ message: "Error obteniendo usuario autenticado" });
        return null;
    }
}
