import type { Response } from "express";
import type { AuthenticatedRequest } from "./auth-middleware.js";
import { findUserById, toPublicUser } from "./auth/account-service.js";
import { storage } from "./storage.js";
import type { User } from "../shared/schema.js";

/** Resolve the authenticated request's database user record. */
export async function getAuthenticatedUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<User | null> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return null;
    }
    const user = req.dbUser ?? (await findUserById(req.user.id));
    if (!user) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return null;
    }
    req.dbUser = user;
    return user;
  } catch (error: any) {
    console.error("Error getting authenticated user:", error);
    res.status(500).json({ message: "Error obteniendo usuario autenticado" });
    return null;
  }
}

export async function verifyBusinessOwnership(
  req: AuthenticatedRequest,
  res: Response,
  businessId: number,
): Promise<User | null> {
  try {
    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return null;

    const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
    if (!userBusinesses.some((b) => b.id === businessId)) {
      res.status(403).json({ message: "No tienes acceso a este negocio" });
      return null;
    }
    return dbUser;
  } catch (error: any) {
    console.error("Error verifying business ownership:", error);
    res.status(500).json({ message: "Error verificando permisos" });
    return null;
  }
}

export async function verifyServiceOwnership(
  req: AuthenticatedRequest,
  res: Response,
  serviceId: number,
): Promise<User | null> {
  try {
    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return null;

    const service = await storage.getService(serviceId);
    if (!service) {
      res.status(404).json({ message: "Servicio no encontrado" });
      return null;
    }

    const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
    if (!userBusinesses.some((b) => b.id === service.businessId)) {
      res.status(403).json({ message: "No tienes acceso a este servicio" });
      return null;
    }
    return dbUser;
  } catch (error: any) {
    console.error("Error verifying service ownership:", error);
    res.status(500).json({ message: "Error verificando permisos" });
    return null;
  }
}

export async function verifyClientOwnership(
  req: AuthenticatedRequest,
  res: Response,
  clientId: number,
): Promise<User | null> {
  try {
    const dbUser = await getAuthenticatedUser(req, res);
    if (!dbUser) return null;

    const client = await storage.getClient(clientId);
    if (!client) {
      res.status(404).json({ message: "Cliente no encontrado" });
      return null;
    }

    const userBusinesses = await storage.getBusinessesByUserId(dbUser.id);
    if (!userBusinesses.some((b) => b.id === client.businessId)) {
      res.status(403).json({ message: "No tienes acceso a este cliente" });
      return null;
    }
    return dbUser;
  } catch (error: any) {
    console.error("Error verifying client ownership:", error);
    res.status(500).json({ message: "Error verificando permisos" });
    return null;
  }
}

export { toPublicUser };
