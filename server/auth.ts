import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthUser = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
};

const jwksUrl = process.env.NEON_JWKS_URL;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

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
    const { payload } = await jwtVerify(token, jwks);
    req.user = payload as AuthUser;
    return next();
  } catch (error) {
    req.user = undefined;
    return next();
  }
}
