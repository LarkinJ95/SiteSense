import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  insertOrganizationMemberSchema,
  insertOrganizationSchema,
  insertUserProfileSchema,
  userProfiles,
  surveys as surveysTable,
  airSamples as airSamplesTable,
  observations as observationsTable,
} from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  NEON_AUTH_URL?: string;
  NEON_JWKS_URL?: string;
  NEON_JWT_ISSUER?: string;
  NEON_JWT_AUDIENCE?: string;
  ADMIN_EMAILS?: string;
};

type AuthUser = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  role?: string;
  roles?: string[];
  app_metadata?: { role?: string; roles?: string[] };
  user_metadata?: { role?: string; roles?: string[] };
  [key: string]: unknown;
};

const app = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

const extractRoles = (user?: AuthUser) => {
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
};

const getDisplayName = (user?: AuthUser) => {
  if (!user) return undefined;
  if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
  const first = typeof user.given_name === "string" ? user.given_name.trim() : "";
  const last = typeof user.family_name === "string" ? user.family_name.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (typeof user.email === "string") return user.email;
  return undefined;
};

const isAdminUser = (user: AuthUser | undefined, adminEmails: string[]) => {
  if (!user) return false;
  if (extractRoles(user).includes("admin")) return true;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return Boolean(email && adminEmails.includes(email));
};

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) return next();
  if (c.req.path === "/api/health") return next();

  const jwksUrl = c.env.NEON_JWKS_URL;
  if (!jwksUrl) {
    return c.json({ message: "Auth is not configured" }, 500);
  }
  const header = c.req.header("Authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return c.json({ message: "Not authenticated" }, 401);
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return c.json({ message: "Not authenticated" }, 401);
  }
  try {
    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: c.env.NEON_JWT_ISSUER || undefined,
      audience: c.env.NEON_JWT_AUDIENCE || undefined,
    });
    c.set("user", payload as AuthUser);
    return next();
  } catch {
    return c.json({ message: "Not authenticated" }, 401);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.all("/api/auth/*", async (c) => {
  const base = c.env.NEON_AUTH_URL;
  if (!base) {
    return c.json({ message: "NEON_AUTH_URL is not configured" }, 500);
  }

  const incomingUrl = new URL(c.req.url);
  const targetPath = incomingUrl.pathname.replace(/^\/api\/auth/, "");
  const targetUrl = new URL(base.replace(/\/$/, "") + targetPath + incomingUrl.search);

  const headers = new Headers(c.req.raw.headers);
  headers.set("host", targetUrl.host);

  const requestInit: RequestInit = {
    method: c.req.method,
    headers,
    body: c.req.method === "GET" || c.req.method === "HEAD" ? undefined : await c.req.arrayBuffer(),
    redirect: "manual",
  };

  const response = await fetch(targetUrl, requestInit);
  return response;
});

app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Not authenticated" }, 401);
  return c.json({
    id: user.sub,
    email: user.email,
    name: getDisplayName(user),
    user,
  });
});

app.get("/api/user/profile", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);

  const profile = await storage.getUserProfile(userId);
  if (profile) {
    return c.json({
      ...profile,
      id: userId,
      preferences: profile.preferences ? JSON.parse(profile.preferences) : {},
    });
  }

  const firstName = typeof user?.given_name === "string" ? user.given_name : "";
  const lastName = typeof user?.family_name === "string" ? user.family_name : "";
  const email = typeof user?.email === "string" ? user.email : undefined;

  const created = await storage.upsertUserProfile({
    userId,
    firstName,
    lastName,
    email,
    role: "user",
    status: "active",
    preferences: JSON.stringify({}),
  });

  return c.json({
    ...created,
    id: userId,
    preferences: created.preferences ? JSON.parse(created.preferences) : {},
  });
});

app.put("/api/user/profile", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await c.req.json();
  const existing = await storage.getUserProfile(userId);
  const mergedPreferences = {
    ...(existing?.preferences ? JSON.parse(existing.preferences) : {}),
    ...(body?.preferences || {}),
  };
  const payload = insertUserProfileSchema.partial().parse({
    userId,
    ...body,
    preferences: JSON.stringify(mergedPreferences),
  });
  const updated = await storage.upsertUserProfile(payload);
  return c.json({
    ...updated,
    id: userId,
    preferences: updated.preferences ? JSON.parse(updated.preferences) : {},
  });
});

app.get("/api/users/lookup", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const email = c.req.query("email")?.trim();
  if (!email) {
    return c.json({ message: "Email is required" }, 400);
  }
  const profile = await storage.getUserProfileByEmail(email);
  if (!profile) {
    return c.json({ message: "User not found" }, 404);
  }
  return c.json({
    userId: profile.userId,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
  });
});

app.get("/api/organizations", async (c) => {
  const organizationsList = await storage.getOrganizations();
  return c.json(organizationsList);
});

app.get("/api/organizations/:id", async (c) => {
  const org = await storage.getOrganization(c.req.param("id"));
  if (!org) return c.json({ message: "Organization not found" }, 404);
  return c.json(org);
});

app.post("/api/organizations", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const payload = insertOrganizationSchema.parse(await c.req.json());
  const org = await storage.createOrganization(payload);
  return c.json(org, 201);
});

app.put("/api/organizations/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const payload = insertOrganizationSchema.partial().parse(await c.req.json());
  const org = await storage.updateOrganization(c.req.param("id"), payload);
  if (!org) return c.json({ message: "Organization not found" }, 404);
  return c.json(org);
});

app.delete("/api/organizations/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const deleted = await storage.deleteOrganization(c.req.param("id"));
  if (!deleted) return c.json({ message: "Organization not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/organizations/:id/members", async (c) => {
  const members = await storage.getOrganizationMembers(c.req.param("id"));
  return c.json(members);
});

app.post("/api/organizations/:id/members", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const payload = insertOrganizationMemberSchema.parse({
    ...(await c.req.json()),
    organizationId: c.req.param("id"),
  });
  const member = await storage.addOrganizationMember(payload);
  return c.json(member, 201);
});

app.put("/api/organization-members/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const payload = insertOrganizationMemberSchema.partial().parse(await c.req.json());
  const member = await storage.updateOrganizationMember(c.req.param("id"), payload);
  if (!member) return c.json({ message: "Organization member not found" }, 404);
  return c.json(member);
});

app.delete("/api/organization-members/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const deleted = await storage.removeOrganizationMember(c.req.param("id"));
  if (!deleted) return c.json({ message: "Organization member not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/admin/stats", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
  const [activeUsersResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userProfiles)
    .where(sql`lower(coalesce(${userProfiles.status}, '')) = 'active'`);
  const [totalSurveysResult] = await db.select({ count: sql<number>`count(*)` }).from(surveysTable);
  const [totalAirSamplesResult] = await db.select({ count: sql<number>`count(*)` }).from(airSamplesTable);
  const dbSizeResult = await db.execute(sql`select pg_database_size(current_database()) as size`);
  const databaseSizeBytes = Number((dbSizeResult as any)?.rows?.[0]?.size ?? 0);
  return c.json({
    totalUsers: Number(totalUsersResult?.count ?? 0),
    activeUsers: Number(activeUsersResult?.count ?? 0),
    totalSurveys: Number(totalSurveysResult?.count ?? 0),
    totalAirSamples: Number(totalAirSamplesResult?.count ?? 0),
    databaseSize: `${(databaseSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
    databaseSizeBytes,
    systemUptime: `${Math.floor(Date.now() / 1000 / 60)} minutes`,
    lastBackup: null,
    dbConnected: true,
  });
});

app.get("/api/admin/users", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const profiles = await storage.getUserProfiles();
  return c.json(
    profiles.map((profile) => ({
      id: profile.userId,
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: profile.email || "",
      role: (profile.role as "admin" | "manager" | "user") || "user",
      status: (profile.status as "active" | "inactive" | "pending") || "active",
      organization: profile.organization || "",
      jobTitle: profile.jobTitle || "",
      lastLogin: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : null,
      createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
    }))
  );
});

app.put("/api/admin/users/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const { firstName, lastName, email, organization, jobTitle, role, status } = await c.req.json();
  const updated = await storage.updateUserProfile(c.req.param("id"), {
    firstName,
    lastName,
    email,
    organization,
    jobTitle,
    role,
    status,
  });
  if (!updated) return c.json({ error: "User not found" }, 404);
  return c.json({
    id: updated.userId,
    firstName: updated.firstName || "",
    lastName: updated.lastName || "",
    email: updated.email || "",
    role: (updated.role as "admin" | "manager" | "user") || "user",
    status: (updated.status as "active" | "inactive" | "pending") || "active",
    organization: updated.organization || "",
    jobTitle: updated.jobTitle || "",
    lastLogin: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null,
    createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
  });
});

app.delete("/api/admin/users/:id", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const deleted = await storage.deleteUserProfile(c.req.param("id"));
  if (!deleted) return c.json({ error: "User not found" }, 404);
  return c.json({ success: true, message: "User deleted successfully" });
});

app.get("/api/admin/data-management", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
  const [surveyCount] = await db.select({ count: sql<number>`count(*)` }).from(surveysTable);
  const [airSampleCount] = await db.select({ count: sql<number>`count(*)` }).from(airSamplesTable);
  const [observationCount] = await db.select({ count: sql<number>`count(*)` }).from(observationsTable);
  return c.json({
    totalSurveys: Number(surveyCount?.count ?? 0),
    totalUsers: Number(userCount?.count ?? 0),
    totalAirSamples: Number(airSampleCount?.count ?? 0),
    totalObservations: Number(observationCount?.count ?? 0),
    databaseSize: "Unknown",
    lastBackup: null,
    autoBackupEnabled: true,
    retentionPeriod: 365,
  });
});

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.notFound();
  }

  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(c.req.url);
  const indexRequest = new Request(new URL("/", url), c.req.raw);
  return c.env.ASSETS.fetch(indexRequest);
});

export default { fetch: app.fetch };
