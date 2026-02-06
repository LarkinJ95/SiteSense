import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthUser = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  role?: string;
  roles?: string[];
  app_metadata?: {
    role?: string;
    roles?: string[];
  };
  user_metadata?: {
    role?: string;
    roles?: string[];
  };
  [key: string]: unknown;
};

const jwksUrl = process.env.NEON_JWKS_URL;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const jwtIssuer = process.env.NEON_JWT_ISSUER?.trim() || undefined;
const jwtAudience = process.env.NEON_JWT_AUDIENCE?.trim() || undefined;
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function getUserDisplayName(user?: AuthUser) {
  if (!user) return undefined;
  if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
  const first = typeof user.given_name === "string" ? user.given_name.trim() : "";
  const last = typeof user.family_name === "string" ? user.family_name.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (typeof user.email === "string") return user.email;
  return undefined;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!jwks) return next();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();

  const token = header.slice("Bearer ".length).trim();
  if (!token) return next();

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: jwtIssuer,
      audience: jwtAudience,
    });
    req.user = payload as AuthUser;
    return next();
  } catch (error) {
    req.user = undefined;
    return next();
  }
}

export function isAuthConfigured() {
  return Boolean(jwks);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!jwks) {
    return res.status(500).json({ message: "Auth is not configured" });
  }
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  return next();
}

function extractRoles(user?: AuthUser) {
  if (!user) return [];
  const roles: string[] = [];
  if (typeof user.role === "string") roles.push(user.role);
  if (Array.isArray(user.roles)) roles.push(...user.roles.filter((role) => typeof role === "string"));
  if (typeof user.app_metadata?.role === "string") roles.push(user.app_metadata.role);
  if (Array.isArray(user.app_metadata?.roles)) {
    roles.push(...user.app_metadata.roles.filter((role) => typeof role === "string"));
  }
  if (typeof user.user_metadata?.role === "string") roles.push(user.user_metadata.role);
  if (Array.isArray(user.user_metadata?.roles)) {
    roles.push(...user.user_metadata.roles.filter((role) => typeof role === "string"));
  }
  return roles.map((role) => role.toLowerCase());
}

export function isAdminUser(user?: AuthUser) {
  if (!user) return false;
  if (extractRoles(user).includes("admin")) return true;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return Boolean(email && adminEmails.includes(email));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!jwks) {
    return res.status(500).json({ message: "Auth is not configured" });
  }
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}
