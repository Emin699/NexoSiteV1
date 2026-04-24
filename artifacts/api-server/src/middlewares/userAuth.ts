import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "../lib/session-token.js";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      isAdmin?: boolean;
      isBanned?: boolean;
    }
  }
}

function extractBearer(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (!auth || typeof auth !== "string") return null;
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

export async function userAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }

  const verified = verifyToken(token);
  if (!verified) {
    next();
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, isAdmin: usersTable.isAdmin, isBanned: usersTable.isBanned })
    .from(usersTable)
    .where(eq(usersTable.id, verified.userId));

  if (user) {
    req.userId = user.id;
    req.isAdmin = user.isAdmin === 1;
    req.isBanned = user.isBanned === 1;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.isBanned) {
    res.status(403).json({ error: "Account banned" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
