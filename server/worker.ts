import { Hono } from "hono";
// jose previously used for Cloudflare Access / JWKS verification. Password auth no longer needs it.
import {
  insertAsbestosSampleLayerSchema,
  insertAsbestosSampleSchema,
  insertAirMonitoringJobSchema,
  insertAirMonitoringDocumentSchema,
  insertAirSampleSchema,
  insertDailyWeatherLogSchema,
  insertFieldToolsEquipmentSchema,
  insertEquipmentRecordSchema,
  insertEquipmentCalibrationEventSchema,
  insertEquipmentUsageSchema,
  insertEquipmentNoteSchema,
  insertPersonnelSchema,
  insertPersonnelAssignmentSchema,
  upsertExposureLimitSchema,
  insertOrganizationMemberSchema,
  insertOrganizationSchema,
  insertObservationSchema,
  insertPersonnelProfileSchema,
  insertPaintSampleSchema,
  insertSurveySchema,
  insertUserProfileSchema,
  userProfiles,
  surveys as surveysTable,
  airSamples as airSamplesTable,
  observations as observationsTable,
} from "@shared/schema";
import type {
  Survey,
  Observation,
  ObservationPhoto,
  AsbestosSample,
  PaintSample,
  AsbestosSampleLayer,
  AsbestosSamplePhoto,
  PaintSamplePhoto,
} from "@shared/schema";
import { storage } from "./storage";
import { getDb, setD1Database } from "./db";
import { sql } from "drizzle-orm";
import { ZodError, z } from "zod";
import * as XLSX from "xlsx";

type D1Database = any;

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  // Local dev bypass: if set, all /api/* requests are treated as authenticated as this email.
  DEV_AUTH_EMAIL?: string;
  // Legacy variables kept in config but unused once password auth is enabled.
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  NEON_AUTH_URL?: string;
  NEON_JWKS_URL?: string;
  NEON_JWT_ISSUER?: string;
  NEON_JWT_AUDIENCE?: string;
  ADMIN_EMAILS?: string;
  DB: D1Database;
  OPENWEATHER_API_KEY?: string;
  ABATEIQ_UPLOADS: R2Bucket;
  // Optional private backups bucket (do NOT expose via /uploads).
  ABATEIQ_BACKUPS?: R2Bucket;
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

const WORKER_START_MS = Date.now();

const formatDurationMs = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours || parts.length) parts.push(`${hours}h`);
  if (minutes || parts.length) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
};

const toTitleCase = (value: any) => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const toLabel = (value: any) => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const fmtUnit = (value: any, unit: string) => {
  if (value === null || value === undefined || value === "") return "";
  return `${String(value)} ${unit}`.trim();
};

const runD1Backup = async (env: Env, reason: string) => {
  if (!env.ABATEIQ_BACKUPS) {
    return { ok: false as const, message: "Backups bucket not configured" };
  }

  // Dump all non-internal tables. Baseline approach; for large datasets consider incremental/export tooling.
  const tablesRes = await env.DB.prepare(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
  ).all();
  const tableNames = ((tablesRes as any)?.results || [])
    .map((r: any) => String(r?.name || "").trim())
    .filter(Boolean);

  const tables: Record<string, any[]> = {};
  for (const name of tableNames) {
    const safe = name.replaceAll('\"', '\"\"');
    const rowsRes = await env.DB.prepare(`select * from \"${safe}\"`).all();
    tables[name] = ((rowsRes as any)?.results || []) as any[];
  }

  const payload = {
    version: 1,
    reason,
    generatedAt: Date.now(),
    tables,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `d1/${ts}.json`;
  await env.ABATEIQ_BACKUPS.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json" },
  });
  return { ok: true as const, key };
};

app.onError((err, c) => {
  // Make failures debuggable in production without dumping stack traces to the browser.
  try {
    console.error("Unhandled error:", err);
  } catch {
    // ignore
  }
  const message = err instanceof Error ? err.message : String(err);
  if (c.req.path.startsWith("/api")) {
    return c.json({ message: "Internal Server Error", error: message }, 500);
  }
  return c.text("Internal Server Error", 500);
});

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

const splitName = (full?: string | null) => {
  const name = (full || "").trim();
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
};

const titleFromDomain = (domain: string) => {
  const clean = domain.trim().toLowerCase();
  const first = clean.split(".")[0] || clean;
  if (!first) return "Organization";
  return first.charAt(0).toUpperCase() + first.slice(1);
};

const ensureOnboarding = async (user: AuthUser, env: Env) => {
  const userId = typeof user.sub === "string" ? user.sub : "";
  if (!userId) return { organizationId: null as string | null };

  // Ensure a profile row exists (used throughout the UI for display + lookups)
  const existingProfile = await storage.getUserProfile(userId);
  if (!existingProfile) {
    const email = typeof user.email === "string" ? user.email : undefined;
    const displayName = getDisplayName(user);
    const { firstName, lastName } = splitName(displayName || (typeof user.name === "string" ? user.name : ""));
    await storage.upsertUserProfile({
      userId,
      email,
      firstName: (typeof user.given_name === "string" && user.given_name) || firstName,
      lastName: (typeof user.family_name === "string" && user.family_name) || lastName,
      role: "user",
      status: "active",
      preferences: JSON.stringify({}),
    });
  }

  // If the user has no org membership, auto-create a fresh org and add them as org admin.
  const orgIds = await storage.getOrganizationIdsForUser(userId);
  if (orgIds.length) return { organizationId: orgIds[0] || null };

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const domain = email.includes("@") ? email.split("@")[1] || "" : "";

  // Deterministic IDs make onboarding idempotent across repeated initial requests.
  const organizationId = `org-${userId}`;
  const memberId = `orgmem-${organizationId}-${userId}`;

  try {
    await storage.createOrganization({
      id: organizationId,
      name: domain ? `${titleFromDomain(domain)} Organization` : "My Organization",
      domain: domain || null,
      status: "active",
    } as any);
  } catch {
    // If the org already exists (race), continue.
  }

  try {
    await storage.addOrganizationMember({
      id: memberId,
      organizationId,
      userId,
      role: "admin",
      status: "active",
    } as any);
  } catch {
    // If the membership already exists (race), continue.
  }

  // Backfill the profile's organization label for display if empty.
  try {
    const profile = await storage.getUserProfile(userId);
    if (profile && !profile.organization) {
      const org = await storage.getOrganization(organizationId);
      if (org?.name) {
        await storage.updateUserProfile(userId, { organization: org.name });
      }
    }
  } catch {
    // Non-fatal
  }

  return { organizationId };
};

const parseJsonBody = async <T = any>(c: { req: { json: () => Promise<T> } }) => {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
};

const coerceDate = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const normalizeAirSampleBody = (body: any) => {
  if (!body || typeof body !== "object") return body;
  const normalized: any = { ...body };
  if ("startTime" in normalized) normalized.startTime = coerceDate(normalized.startTime) ?? normalized.startTime;
  if ("endTime" in normalized) normalized.endTime = coerceDate(normalized.endTime) ?? normalized.endTime;
  if ("labReportDate" in normalized) normalized.labReportDate = coerceDate(normalized.labReportDate) ?? normalized.labReportDate;
  return normalized;
};

const normalizeWeatherLogBody = (body: any) => {
  if (!body || typeof body !== "object") return body;
  const normalized: any = { ...body };
  if ("logTime" in normalized) normalized.logTime = coerceDate(normalized.logTime) ?? normalized.logTime;
  return normalized;
};

const addYears = (date: Date, years: number) => {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const xlsxResponse = (workbook: XLSX.WorkBook, filename: string) => {
  const safe = sanitizeFilename(filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Response(out, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${safe}\"`,
      "Cache-Control": "no-store",
    },
  });
};

const zodBadRequest = (c: any, error: unknown) => {
  if (error instanceof ZodError) {
    return c.json(
      {
        message: "Invalid request",
        issues: error.issues,
      },
      400
    );
  }
  return null;
};

const getUserOrgIds = async (userId: string) => {
  const orgIds = await storage.getOrganizationIdsForUser(userId);
  return orgIds || [];
};

const getOrgIdForUserOrThrow = async (userId: string) => {
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) throw new Error("No organization access");
  return orgIds[0]!;
};

const audit = async (
  c: any,
  params: {
    organizationId: string;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    summary?: string | null;
    metadata?: any;
  }
) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user) return;
  await storage.createAuditLog({
    organizationId: params.organizationId,
    actorUserId: typeof user.sub === "string" ? user.sub : null,
    actorEmail: typeof user.email === "string" ? user.email : null,
    actorName: getDisplayName(user) || null,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    summary: params.summary ?? null,
    metadata: params.metadata ?? null,
  });
};

const auditVal = (value: any) => {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const computeAuditChanges = (before: any, after: any, keys: string[]) => {
  const changes: Array<{ field: string; from: any; to: any }> = [];
  for (const key of keys) {
    const from = auditVal(before ? (before as any)[key] : undefined);
    const to = auditVal(after ? (after as any)[key] : undefined);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
};

const changesSummary = (changes: Array<{ field: string; from: any; to: any }>) => {
  const parts = changes.map((c) => {
    const from = c.from === null ? "—" : String(c.from);
    const to = c.to === null ? "—" : String(c.to);
    return `${c.field}: ${from} -> ${to}`;
  });
  const joined = parts.join("; ");
  // Keep audit summaries readable in a table.
  return joined.length > 240 ? `${joined.slice(0, 237)}...` : joined;
};

const ymdToUtcMs = (ymd: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Date.UTC(year, month - 1, day);
};

const resolveOrgIdForCreate = (orgIds: string[], requested?: string | null) => {
  if (requested && orgIds.includes(requested)) return requested;
  return orgIds[0];
};

const assertSurveyOrgAccess = async (userId: string, surveyId: string) => {
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) {
    return { allowed: false as const };
  }
  const survey = await storage.getSurvey(surveyId);
  if (!survey) {
    return { allowed: false as const, notFound: true as const };
  }
  if (!survey.organizationId || !orgIds.includes(survey.organizationId)) {
    if (!survey.organizationId && orgIds.length === 1) {
      const updated = await storage.updateSurvey(surveyId, { organizationId: orgIds[0] });
      return { allowed: true as const, survey: updated || survey };
    }
    return { allowed: false as const };
  }
  return { allowed: true as const, survey };
};

const assertAirJobOrgAccess = async (userId: string, jobId: string) => {
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) {
    return { allowed: false as const };
  }
  const job = await storage.getAirMonitoringJob(jobId);
  if (!job) {
    return { allowed: false as const, notFound: true as const };
  }
  if (!job.organizationId || !orgIds.includes(job.organizationId)) {
    if (!job.organizationId && orgIds.length === 1) {
      const updated = await storage.updateAirMonitoringJob(jobId, { organizationId: orgIds[0] });
      return { allowed: true as const, job: updated || job };
    }
    return { allowed: false as const };
  }
  return { allowed: true as const, job };
};

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const parseYmdUtc = (ymd: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const toYmd = (date: Date) => date.toISOString().slice(0, 10);

const addDaysToYmd = (ymd: string, days: number) => {
  const base = parseYmdUtc(ymd);
  if (!base) return null;
  const delta = Number(days);
  if (!Number.isFinite(delta)) return null;
  const updated = new Date(base.getTime() + delta * 24 * 60 * 60 * 1000);
  return toYmd(updated);
};

const stripUndefined = <T extends Record<string, any>>(obj: T) => {
  const out: Record<string, any> = { ...obj };
  for (const [key, value] of Object.entries(out)) {
    if (value === undefined) delete out[key];
  }
  return out as Partial<T>;
};

const SESSION_COOKIE = "abateiq_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const parseCookies = (cookieHeader: string | null) => {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
};

const setSessionCookie = (c: any, sessionId: string, options: { secure: boolean }) => {
  const secureFlag = options.secure ? "; Secure" : "";
  // HttpOnly so JS can't read it. SameSite=Lax for normal navigation and to reduce CSRF risk.
  c.header(
    "set-cookie",
    `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureFlag}`
  );
};

const clearSessionCookie = (c: any, options: { secure: boolean }) => {
  const secureFlag = options.secure ? "; Secure" : "";
  c.header("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`);
};

const b64encode = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
};

const b64decode = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
};

const pbkdf2HashPassword = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // Cloudflare Workers PBKDF2 currently enforces an upper bound on iteration count.
  // Keep this at <= 100_000 to avoid runtime failures.
  const iterations = 100_000;
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hash = new Uint8Array(bits);
  return `pbkdf2_sha256$${iterations}$${b64encode(salt)}$${b64encode(hash)}`;
};

const pbkdf2VerifyPassword = async (password: string, stored: string) => {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [scheme, iterStr, saltB64, hashB64] = parts;
  if (scheme !== "pbkdf2_sha256") return false;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 50_000 || iterations > 100_000) return false;
  const salt = b64decode(saltB64 || "");
  const expected = b64decode(hashB64 || "");
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    expected.length * 8
  );
  const actual = new Uint8Array(bits);
  return timingSafeEqual(actual, expected);
};

const parseNumeric = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n)) return null;
  return n;
};

const computeTwa8hr = (concentration: number | null, durationMinutes: number | null) => {
  if (concentration === null || durationMinutes === null) return null;
  if (!Number.isFinite(concentration) || !Number.isFinite(durationMinutes)) return null;
  // 8-hr TWA: c * (t / 480). This is explicitly labeled as an 8-hr TWA.
  return concentration * (durationMinutes / 480);
};

const getExposureLimitFor = async (organizationId: string, profileKey: string, analyte: string) => {
  const limits = await storage.getExposureLimits(organizationId, profileKey);
  const normalized = analyte.trim().toLowerCase();
  return limits.find((l: any) => String(l.analyte || "").trim().toLowerCase() === normalized) || null;
};

const computeExposureFlags = (twa8hr: number | null, limitRow: any | null, nearMissThreshold = 0.8) => {
  if (twa8hr === null || !limitRow) {
    return {
      limitType: null as string | null,
      limitValue: null as number | null,
      percentOfLimit: null as number | null,
      exceedanceFlag: false,
      nearMissFlag: false,
    };
  }

  // Prefer PEL for exceedance checks; fall back to REL then AL if those are all that's configured.
  const pel = parseNumeric(limitRow.pel);
  const rel = parseNumeric(limitRow.rel);
  const al = parseNumeric(limitRow.actionLevel);
  let limitType: string | null = null;
  let limitValue: number | null = null;
  if (pel !== null) {
    limitType = "PEL";
    limitValue = pel;
  } else if (rel !== null) {
    limitType = "REL";
    limitValue = rel;
  } else if (al !== null) {
    limitType = "AL";
    limitValue = al;
  }

  if (limitValue === null || limitValue === 0) {
    return {
      limitType,
      limitValue,
      percentOfLimit: null,
      exceedanceFlag: false,
      nearMissFlag: false,
    };
  }

  const percent = twa8hr / limitValue;
  return {
    limitType,
    limitValue,
    percentOfLimit: percent,
    exceedanceFlag: percent >= 1,
    nearMissFlag: percent >= nearMissThreshold && percent < 1,
  };
};

const storeUpload = async (bucket: R2Bucket, file: File, opts?: { prefix?: string | null }) => {
  const safeName = sanitizeFilename(file.name || "upload");
  const prefix = (opts?.prefix || "").toString().replace(/^\/+|\/+$/g, "");
  const key = prefix ? `${prefix}/${crypto.randomUUID()}-${safeName}` : `${crypto.randomUUID()}-${safeName}`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return { key, url: `/uploads/${key}` };
};

const basename = (value?: string | null) => {
  if (!value) return "";
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
};

function generateSurveyReport(
  survey: Survey,
  observations: Observation[],
  photosByObservation: Array<{ observation: Observation; photos: Array<ObservationPhoto & { dataUrl?: string | null; url?: string | null }> }>,
  homogeneousAreas: Array<{ title: string; description?: string | null; haId?: string | null }>,
  functionalAreas: Array<{ title: string; description?: string | null }>,
  asbestosSamples: AsbestosSample[],
  paintSamples: PaintSample[],
  asbestosLayersBySample: Record<string, AsbestosSampleLayer[]>,
  asbestosPhotosBySample: Array<{ sample: AsbestosSample; photos: Array<AsbestosSamplePhoto & { dataUrl?: string | null }> }>,
  paintPhotosBySample: Array<{ sample: PaintSample; photos: Array<PaintSamplePhoto & { dataUrl?: string | null }> }>,
  baseUrl?: string,
  sitePhotoDataUrl?: string | null
): string {
  const materialTypeLabels: Record<string, string> = {
    "ceiling-tiles": "Ceiling Tiles",
    "floor-tiles-9x9": '9"x9" Floor Tiles',
    "floor-tiles-12x12": '12"x12" Floor Tiles',
    "pipe-insulation": "Pipe Insulation",
    "duct-insulation": "Duct Insulation",
    "boiler-insulation": "Boiler Insulation",
    "drywall": "Drywall/Joint Compound",
    "paint": "Paint/Coatings",
    "roofing": "Roofing Material",
    "siding": "Siding Material",
    "window-glazing": "Window Glazing",
    "plaster": "Plaster",
    "masonry": "Masonry/Mortar",
    "vinyl-tiles": "Vinyl Floor Tiles",
    "carpet-mastic": "Carpet Mastic",
    "electrical-materials": "Electrical Materials",
    "mastic-glue": "Mastic/Glue",
    "other": "Other",
  };
  const formatMaterialType = (value: string) =>
    materialTypeLabels[value] ||
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const formatNumber = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return parseFloat(value.toFixed(6)).toString();
  };
  const toNumber = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (Number.isNaN(parsed)) return null;
    return parsed;
  };
  const formatOptionalNumber = (value: unknown, suffix?: string) => {
    const parsed = toNumber(value);
    if (parsed === null) return "—";
    const formatted = formatNumber(parsed);
    return suffix ? `${formatted}${suffix}` : formatted;
  };
  const formatStatus = (value: string | null | undefined) => {
    const raw = value || "";
    return raw
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const formatSurveyType = (value: string | null | undefined) => {
    const raw = value || "";
    if (!raw) return "";
    return raw
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(", ");
  };
  const formatDateLong = (value: string | Date) =>
    new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const toSentenceCaseIfOneWord = (value: string | null | undefined) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!/^[A-Za-z]+$/.test(trimmed)) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };
  const formatSubstrate = (sample: PaintSample) => {
    if (!sample.substrate) return "—";
    if (sample.substrate === "other") {
      return sample.substrateOther?.trim() || "Other";
    }
    return toSentenceCaseIfOneWord(sample.substrate);
  };
  const formatLayerLines = (sample: AsbestosSample) => {
    const layers = asbestosLayersBySample[sample.id] || [];
    if (!layers.length) return "—";
    return layers
      .map((layer) => {
        const material = layer.materialType ? formatMaterialType(layer.materialType) : formatMaterialType(sample.materialType);
        const type = toSentenceCaseIfOneWord(layer.asbestosType) || "—";
        const percent = formatOptionalNumber(layer.asbestosPercent, layer.asbestosPercent ? "%" : "");
        const description = layer.description ? ` • ${layer.description}` : "";
        return `Layer ${layer.layerNumber}: ${material} • ${type} • ${percent}${description}`;
      })
      .join("<br/>");
  };
  const parseSampleQty = (rawQuantity: string | null | undefined) => {
    if (!rawQuantity) return null;
    const raw = rawQuantity.trim();
    const match = raw.match(/^(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const amount = parseFloat(match[1]);
    if (Number.isNaN(amount)) return null;
    return amount;
  };

  const highRiskObservations = observations.filter(obs => obs.riskLevel === "high");
  const mediumRiskObservations = observations.filter(obs => obs.riskLevel === "medium");
  const samplesCollected = observations.filter(obs => obs.sampleCollected);
  const hazardousAreas = observations.filter(obs => obs.riskLevel === "high" || obs.riskLevel === "medium");

  const totalQtyByHomogeneousArea = asbestosSamples.reduce((acc, sample) => {
    const key = sample.homogeneousArea;
    const qty = parseSampleQty(sample.estimatedQuantity);
    if (!key) return acc;
    if (!acc[key]) acc[key] = 0;
    if (qty && qty > 0) {
      acc[key] += qty;
    }
    return acc;
  }, {} as Record<string, number>);

  const sampleCountByHomogeneousArea = asbestosSamples.reduce((acc, sample) => {
    const key = sample.homogeneousArea;
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const firstObservationWithCoords = observations.find(
    (obs) => obs.latitude !== null && obs.latitude !== undefined && obs.longitude !== null && obs.longitude !== undefined
  );
  const mapEmbedUrl = firstObservationWithCoords
    ? (() => {
        const lat = Number(firstObservationWithCoords.latitude);
        const lon = Number(firstObservationWithCoords.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const latDelta = 0.005;
        const lonDelta = 0.005;
        const bbox = `${lon - lonDelta},${lat - lonDelta},${lon + lonDelta},${lat + lonDelta}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
      })()
    : null;

  const resolveAssetUrl = (src?: string | null) => {
    if (!src) return "";
    if (src.startsWith("data:")) return src;
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    if (!baseUrl) return src;
    if (src.startsWith("/")) return `${baseUrl}${src}`;
    return `${baseUrl}/${src}`;
  };

  const sitePhotoSrc = sitePhotoDataUrl || (survey.sitePhotoUrl
    ? resolveAssetUrl(survey.sitePhotoUrl)
    : null);

  const photoRows = photosByObservation
    .filter(entry => entry.photos.length > 0)
    .map(entry => {
      const photoCells = entry.photos.map(photo => {
        const safeFilename = basename(photo.filename);
        const photoSrc = resolveAssetUrl(
          photo.dataUrl ||
            photo.url ||
            (safeFilename ? `/uploads/${safeFilename}` : "")
        );
        return `<img src="${photoSrc}" alt="${photo.originalName}" class="photo-thumb" />`;
      }).join("");
      return `
      <div class="photo-row">
        <div class="photo-row-header">${entry.observation.area}</div>
        <div class="photo-grid">${photoCells}</div>
      </div>`;
    })
    .join("");

  const totalSampleQty = asbestosSamples.reduce((acc, sample) => {
    const qty = parseSampleQty(sample.estimatedQuantity);
    if (qty && qty > 0) acc += qty;
    return acc;
  }, 0);

  const sortedHomogeneousAreas = [...homogeneousAreas].sort((a, b) => (a.haId || "").localeCompare(b.haId || ""));

  const groupedAsbestosSamples = asbestosSamples.flatMap((sample) => {
    const layers = asbestosLayersBySample[sample.id] || [];
    if (!layers.length) {
      return [{ sample, layerIndex: 0, layerCount: 1, layer: null as AsbestosSampleLayer | null }];
    }
    return layers.map((layer, index) => ({
      sample,
      layerIndex: index,
      layerCount: layers.length,
      layer,
    }));
  });

  const asbestosPhotoMap = new Map(asbestosPhotosBySample.map((entry) => [entry.sample.id, entry.photos]));
  const paintPhotoMap = new Map(paintPhotosBySample.map((entry) => [entry.sample.id, entry.photos]));

  const asbestosSampleRows = groupedAsbestosSamples.map(({ sample, layerIndex, layerCount, layer }) => {
    const layerMaterial = layer?.materialType ? formatMaterialType(layer.materialType) : formatMaterialType(sample.materialType);
    const layerType = toSentenceCaseIfOneWord(layer?.asbestosType) || toSentenceCaseIfOneWord(sample.asbestosType) || "—";
    const layerPercent = formatOptionalNumber(layer?.asbestosPercent ?? sample.asbestosPercent, (layer?.asbestosPercent ?? sample.asbestosPercent) ? "%" : "");
    const layerNotes = layer?.description || layer?.notes || "";
    const sampleLabel = layerCount > 1 ? `${sample.sampleNumber} (${layerIndex + 1}/${layerCount})` : sample.sampleNumber;
    return `
      <tr>
        <td>${sampleLabel}</td>
        <td>${sample.functionalArea || "—"}</td>
        <td>${sample.homogeneousArea || "—"}</td>
        <td>${sample.sampleDescription || "—"}</td>
        <td>${sample.sampleLocation || "—"}</td>
        <td>${layerMaterial}</td>
        <td>${layerType}</td>
        <td>${layerPercent}</td>
        <td>${formatOptionalNumber(sample.estimatedQuantity)}</td>
        <td>${sample.quantityUnit || "—"}</td>
        <td>${formatStatus(sample.condition)}</td>
        <td>${sample.collectionMethod || "—"}</td>
        <td>${sample.results || "—"}</td>
        <td>${layerNotes || "—"}</td>
      </tr>
    `;
  }).join("");

  const paintSampleRows = paintSamples.map((sample) => `
      <tr>
        <td>${sample.sampleNumber}</td>
        <td>${sample.functionalArea || "—"}</td>
        <td>${sample.sampleDescription || "—"}</td>
        <td>${sample.sampleLocation || "—"}</td>
        <td>${formatSubstrate(sample)}</td>
        <td>${sample.collectionMethod || "—"}</td>
        <td>${formatOptionalNumber(sample.leadResultMgKg)}</td>
        <td>${formatOptionalNumber(sample.leadResultMgKg, "%")}</td>
        <td>${formatOptionalNumber(sample.cadmiumResultMgKg)}</td>
        <td>${formatOptionalNumber(sample.cadmiumResultMgKg, "%")}</td>
        <td>${sample.notes || "—"}</td>
      </tr>
    `).join("");

  const asbestosPhotoBlocks = asbestosSamples.map((sample) => {
    const photos = asbestosPhotoMap.get(sample.id) || [];
    if (!photos.length) return "";
    const images = photos.map((photo) => {
      const photoSrc = resolveAssetUrl(
        photo.dataUrl ||
          photo.url ||
          (photo.filename ? `/uploads/${basename(photo.filename)}` : "")
      );
      return `<img src="${photoSrc}" alt="${sample.sampleNumber}" class="photo-thumb" />`;
    }).join("");
    return `
      <div class="photo-row">
        <div class="photo-row-header">Asbestos Sample ${sample.sampleNumber}</div>
        <div class="photo-grid">${images}</div>
      </div>`;
  }).join("");

  const paintPhotoBlocks = paintSamples.map((sample) => {
    const photos = paintPhotoMap.get(sample.id) || [];
    if (!photos.length) return "";
    const images = photos.map((photo) => {
      const photoSrc = resolveAssetUrl(
        photo.dataUrl ||
          photo.url ||
          (photo.filename ? `/uploads/${basename(photo.filename)}` : "")
      );
      return `<img src="${photoSrc}" alt="${sample.sampleNumber}" class="photo-thumb" />`;
    }).join("");
    return `
      <div class="photo-row">
        <div class="photo-row-header">Paint Sample ${sample.sampleNumber}</div>
        <div class="photo-grid">${images}</div>
      </div>`;
  }).join("");

  const observationBlocks = observations.map((observation) => `
      <div class="section">
        <h3>${observation.area}</h3>
        <p><strong>Notes:</strong> ${observation.notes || "—"}</p>
        <p><strong>Risk Level:</strong> ${formatStatus(observation.riskLevel)}</p>
      </div>
    `).join("");

  const functionalAreaRows = functionalAreas.map((area) => `
      <tr>
        <td>${area.title}</td>
        <td>${area.description || "—"}</td>
      </tr>
    `).join("");

  const homogeneousAreaRows = sortedHomogeneousAreas.map((area) => `
      <tr>
        <td>${area.haId || "—"}</td>
        <td>${area.title}</td>
        <td>${area.description || "—"}</td>
        <td>${sampleCountByHomogeneousArea[area.haId || ""] || 0}</td>
        <td>${formatOptionalNumber(totalQtyByHomogeneousArea[area.haId || ""] || 0)}</td>
      </tr>
    `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${survey.siteName} - Site Survey Report</title>
  <style>
    ${`
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; }
    .page { page-break-after: always; padding: 32px; }
    .page:last-child { page-break-after: auto; }
    h1, h2, h3 { margin: 0 0 12px 0; }
    .cover-title { font-size: 28px; margin-bottom: 12px; }
    .cover-header { display: flex; gap: 24px; align-items: flex-start; justify-content: space-between; }
    .cover-left { flex: 1 1 auto; min-width: 0; }
    .cover-right { flex: 0 0 260px; display: flex; justify-content: flex-end; }
    .cover-photo { width: 260px; height: 200px; object-fit: contain; border-radius: 6px; border: 1px solid #ddd; background: #fff; }
    .section { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background: #f5f5f5; text-align: left; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .photo-thumb { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
    .photo-row-header { font-weight: bold; margin-bottom: 8px; }
    .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    `}
  </style>
</head>
<body>
  <div class="page">
    <div class="section cover-header">
      <div class="cover-left">
        <div class="cover-title">Site Survey Report</div>
        <div><strong>Site Name:</strong> ${survey.siteName}</div>
        <div><strong>Survey Type:</strong> ${formatSurveyType(survey.surveyType)}</div>
        <div><strong>Survey Date:</strong> ${formatDateLong(survey.surveyDate)}</div>
        <div><strong>Inspector:</strong> ${survey.inspector}</div>
        <div><strong>Status:</strong> ${formatStatus(survey.status)}</div>
      </div>
      <div class="cover-right">
        ${sitePhotoSrc ? `<img src="${sitePhotoSrc}" alt="Site Overview" class="cover-photo" />` : ""}
      </div>
    </div>
  </div>

  <div class="page">
    <div class="section two-col">
      <div>
        <h3>Functional Areas</h3>
        <table>
          <thead><tr><th>Area</th><th>Description</th></tr></thead>
          <tbody>${functionalAreaRows || `<tr><td colspan="2">No functional areas.</td></tr>`}</tbody>
        </table>
      </div>
      <div>
        <h3>Homogeneous Areas</h3>
        <table>
          <thead><tr><th>HA</th><th>Title</th><th>Description</th><th>Samples</th><th>Total Qty</th></tr></thead>
          <tbody>${homogeneousAreaRows || `<tr><td colspan="5">No homogeneous areas.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="page">
    <h2>Asbestos Samples</h2>
    <table>
      <thead>
        <tr>
          <th>Sample #</th>
          <th>FA</th>
          <th>HA</th>
          <th>Description</th>
          <th>Location</th>
          <th>Material</th>
          <th>Type</th>
          <th>%</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Condition</th>
          <th>Collection</th>
          <th>Results</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${asbestosSampleRows || `<tr><td colspan="14">No asbestos samples.</td></tr>`}</tbody>
    </table>
    ${asbestosPhotoBlocks ? `<div class="section">${asbestosPhotoBlocks}</div>` : ""}
  </div>

  <div class="page">
    <h2>Paint Samples</h2>
    <table>
      <thead>
        <tr>
          <th>Sample #</th>
          <th>FA</th>
          <th>Description</th>
          <th>Location</th>
          <th>Substrate</th>
          <th>Collection</th>
          <th>Lead mg/kg</th>
          <th>Lead %</th>
          <th>Cadmium mg/kg</th>
          <th>Cadmium %</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${paintSampleRows || `<tr><td colspan="11">No paint samples.</td></tr>`}</tbody>
    </table>
    ${paintPhotoBlocks ? `<div class="section">${paintPhotoBlocks}</div>` : ""}
  </div>

  <div class="page">
    <h2>Observations</h2>
    ${observationBlocks || "<em>No observations.</em>"}
    ${mapEmbedUrl ? `<div class="section"><h3>Site Map</h3><iframe src="${mapEmbedUrl}" width="100%" height="320" style="border:0;"></iframe></div>` : ""}
  </div>
</body>
</html>
`;
}

app.use("/api/*", async (c, next) => {
  if (c.env.DB && !(globalThis as { D1_DATABASE?: D1Database }).D1_DATABASE) {
    setD1Database(c.env.DB);
  }
  if (c.req.path.startsWith("/api/auth/")) return next();
  if (c.req.path === "/api/health") return next();
  if (c.req.path === "/api/health/db") return next();
  if (c.req.path.startsWith("/api/weather")) return next();

  // Local dev bypass
  const devEmail = (c.env.DEV_AUTH_EMAIL || "").trim();
  if (devEmail) {
    const user = {
      sub: `dev:${devEmail.toLowerCase()}`,
      email: devEmail.toLowerCase(),
      name: devEmail,
      role: "admin",
      roles: ["admin"],
    } satisfies AuthUser;
    c.set("user", user);
    await ensureOnboarding(user, c.env);
    return next();
  }

  // Password auth session cookie
  const cookies = parseCookies(c.req.header("cookie") || null);
  const sessionId = cookies[SESSION_COOKIE] || "";
  if (!sessionId) return c.json({ message: "Not authenticated" }, 401);
  const session = await storage.getAuthSession(sessionId);
  if (!session) return c.json({ message: "Not authenticated" }, 401);
  const expiresAt = typeof (session as any).expiresAt === "number" ? (session as any).expiresAt : (session as any).expiresAt?.getTime?.();
  if (expiresAt && Date.now() > expiresAt) {
    await storage.deleteAuthSession(sessionId);
    return c.json({ message: "Not authenticated" }, 401);
  }
  const authUser = await storage.getAuthUserById((session as any).userId);
  if (!authUser) return c.json({ message: "Not authenticated" }, 401);
  const user = {
    sub: (authUser as any).userId,
    email: (authUser as any).email,
    name: (authUser as any).name,
    roles: [],
  } satisfies AuthUser;
  c.set("user", user);
  await ensureOnboarding(user, c.env);
  return next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/health/db", async (c) => {
  try {
    const db = getDb();
    const result = await db.all(sql`select 1 as ok`);
    const tableCheck = await db.all(
      sql`select name from sqlite_master where type='table' and name='user_profiles'`
    );
    return c.json({
      ok: true,
      ping: result,
      user_profiles_table: tableCheck,
    });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

const parseWeatherCoords = (c: { req: { query: (key: string) => string | undefined } }) => {
  const lat = Number(c.req.query("lat"));
  const lon = Number(c.req.query("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }
  return { lat, lon };
};

const fetchOpenWeather = async (
  c: { env: Env },
  path: string,
  lat: number,
  lon: number
) => {
  const apiKey = c.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      ok: false as const,
      status: 503,
      body: { message: "OpenWeather API key not configured" },
    };
  }
  const url = new URL(`https://api.openweathermap.org/data/2.5/${path}`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "imperial");
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false as const,
      status: response.status,
      body: { message: text || "OpenWeather request failed" },
    };
  }
  const data = await response.json();
  return { ok: true as const, status: 200, body: data };
};

app.get("/api/weather/current", async (c) => {
  const coords = parseWeatherCoords(c);
  if (!coords) {
    return c.json({ message: "Latitude and longitude are required" }, 400);
  }
  const result = await fetchOpenWeather(c, "weather", coords.lat, coords.lon);
  return c.json(result.body, result.status);
});

app.get("/api/weather/forecast", async (c) => {
  const coords = parseWeatherCoords(c);
  if (!coords) {
    return c.json({ message: "Latitude and longitude are required" }, 400);
  }
  const result = await fetchOpenWeather(c, "forecast", coords.lat, coords.lon);
  return c.json(result.body, result.status);
});

app.get("/uploads/:key", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.ABATEIQ_UPLOADS.get(key);
  if (!object) return c.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
});

app.post("/api/auth/register", async (c) => {
  const body = await parseJsonBody<{ email?: string; password?: string; name?: string }>(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim() || null;
  if (!email || !email.includes("@")) return c.json({ message: "Invalid email" }, 400);
  if (typeof password !== "string" || password.length < 8) {
    return c.json({ message: "Password must be at least 8 characters" }, 400);
  }

  const existing = await storage.getAuthUserByEmail(email);
  if (existing) {
    // Do not leak whether an email exists; still return a clear message for UX.
    return c.json({ message: "Email already in use" }, 409);
  }

  const passwordHash = await pbkdf2HashPassword(password);
  const user = await storage.createAuthUser({ email, passwordHash, name });

  const authUser: AuthUser = { sub: (user as any).userId, email: (user as any).email, name: (user as any).name || undefined };
  // Ensure user profile + initial org exists.
  await ensureOnboarding(authUser, c.env);

  const secure = new URL(c.req.url).protocol === "https:";
  const session = await storage.createAuthSession({
    userId: (user as any).userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    userAgent: c.req.header("user-agent") || null,
    ipAddress: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || null,
  });
  setSessionCookie(c, (session as any).sessionId, { secure });

  await storage.updateAuthUser((user as any).userId, { lastLoginAt: new Date() });

  return c.json({ id: (user as any).userId, email: (user as any).email, name: (user as any).name }, 201);
});

app.post("/api/auth/login", async (c) => {
  const body = await parseJsonBody<{ email?: string; password?: string }>(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return c.json({ message: "Invalid email or password" }, 401);

  const user = await storage.getAuthUserByEmail(email);
  if (!user) return c.json({ message: "Invalid email or password" }, 401);
  const ok = await pbkdf2VerifyPassword(password, (user as any).passwordHash);
  if (!ok) return c.json({ message: "Invalid email or password" }, 401);

  const secure = new URL(c.req.url).protocol === "https:";
  const session = await storage.createAuthSession({
    userId: (user as any).userId,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    userAgent: c.req.header("user-agent") || null,
    ipAddress: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || null,
  });
  setSessionCookie(c, (session as any).sessionId, { secure });

  const authUser: AuthUser = { sub: (user as any).userId, email: (user as any).email, name: (user as any).name || undefined };
  await ensureOnboarding(authUser, c.env);
  await storage.updateAuthUser((user as any).userId, { lastLoginAt: new Date() });

  return c.json({ id: (user as any).userId, email: (user as any).email, name: (user as any).name }, 200);
});

app.post("/api/auth/logout", async (c) => {
  const secure = new URL(c.req.url).protocol === "https:";
  const cookies = parseCookies(c.req.header("cookie") || null);
  const sessionId = cookies[SESSION_COOKIE] || "";
  if (sessionId) {
    try {
      await storage.deleteAuthSession(sessionId);
    } catch {
      // ignore
    }
  }
  clearSessionCookie(c, { secure });
  return c.json({ ok: true });
});

app.get("/api/auth/session", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || null);
  const sessionId = cookies[SESSION_COOKIE] || "";
  if (!sessionId) return c.json({ authenticated: false }, 200);
  const session = await storage.getAuthSession(sessionId);
  if (!session) return c.json({ authenticated: false }, 200);
  const expiresAt = typeof (session as any).expiresAt === "number" ? (session as any).expiresAt : (session as any).expiresAt?.getTime?.();
  if (expiresAt && Date.now() > expiresAt) {
    await storage.deleteAuthSession(sessionId);
    return c.json({ authenticated: false }, 200);
  }
  return c.json({ authenticated: true }, 200);
});

app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Not authenticated" }, 401);
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return c.json({
    id: user.sub,
    email: user.email,
    name: getDisplayName(user),
    isAdmin: isAdminUser(user, adminEmails),
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
  await audit(c, {
    organizationId: org.id,
    action: "org.create",
    entityType: "organization",
    entityId: org.id,
    summary: `Created organization ${org.name}`,
    metadata: { entityLabel: org.name },
  });
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
  const existing = await storage.getOrganization(c.req.param("id"));
  if (!existing) return c.json({ message: "Organization not found" }, 404);
  const payload = insertOrganizationSchema.partial().parse(await c.req.json());
  const org = await storage.updateOrganization(c.req.param("id"), payload);
  if (!org) return c.json({ message: "Organization not found" }, 404);
  const changes = computeAuditChanges(existing as any, org as any, Object.keys(payload as any));
  await audit(c, {
    organizationId: org.id,
    action: "org.update",
    entityType: "organization",
    entityId: org.id,
    summary: changes.length ? `Updated organization ${org.name}: ${changesSummary(changes)}` : `Updated organization ${org.name}`,
    metadata: { entityLabel: org.name, changes },
  });
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
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  const members = await storage.getOrganizationMembersWithUsers(c.req.param("id"));
  return c.json(members);
});

app.get("/api/audit-logs", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const orgId = resolveOrgIdForCreate(orgIds, c.req.query("orgId"));
  if (!orgId) return c.json({ message: "No organization access" }, 403);
  const limitRaw = c.req.query("limit");
  const limit = limitRaw ? Number(limitRaw) : 200;
  try {
    const rows = await storage.getAuditLogs(orgId, Number.isFinite(limit) ? limit : 200);
    return c.json(rows);
  } catch {
    return c.json([]);
  }
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
  const profile = await storage.getUserProfile(payload.userId);
  const authUser = await storage.getAuthUserById(payload.userId);
  const memberEmail = (profile?.email || authUser?.email || "").toString();
  const memberName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || (authUser?.name || "").toString();
  const entityLabel = memberName || memberEmail || payload.userId;
  await audit(c, {
    organizationId: payload.organizationId,
    action: "org_member.add",
    entityType: "organization_member",
    entityId: member.id,
    summary: `Added org member ${entityLabel}`,
    metadata: { entityLabel, userId: payload.userId, memberName: memberName || null, memberEmail: memberEmail || null, role: payload.role, status: payload.status },
  });
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
  const existing = await storage.getOrganizationMemberById(c.req.param("id"));
  if (!existing) return c.json({ message: "Organization member not found" }, 404);
  const payload = insertOrganizationMemberSchema.partial().parse(await c.req.json());
  const member = await storage.updateOrganizationMember(c.req.param("id"), payload);
  if (!member) return c.json({ message: "Organization member not found" }, 404);
  const changes = computeAuditChanges(existing as any, member as any, Object.keys(payload as any));
  const profile = await storage.getUserProfile(member.userId);
  const authUser = await storage.getAuthUserById(member.userId);
  const memberEmail = (profile?.email || authUser?.email || "").toString();
  const memberName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || (authUser?.name || "").toString();
  const entityLabel = memberName || memberEmail || member.userId;
  await audit(c, {
    organizationId: member.organizationId,
    action: "org_member.update",
    entityType: "organization_member",
    entityId: member.id,
    summary: changes.length ? `Updated org member ${entityLabel}: ${changesSummary(changes)}` : `Updated org member ${entityLabel}`,
    metadata: { entityLabel, userId: member.userId, memberName: memberName || null, memberEmail: memberEmail || null, changes },
  });
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
  const existing = await storage.getOrganizationMemberById(c.req.param("id"));
  if (!existing) return c.json({ message: "Organization member not found" }, 404);
  const deleted = await storage.removeOrganizationMember(c.req.param("id"));
  if (!deleted) return c.json({ message: "Organization member not found" }, 404);
  const profile = await storage.getUserProfile(existing.userId);
  const authUser = await storage.getAuthUserById(existing.userId);
  const memberEmail = (profile?.email || authUser?.email || "").toString();
  const memberName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || (authUser?.name || "").toString();
  const entityLabel = memberName || memberEmail || existing.userId;
  await audit(c, {
    organizationId: existing.organizationId,
    action: "org_member.delete",
    entityType: "organization_member",
    entityId: existing.id,
    summary: `Deleted org member ${entityLabel}`,
    metadata: { entityLabel, userId: existing.userId, memberName: memberName || null, memberEmail: memberEmail || null },
  });
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
  const db = getDb();
  const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
  const [activeUsersResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userProfiles)
    .where(sql`lower(coalesce(${userProfiles.status}, '')) = 'active'`);
  const [totalSurveysResult] = await db.select({ count: sql<number>`count(*)` }).from(surveysTable);
  const [totalAirSamplesResult] = await db.select({ count: sql<number>`count(*)` }).from(airSamplesTable);
  let databaseSizeBytes = 0;
  try {
    const sizeResult = await db.all(
      sql`select (page_count * page_size) as size from pragma_page_count, pragma_page_size`
    );
    databaseSizeBytes = Number((sizeResult as any)?.[0]?.size ?? 0);
  } catch {
    databaseSizeBytes = 0;
  }
  let dbConnected = true;
  try {
    await c.env.DB.prepare("select 1 as ok").first();
  } catch {
    dbConnected = false;
  }

  let lastBackup: string | null = null;
  if (c.env.ABATEIQ_BACKUPS) {
    try {
      const listed = await c.env.ABATEIQ_BACKUPS.list({ prefix: "d1/", limit: 50 });
      const keys = (listed.objects || []).map((o) => o.key).filter(Boolean).sort().reverse();
      lastBackup = keys[0] || null;
    } catch {
      lastBackup = null;
    }
  }
  return c.json({
    totalUsers: Number(totalUsersResult?.count ?? 0),
    activeUsers: Number(activeUsersResult?.count ?? 0),
    totalSurveys: Number(totalSurveysResult?.count ?? 0),
    totalAirSamples: Number(totalAirSamplesResult?.count ?? 0),
    databaseSize: `${(databaseSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
    databaseSizeBytes,
    systemUptime: formatDurationMs(Date.now() - WORKER_START_MS),
    uptimeScope: "worker_instance",
    lastBackup,
    dbConnected,
  });
});

app.post("/api/admin/backups", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  try {
    const res = await runD1Backup(c.env, "manual");
    if (!res.ok) return c.json({ message: res.message }, 503);
    return c.json({ ok: true, key: res.key }, 201);
  } catch (err: any) {
    return c.json({ message: "Backup failed", error: err?.message || String(err) }, 500);
  }
});

app.get("/api/admin/backups", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  if (!c.env.ABATEIQ_BACKUPS) return c.json({ message: "Backups bucket not configured" }, 503);
  const listed = await c.env.ABATEIQ_BACKUPS.list({ prefix: "d1/", limit: 200 });
  const items = (listed.objects || [])
    .map((o) => ({ key: o.key, uploaded: o.uploaded ? o.uploaded.toISOString() : null, size: o.size }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  return c.json(items);
});

app.get("/api/admin/backups/:key", async (c) => {
  const user = c.get("user");
  const adminEmails = (c.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!isAdminUser(user, adminEmails)) {
    return c.json({ message: "Admin access required" }, 403);
  }
  if (!c.env.ABATEIQ_BACKUPS) return c.json({ message: "Backups bucket not configured" }, 503);
  const rawKey = c.req.param("key");
  const key = rawKey.startsWith("d1/") ? rawKey : `d1/${rawKey}`;
  const object = await c.env.ABATEIQ_BACKUPS.get(key);
  if (!object) return c.json({ message: "Backup not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Content-Type", "application/json");
  headers.set("Content-Disposition", `attachment; filename="${sanitizeFilename(key.replaceAll("/", "_"))}"`);
  return new Response(object.body, { headers });
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
  const db = getDb();
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

app.get("/api/inspectors", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);

  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json([]);

  const requestedOrgId = c.req.query("orgId");
  const orgId = resolveOrgIdForCreate(orgIds, requestedOrgId);
  if (!orgId) return c.json([]);

  const members = await storage.getActiveOrganizationUsers(orgId);
  const inspectors = members.map((m) => {
    const profileName = `${m.firstName || ""} ${m.lastName || ""}`.trim();
    const name = profileName || (m as any).name || m.email || m.userId;
    return {
      userId: m.userId,
      email: m.email,
      name,
      role: m.memberRole,
      status: m.memberStatus,
      createdAt: m.createdAt,
    };
  });
  return c.json(inspectors);
});

app.get("/api/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const requestedOrgId = c.req.query("orgId");
  const orgId = resolveOrgIdForCreate(orgIds, requestedOrgId);
  if (!orgId) return c.json({ message: "No organization access" }, 403);
  const includeInactive = c.req.query("includeInactive") === "1";
  const rows = await storage.getEquipment(orgId, { includeInactive });
  return c.json(rows);
});

app.post("/api/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const organizationId = resolveOrgIdForCreate(orgIds, body.organizationId);
  if (!organizationId) return c.json({ message: "No organization access" }, 403);
  const payload = insertEquipmentRecordSchema.parse({ ...body, organizationId });

  let calibrationDueDate = payload.calibrationDueDate ?? null;
  if (!calibrationDueDate && payload.lastCalibrationDate && payload.calibrationIntervalDays) {
    calibrationDueDate = addDaysToYmd(payload.lastCalibrationDate, payload.calibrationIntervalDays) ?? null;
  }

  const created = await storage.createEquipment({
    organizationId,
    category: payload.category,
    manufacturer: payload.manufacturer ?? null,
    model: payload.model ?? null,
    serialNumber: payload.serialNumber,
    assetTag: payload.assetTag ?? null,
    status: payload.status,
    assignedToUserId: payload.assignedToUserId ?? null,
    location: payload.location ?? null,
    calibrationIntervalDays: payload.calibrationIntervalDays ?? null,
    lastCalibrationDate: payload.lastCalibrationDate ?? null,
    calibrationDueDate,
    active: payload.active ?? true,
  } as any);

  await audit(c, {
    organizationId,
    action: "equipment.create",
    entityType: "equipment",
    entityId: created.equipmentId,
    summary: `Created equipment ${created.category} SN ${created.serialNumber}`,
  });

  return c.json(created, 201);
});

app.get("/api/equipment/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const row = await storage.getEquipmentById(c.req.param("id"));
  if (!row) return c.json({ message: "Not found" }, 404);
  if (!row.organizationId || !orgIds.includes(row.organizationId)) return c.json({ message: "No access" }, 403);
  return c.json(row);
});

app.put("/api/equipment/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getEquipmentById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertEquipmentRecordSchema.partial().parse(body);

  // Re-derive calibration due date if the client didn't provide one and inputs changed.
  let calibrationDueDate = payload.calibrationDueDate ?? undefined;
  if (
    calibrationDueDate === undefined &&
    (payload.lastCalibrationDate !== undefined || payload.calibrationIntervalDays !== undefined)
  ) {
    const last = payload.lastCalibrationDate ?? existing.lastCalibrationDate ?? null;
    const interval = payload.calibrationIntervalDays ?? existing.calibrationIntervalDays ?? null;
    if (last && interval) {
      calibrationDueDate = addDaysToYmd(last, interval) ?? null;
    }
  }

  const patch = stripUndefined({
    category: payload.category ?? undefined,
    manufacturer: payload.manufacturer ?? undefined,
    model: payload.model ?? undefined,
    serialNumber: payload.serialNumber ?? undefined,
    assetTag: payload.assetTag ?? undefined,
    status: payload.status ?? undefined,
    assignedToUserId: payload.assignedToUserId ?? undefined,
    location: payload.location ?? undefined,
    calibrationIntervalDays: payload.calibrationIntervalDays ?? undefined,
    lastCalibrationDate: payload.lastCalibrationDate ?? undefined,
    calibrationDueDate,
    active: payload.active ?? undefined,
  } as any);
  const updated = await storage.updateEquipment(existing.equipmentId, patch as any);
  if (!updated) return c.json({ message: "Not found" }, 404);

  await audit(c, {
    organizationId: existing.organizationId,
    action: "equipment.update",
    entityType: "equipment",
    entityId: existing.equipmentId,
    summary: `Updated equipment ${existing.equipmentId}`,
  });

  return c.json(updated);
});

app.delete("/api/equipment/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getEquipmentById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);
  await storage.softDeleteEquipment(existing.equipmentId);

  await audit(c, {
    organizationId: existing.organizationId,
    action: "equipment.retire",
    entityType: "equipment",
    entityId: existing.equipmentId,
    summary: `Soft-deleted equipment ${existing.equipmentId}`,
  });

  return c.body(null, 204);
});

app.get("/api/equipment/:id/calibration-events", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const rows = await storage.getEquipmentCalibrationEvents(equipment.organizationId, equipment.equipmentId);
  return c.json(rows);
});

app.post("/api/equipment/:id/calibration-events", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);

  const payload = insertEquipmentCalibrationEventSchema.parse({ ...body, equipmentId: equipment.equipmentId });
  const created = await storage.createEquipmentCalibrationEvent({
    organizationId: equipment.organizationId,
    equipmentId: equipment.equipmentId,
    calDate: payload.calDate,
    calType: payload.calType,
    performedBy: payload.performedBy ?? null,
    methodStandard: payload.methodStandard ?? null,
    targetFlowLpm: payload.targetFlowLpm ?? null,
    asFoundFlowLpm: payload.asFoundFlowLpm ?? null,
    asLeftFlowLpm: payload.asLeftFlowLpm ?? null,
    tolerance: payload.tolerance ?? null,
    toleranceUnit: payload.toleranceUnit ?? null,
    passFail: payload.passFail,
    certificateNumber: payload.certificateNumber ?? null,
    certificateFileUrl: payload.certificateFileUrl ?? null,
    notes: payload.notes ?? null,
  } as any);

  // Auto-generate an equipment usage entry when a calibration is recorded (traceability).
  try {
    const ms = ymdToUtcMs(payload.calDate);
    await storage.createEquipmentUsage({
      organizationId: equipment.organizationId,
      equipmentId: equipment.equipmentId,
      jobId: null,
      usedFrom: ms,
      usedTo: ms,
      context: `Calibration (${payload.calType || "annual"})`,
      sampleRunId: `cal:${created.calEventId}`,
    } as any);
  } catch {
    // Best-effort; do not block calibration creation.
  }

  // Keep the equipment's calibration dates up to date (best-effort).
  try {
    let calibrationDueDate: string | null | undefined = undefined;
    if (equipment.calibrationIntervalDays && payload.calDate) {
      calibrationDueDate = addDaysToYmd(payload.calDate, equipment.calibrationIntervalDays) ?? null;
    }
    await storage.updateEquipment(equipment.equipmentId, {
      lastCalibrationDate: payload.calDate,
      calibrationDueDate,
    } as any);
  } catch {
    // ignore
  }

  await audit(c, {
    organizationId: equipment.organizationId,
    action: "equipment.calibration.add",
    entityType: "equipment",
    entityId: equipment.equipmentId,
    summary: `Added calibration event ${payload.calType} (${payload.calDate})`,
  });

  return c.json(created, 201);
});

app.put("/api/equipment-calibration-events/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);

  const existing = await storage.getEquipmentCalibrationEventById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody<any>(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return c.json({ message: "Reason is required" }, 400);
  delete body.reason;

  try {
    const payload = insertEquipmentCalibrationEventSchema.partial().parse(body);
    const patch = stripUndefined({
      calDate: payload.calDate ?? undefined,
      calType: payload.calType ?? undefined,
      performedBy: payload.performedBy ?? undefined,
      methodStandard: payload.methodStandard ?? undefined,
      targetFlowLpm: payload.targetFlowLpm ?? undefined,
      asFoundFlowLpm: payload.asFoundFlowLpm ?? undefined,
      asLeftFlowLpm: payload.asLeftFlowLpm ?? undefined,
      tolerance: payload.tolerance ?? undefined,
      toleranceUnit: payload.toleranceUnit ?? undefined,
      passFail: payload.passFail ?? undefined,
      certificateNumber: payload.certificateNumber ?? undefined,
      certificateFileUrl: payload.certificateFileUrl ?? undefined,
      notes: payload.notes ?? undefined,
    } as any);

    const updated = await storage.updateEquipmentCalibrationEvent(existing.calEventId, patch as any);
    if (!updated) return c.json({ message: "Not found" }, 404);

    const changeKeys = Object.keys(patch || {});
    const changes = computeAuditChanges(existing as any, updated as any, changeKeys);
    const noteText =
      `Calibration record edited (event ${existing.calEventId}).\n` +
      `Reason: ${reason}\n` +
      (changes.length ? `Changes: ${changesSummary(changes)}` : "Changes: (none)");
    await storage.createEquipmentNote({
      organizationId: existing.organizationId,
      equipmentId: existing.equipmentId,
      createdByUserId: userId,
      noteText,
      noteType: "audit",
      visibility: "org",
    } as any);

    // Keep the auto-generated calibration usage record (if any) in sync.
    try {
      const usage = await storage.getEquipmentUsageBySampleRunId(existing.organizationId, `cal:${existing.calEventId}`);
      if (usage) {
        const ms = ymdToUtcMs((updated as any).calDate || "");
        await storage.updateEquipmentUsage(usage.usageId, {
          usedFrom: ms,
          usedTo: ms,
          context: `Calibration (${(updated as any).calType || "annual"})`,
        } as any);
      }
    } catch {
      // ignore
    }

    // Best-effort: recompute last calibration date based on remaining events (handles edits to older records).
    try {
      const events = await storage.getEquipmentCalibrationEvents(existing.organizationId, existing.equipmentId);
      const latest = (events || []).map((e: any) => e.calDate).filter(Boolean).sort().reverse()[0] || null;
      const equipment = await storage.getEquipmentById(existing.equipmentId);
      if (equipment) {
        let calibrationDueDate: string | null | undefined = undefined;
        if (equipment.calibrationIntervalDays && latest) {
          calibrationDueDate = addDaysToYmd(latest, equipment.calibrationIntervalDays) ?? null;
        }
        await storage.updateEquipment(existing.equipmentId, { lastCalibrationDate: latest, calibrationDueDate } as any);
      }
    } catch {
      // ignore
    }

    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/equipment-calibration-events/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);

  const existing = await storage.getEquipmentCalibrationEventById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody<any>(c);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return c.json({ message: "Reason is required" }, 400);

  const ok = await storage.deleteEquipmentCalibrationEvent(existing.calEventId);
  if (!ok) return c.json({ message: "Not found" }, 404);

  // Remove the corresponding auto-generated usage record (if present).
  try {
    const usage = await storage.getEquipmentUsageBySampleRunId(existing.organizationId, `cal:${existing.calEventId}`);
    if (usage) await storage.deleteEquipmentUsage(usage.usageId);
  } catch {
    // ignore
  }

  const noteText =
    `Calibration record deleted (event ${existing.calEventId}).\n` +
    `Reason: ${reason}\n` +
    `Deleted record: ${JSON.stringify(existing)}`;
  await storage.createEquipmentNote({
    organizationId: existing.organizationId,
    equipmentId: existing.equipmentId,
    createdByUserId: userId,
    noteText,
    noteType: "audit",
    visibility: "org",
  } as any);

  // Best-effort: recompute last calibration date after deletion.
  try {
    const events = await storage.getEquipmentCalibrationEvents(existing.organizationId, existing.equipmentId);
    const latest = (events || []).map((e: any) => e.calDate).filter(Boolean).sort().reverse()[0] || null;
    const equipment = await storage.getEquipmentById(existing.equipmentId);
    if (equipment) {
      let calibrationDueDate: string | null | undefined = undefined;
      if (equipment.calibrationIntervalDays && latest) {
        calibrationDueDate = addDaysToYmd(latest, equipment.calibrationIntervalDays) ?? null;
      }
      await storage.updateEquipment(existing.equipmentId, { lastCalibrationDate: latest, calibrationDueDate } as any);
    }
  } catch {
    // ignore
  }

  return c.body(null, 204);
});

app.get("/api/equipment/:id/usage", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const [rows, jobs] = await Promise.all([
    storage.getEquipmentUsage(equipment.organizationId, equipment.equipmentId),
    storage.getAirMonitoringJobs(),
  ]);
  const jobsById = new Map<string, any>();
  for (const job of jobs || []) {
    if (job && job.id && job.organizationId === equipment.organizationId) jobsById.set(job.id, job);
  }
  const enriched = (rows || []).map((u: any) => {
    const job = u.jobId ? jobsById.get(u.jobId) : null;
    return {
      ...u,
      job: job ? { id: job.id, jobNumber: job.jobNumber, jobName: job.jobName } : null,
    };
  });
  return c.json(enriched);
});

app.post("/api/equipment/:id/usage", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);

  const payload = insertEquipmentUsageSchema.parse({ ...body, equipmentId: equipment.equipmentId });
  const created = await storage.createEquipmentUsage({
    organizationId: equipment.organizationId,
    equipmentId: equipment.equipmentId,
    jobId: payload.jobId ?? null,
    usedFrom: payload.usedFrom ?? null,
    usedTo: payload.usedTo ?? null,
    context: payload.context ?? null,
    sampleRunId: payload.sampleRunId ?? null,
  } as any);

  await audit(c, {
    organizationId: equipment.organizationId,
    action: "equipment.usage.add",
    entityType: "equipment",
    entityId: equipment.equipmentId,
    summary: `Added usage record`,
  });

  return c.json(created, 201);
});

app.put("/api/equipment-usage/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getEquipmentUsageById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody<any>(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return c.json({ message: "Reason is required" }, 400);
  delete body.reason;

  try {
    const payload = insertEquipmentUsageSchema.partial().parse(body);
    const patch = stripUndefined({
      jobId: payload.jobId ?? undefined,
      usedFrom: payload.usedFrom instanceof Date ? payload.usedFrom.getTime() : payload.usedFrom ?? undefined,
      usedTo: payload.usedTo instanceof Date ? payload.usedTo.getTime() : payload.usedTo ?? undefined,
      context: payload.context ?? undefined,
      sampleRunId: payload.sampleRunId ?? undefined,
    } as any);
    const updated = await storage.updateEquipmentUsage(existing.usageId, patch as any);
    if (!updated) return c.json({ message: "Not found" }, 404);

    const changes = computeAuditChanges(existing as any, updated as any, Object.keys(patch || {}));
    const noteText =
      `Usage record edited (usage ${existing.usageId}).\n` +
      `Reason: ${reason}\n` +
      (changes.length ? `Changes: ${changesSummary(changes)}` : "Changes: (none)");
    await storage.createEquipmentNote({
      organizationId: existing.organizationId,
      equipmentId: existing.equipmentId,
      createdByUserId: userId,
      noteText,
      noteType: "audit",
      visibility: "org",
    } as any);

    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/equipment-usage/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getEquipmentUsageById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody<any>(c);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return c.json({ message: "Reason is required" }, 400);

  const ok = await storage.deleteEquipmentUsage(existing.usageId);
  if (!ok) return c.json({ message: "Not found" }, 404);

  const noteText =
    `Usage record deleted (usage ${existing.usageId}).\n` +
    `Reason: ${reason}\n` +
    `Deleted record: ${JSON.stringify(existing)}`;
  await storage.createEquipmentNote({
    organizationId: existing.organizationId,
    equipmentId: existing.equipmentId,
    createdByUserId: userId,
    noteText,
    noteType: "audit",
    visibility: "org",
  } as any);

  return c.body(null, 204);
});

app.get("/api/equipment/:id/notes", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const rows = await storage.getEquipmentNotes(equipment.organizationId, equipment.equipmentId);
  return c.json(rows);
});

app.post("/api/equipment/:id/notes", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);

  const payload = insertEquipmentNoteSchema.parse({ ...body, equipmentId: equipment.equipmentId });
  const created = await storage.createEquipmentNote({
    organizationId: equipment.organizationId,
    equipmentId: equipment.equipmentId,
    createdByUserId: userId,
    noteText: payload.noteText,
    noteType: payload.noteType ?? null,
    visibility: payload.visibility,
  } as any);

  await audit(c, {
    organizationId: equipment.organizationId,
    action: "equipment.note.add",
    entityType: "equipment",
    entityId: equipment.equipmentId,
    summary: `Added note`,
  });

  return c.json(created, 201);
});

app.get("/api/equipment/:id/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);
  const docs = await storage.getEquipmentDocuments(equipment.organizationId, equipment.equipmentId);
  return c.json(
    docs.map((doc: any) => ({
      ...doc,
      url: doc.filename ? `/uploads/${doc.filename}` : null,
    }))
  );
});

app.post("/api/equipment/:id/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);

  const form = await c.req.formData();
  const file = form.get("document");
  if (!(file instanceof File)) return c.json({ message: "No file uploaded" }, 400);
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);

  const docType = (form.get("docType") || "").toString().trim() || null;
  const linkedEntityType = (form.get("linkedEntityType") || "").toString().trim() || null;
  const linkedEntityId = (form.get("linkedEntityId") || "").toString().trim() || null;

  const created = await storage.createEquipmentDocument({
    organizationId: equipment.organizationId,
    equipmentId: equipment.equipmentId,
    filename: stored.key,
    originalName: file.name || stored.key,
    mimeType: file.type || "application/octet-stream",
    size: typeof file.size === "number" ? file.size : 0,
    docType,
    uploadedByUserId: userId,
    linkedEntityType,
    linkedEntityId,
  } as any);

  await audit(c, {
    organizationId: equipment.organizationId,
    action: "equipment.document.add",
    entityType: "equipment",
    entityId: equipment.equipmentId,
    summary: `Uploaded document ${file.name || stored.key}`,
  });

  return c.json({ ...created, url: stored.url }, 201);
});

app.delete("/api/equipment-documents/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const doc = await storage.getEquipmentDocument(c.req.param("id"));
  if (!doc) return c.json({ message: "Not found" }, 404);
  if (!doc.organizationId || !orgIds.includes(doc.organizationId)) return c.json({ message: "No access" }, 403);
  await storage.deleteEquipmentDocument(doc.documentId);
  if (doc.filename) {
    try {
      await c.env.ABATEIQ_UPLOADS.delete(doc.filename);
    } catch {
      // ignore
    }
  }
  await audit(c, {
    organizationId: doc.organizationId,
    action: "equipment.document.delete",
    entityType: "equipment_document",
    entityId: doc.documentId,
    summary: `Deleted equipment document ${doc.documentId}`,
  });
  return c.body(null, 204);
});

app.get("/api/equipment/:id/report-data", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const equipment = await storage.getEquipmentById(c.req.param("id"));
  if (!equipment) return c.json({ message: "Not found" }, 404);
  if (!equipment.organizationId || !orgIds.includes(equipment.organizationId)) return c.json({ message: "No access" }, 403);

  const [calibrationEvents, usage, notes, docs, jobs] = await Promise.all([
    storage.getEquipmentCalibrationEvents(equipment.organizationId, equipment.equipmentId),
    storage.getEquipmentUsage(equipment.organizationId, equipment.equipmentId),
    storage.getEquipmentNotes(equipment.organizationId, equipment.equipmentId),
    storage.getEquipmentDocuments(equipment.organizationId, equipment.equipmentId),
    storage.getAirMonitoringJobs(),
  ]);

  const jobsById = new Map<string, any>();
  for (const job of jobs || []) {
    if (job && job.id && job.organizationId === equipment.organizationId) {
      jobsById.set(job.id, job);
    }
  }

  const uniqueAuthorIds = Array.from(
    new Set((notes || []).map((n: any) => n.createdByUserId).filter(Boolean))
  );
  const authorsById = new Map<string, any>();
  await Promise.all(
    uniqueAuthorIds.map(async (id) => {
      try {
        const profile = await storage.getUserProfile(id);
        if (profile) {
          const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
          authorsById.set(id, { name: name || profile.email || id, email: profile.email || null });
        } else {
          authorsById.set(id, { name: id, email: null });
        }
      } catch {
        authorsById.set(id, { name: id, email: null });
      }
    })
  );

  const enrichedUsage = (usage || []).map((u: any) => {
    const job = u.jobId ? jobsById.get(u.jobId) : null;
    return {
      ...u,
      job: job
        ? {
            id: job.id,
            jobName: job.jobName,
            jobNumber: job.jobNumber,
            clientName: job.clientName,
            siteName: job.siteName,
            address: job.address,
          }
        : null,
    };
  });

  const enrichedNotes = (notes || [])
    .slice()
    .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))
    .map((n: any) => {
      const author = n.createdByUserId ? authorsById.get(n.createdByUserId) : null;
      return {
        ...n,
        author: author || { name: n.createdByUserId || "Unknown", email: null },
      };
    });

  const enrichedDocs = (docs || []).map((d: any) => ({
    ...d,
    url: d.filename ? `/uploads/${d.filename}` : null,
  }));

  return c.json({
    equipment,
    reportGeneratedAt: Date.now(),
    calibrationEvents,
    usage: enrichedUsage,
    notes: enrichedNotes,
    documents: enrichedDocs,
  });
});

app.get("/api/surveys", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const search = c.req.query("search");
  const surveys = search ? await storage.searchSurveys(search) : await storage.getSurveys();
  return c.json(surveys.filter((survey) => survey.organizationId && orgIds.includes(survey.organizationId)));
});

app.get("/api/stats", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const allSurveys = await storage.getSurveys();
  const surveys = allSurveys.filter((survey) => survey.organizationId && orgIds.includes(survey.organizationId));
  const observationsBySurvey = await Promise.all(
    surveys.map((survey) => storage.getObservations(survey.id))
  );
  const observations = observationsBySurvey.flat();
  const totalSurveys = surveys.length;
  const pendingReviews = surveys.filter((survey) => survey.status === "in-progress").length;
  const samplesCollected = observations.filter((obs) => obs.sampleCollected).length;
  const activeSites = new Set(surveys.map((s) => s.siteName)).size;
  return c.json({
    totalSurveys,
    pendingReviews,
    samplesCollected,
    activeSites,
  });
});

app.post("/api/surveys", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const organizationId = resolveOrgIdForCreate(orgIds, body.organizationId);
  const payload = insertSurveySchema.parse({ ...body, organizationId });
  const created = await storage.createSurvey(payload);
  await audit(c, {
    organizationId,
    action: "survey.create",
    entityType: "survey",
    entityId: created.id,
    summary: `Created survey ${created.siteName || created.id}`,
  });
  return c.json(created, 201);
});

app.get("/api/surveys/:id", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const result = await assertSurveyOrgAccess(userId, c.req.param("id"));
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  return c.json(result.survey);
});

app.put("/api/surveys/:id", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const result = await assertSurveyOrgAccess(userId, c.req.param("id"));
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertSurveySchema.partial().parse(body);
  const updated = await storage.updateSurvey(c.req.param("id"), payload);
  if (!updated) return c.json({ message: "Survey not found" }, 404);
  return c.json(updated);
});

app.delete("/api/surveys/:id", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const result = await assertSurveyOrgAccess(userId, c.req.param("id"));
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  const orgId = result.survey?.organizationId || null;
  const deleted = await storage.deleteSurvey(c.req.param("id"));
  if (!deleted) return c.json({ message: "Survey not found" }, 404);
  if (orgId) {
    await audit(c, {
      organizationId: orgId,
      action: "survey.delete",
      entityType: "survey",
      entityId: c.req.param("id"),
      summary: `Deleted survey ${c.req.param("id")}`,
    });
  }
  return c.body(null, 204);
});

app.post("/api/surveys/:surveyId/site-photo", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const result = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  const form = await c.req.formData();
  const file = form.get("sitePhoto");
  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  const updated = await storage.updateSurveySitePhoto(c.req.param("surveyId"), stored.url);
  return c.json({
    success: true,
    sitePhotoUrl: updated?.sitePhotoUrl || stored.url,
    message: "Site photo uploaded successfully",
  });
});

app.get("/api/surveys/:id/report", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("id"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const survey = access.survey!;
  const observations = await storage.getObservations(c.req.param("id"));
  const homogeneousAreas = await storage.getHomogeneousAreas(c.req.param("id"));
  const functionalAreas = await storage.getFunctionalAreas(c.req.param("id"));
  const asbestosSamples = await storage.getAsbestosSamples(c.req.param("id"));
  const paintSamples = await storage.getPaintSamples(c.req.param("id"));
  const photosByObservation = await Promise.all(
    observations.map(async (observation) => {
      const photos = await storage.getObservationPhotos(observation.id);
      return {
        observation,
        photos: photos.map((photo) => ({
          ...photo,
          dataUrl: null,
          url: `/uploads/${photo.filename}`,
        })),
      };
    })
  );
  const asbestosLayersBySample = await Promise.all(
    asbestosSamples.map(async (sample) => ({
      sampleId: sample.id,
      layers: await storage.getAsbestosSampleLayers(sample.id),
    }))
  ).then((entries) =>
    entries.reduce((acc, entry) => {
      acc[entry.sampleId] = entry.layers;
      return acc;
    }, {} as Record<string, AsbestosSampleLayer[]>)
  );
  const asbestosPhotosBySample = await Promise.all(
    asbestosSamples.map(async (sample) => {
      const photos = await storage.getAsbestosSamplePhotos(sample.id);
      return {
        sample,
        photos: photos.map((photo) => ({
          ...photo,
          dataUrl: null,
        })),
      };
    })
  );
  const paintPhotosBySample = await Promise.all(
    paintSamples.map(async (sample) => {
      const photos = await storage.getPaintSamplePhotos(sample.id);
      return {
        sample,
        photos: photos.map((photo) => ({
          ...photo,
          dataUrl: null,
        })),
      };
    })
  );
  const baseUrl = new URL(c.req.url).origin;
  const reportHtml = generateSurveyReport(
    survey,
    observations,
    photosByObservation,
    homogeneousAreas,
    functionalAreas,
    asbestosSamples,
    paintSamples,
    asbestosLayersBySample,
    asbestosPhotosBySample,
    paintPhotosBySample,
    baseUrl,
    null
  );
  return new Response(reportHtml, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="${survey.siteName}_report.html"`,
    },
  });
});

app.get("/api/surveys/:surveyId/observations", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const result = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  const observations = await storage.getObservations(c.req.param("surveyId"));
  return c.json(observations);
});

app.post("/api/observations", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const result = await assertSurveyOrgAccess(userId, body.surveyId);
  if (!result.allowed) return c.json({ message: result.notFound ? "Survey not found" : "No access" }, result.notFound ? 404 : 403);
  const payload = insertObservationSchema.parse(body);
  const created = await storage.createObservation(payload);
  return c.json(created, 201);
});

app.put("/api/observations/:id", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const existing = await storage.getObservation(c.req.param("id"));
  if (!existing) return c.json({ message: "Observation not found" }, 404);
  const result = await assertSurveyOrgAccess(userId, existing.surveyId);
  if (!result.allowed) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertObservationSchema.partial().parse(body);
  const updated = await storage.updateObservation(c.req.param("id"), payload);
  return c.json(updated);
});

app.delete("/api/observations/:id", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const existing = await storage.getObservation(c.req.param("id"));
  if (!existing) return c.json({ message: "Observation not found" }, 404);
  const result = await assertSurveyOrgAccess(userId, existing.surveyId);
  if (!result.allowed) return c.json({ message: "No access" }, 403);
  const deleted = await storage.deleteObservation(c.req.param("id"));
  if (!deleted) return c.json({ message: "Observation not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/observations/:id/photos", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const observation = await storage.getObservation(c.req.param("id"));
  if (!observation) return c.json({ message: "Observation not found" }, 404);
  const result = await assertSurveyOrgAccess(userId, observation.surveyId);
  if (!result.allowed) return c.json({ message: "No access" }, 403);
  const photos = await storage.getObservationPhotos(c.req.param("id"));
  return c.json(photos.map((photo) => ({ ...photo, url: `/uploads/${photo.filename}` })));
});

app.post("/api/observations/:id/photos", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const observation = await storage.getObservation(c.req.param("id"));
  if (!observation) return c.json({ message: "Observation not found" }, 404);
  const result = await assertSurveyOrgAccess(userId, observation.surveyId);
  if (!result.allowed) return c.json({ message: "No access" }, 403);
  const form = await c.req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  const created = await storage.createObservationPhoto({
    observationId: c.req.param("id"),
    filename: stored.key,
    originalName: file.name || stored.key,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });
  return c.json({ ...created, url: stored.url }, 201);
});

app.delete("/api/photos/:photoId", async (c) => {
  const user = c.get("user");
  const userId = user?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const photo = await storage.getObservationPhoto(c.req.param("photoId"));
  if (!photo) return c.json({ message: "Photo not found" }, 404);
  const observation = await storage.getObservation(photo.observationId);
  if (!observation) return c.json({ message: "Observation not found" }, 404);
  const result = await assertSurveyOrgAccess(userId, observation.surveyId);
  if (!result.allowed) return c.json({ message: "No access" }, 403);
  await storage.deleteObservationPhoto(c.req.param("photoId"));
  await c.env.ABATEIQ_UPLOADS.delete(photo.filename);
  return c.body(null, 204);
});

app.get("/api/surveys/:surveyId/asbestos-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const samples = await storage.getAsbestosSamples(c.req.param("surveyId"));
  return c.json(samples);
});

app.post("/api/surveys/:surveyId/asbestos-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertAsbestosSampleSchema.parse({ ...body, surveyId: c.req.param("surveyId") });
  const created = await storage.createAsbestosSample(payload);
  return c.json(created, 201);
});

app.put("/api/asbestos-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertAsbestosSampleSchema.partial().parse(body);
  const updated = await storage.updateAsbestosSample(c.req.param("id"), payload);
  return c.json(updated);
});

app.delete("/api/asbestos-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const deleted = await storage.deleteAsbestosSample(c.req.param("id"));
  if (!deleted) return c.json({ message: "Sample not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/asbestos-samples/:id/layers", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const layers = await storage.getAsbestosSampleLayers(c.req.param("id"));
  return c.json(layers);
});

app.put("/api/asbestos-samples/:id/layers", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody<any[]>(c);
  if (!Array.isArray(body)) return c.json({ message: "Invalid JSON" }, 400);
  const payload = body.map((layer, index) =>
    insertAsbestosSampleLayerSchema.parse({ ...layer, sampleId: c.req.param("id"), layerNumber: layer.layerNumber ?? index + 1 })
  );
  const layers = await storage.replaceAsbestosSampleLayers(c.req.param("id"), payload);
  return c.json(layers);
});

app.get("/api/asbestos-samples/:id/photos", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const photos = await storage.getAsbestosSamplePhotos(c.req.param("id"));
  return c.json(photos.map((photo) => ({ ...photo, url: photo.url || (photo.filename ? `/uploads/${photo.filename}` : null) })));
});

app.post("/api/asbestos-samples/:id/photos", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAsbestosSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const form = await c.req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return c.json({ error: "No file provided" }, 400);
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  const created = await storage.createAsbestosSamplePhoto({
    sampleId: c.req.param("id"),
    url: stored.url,
    filename: stored.key,
  });
  return c.json(created, 201);
});

app.delete("/api/asbestos-samples/photos/:photoId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const photo = await storage.getAsbestosSamplePhoto(c.req.param("photoId"));
  if (!photo) return c.json({ message: "Photo not found" }, 404);
  const sample = await storage.getAsbestosSample(photo.sampleId);
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  await storage.deleteAsbestosSamplePhoto(c.req.param("photoId"));
  if (photo.filename) await c.env.ABATEIQ_UPLOADS.delete(photo.filename);
  return c.body(null, 204);
});

app.get("/api/surveys/:surveyId/paint-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const samples = await storage.getPaintSamples(c.req.param("surveyId"));
  return c.json(samples);
});

app.post("/api/surveys/:surveyId/paint-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertPaintSampleSchema.parse({ ...body, surveyId: c.req.param("surveyId") });
  const created = await storage.createPaintSample(payload);
  return c.json(created, 201);
});

app.put("/api/paint-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getPaintSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertPaintSampleSchema.partial().parse(body);
  const updated = await storage.updatePaintSample(c.req.param("id"), payload);
  return c.json(updated);
});

app.delete("/api/paint-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getPaintSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const deleted = await storage.deletePaintSample(c.req.param("id"));
  if (!deleted) return c.json({ message: "Sample not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/paint-samples/:id/photos", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getPaintSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const photos = await storage.getPaintSamplePhotos(c.req.param("id"));
  return c.json(photos.map((photo) => ({ ...photo, url: photo.url || (photo.filename ? `/uploads/${photo.filename}` : null) })));
});

app.post("/api/paint-samples/:id/photos", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getPaintSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const form = await c.req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return c.json({ error: "No file provided" }, 400);
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  const created = await storage.createPaintSamplePhoto({
    sampleId: c.req.param("id"),
    url: stored.url,
    filename: stored.key,
  });
  return c.json(created, 201);
});

app.delete("/api/paint-samples/photos/:photoId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const photo = await storage.getPaintSamplePhoto(c.req.param("photoId"));
  if (!photo) return c.json({ message: "Photo not found" }, 404);
  const sample = await storage.getPaintSample(photo.sampleId);
  if (!sample) return c.json({ message: "Sample not found" }, 404);
  const access = await assertSurveyOrgAccess(userId, sample.surveyId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  await storage.deletePaintSamplePhoto(c.req.param("photoId"));
  if (photo.filename) await c.env.ABATEIQ_UPLOADS.delete(photo.filename);
  return c.body(null, 204);
});

app.get("/api/surveys/:surveyId/homogeneous-areas", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const areas = await storage.getHomogeneousAreas(c.req.param("surveyId"));
  return c.json(areas);
});

app.post("/api/surveys/:surveyId/homogeneous-areas", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  const area = await storage.createHomogeneousArea(c.req.param("surveyId"), body || {});
  return c.json(area, 201);
});

app.delete("/api/surveys/:surveyId/homogeneous-areas/:areaId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const deleted = await storage.deleteHomogeneousArea(c.req.param("surveyId"), c.req.param("areaId"));
  if (!deleted) return c.json({ message: "Area not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/surveys/:surveyId/functional-areas", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const areas = await storage.getFunctionalAreas(c.req.param("surveyId"));
  return c.json(areas);
});

app.post("/api/surveys/:surveyId/functional-areas", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body?.title) return c.json({ message: "Title required" }, 400);
  const area = await storage.createFunctionalArea(c.req.param("surveyId"), body);
  return c.json(area, 201);
});

app.put("/api/surveys/:surveyId/functional-areas/:areaId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const updated = await storage.updateFunctionalArea(c.req.param("surveyId"), c.req.param("areaId"), body);
  if (!updated) return c.json({ message: "Area not found" }, 404);
  return c.json(updated);
});

app.delete("/api/surveys/:surveyId/functional-areas/:areaId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertSurveyOrgAccess(userId, c.req.param("surveyId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Survey not found" : "No access" }, access.notFound ? 404 : 403);
  const deleted = await storage.deleteFunctionalArea(c.req.param("surveyId"), c.req.param("areaId"));
  if (!deleted) return c.json({ message: "Area not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/personnel", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const requestedOrgId = c.req.query("orgId");
  const orgId = resolveOrgIdForCreate(orgIds, requestedOrgId);
  if (!orgId) return c.json({ message: "No organization access" }, 403);
  const includeInactive = c.req.query("includeInactive") === "1";
  const inspectorsOnly = c.req.query("inspectors") === "1";
  const activeOnly = c.req.query("active") === "1";
  const compact = c.req.query("compact") === "1" || inspectorsOnly;
  const search = c.req.query("search");

  const rowsRaw = await storage.getPersonnelForOrg(orgId, { includeInactive, search });
  let rows = rowsRaw;
  if (inspectorsOnly) rows = rows.filter((p: any) => Boolean((p as any).isInspector));
  if (activeOnly) rows = rows.filter((p: any) => Boolean((p as any).active));
  if (compact) return c.json(rows);

  // Lightweight stats for the list view.
  const allExposures = await Promise.all(
    rows.map((p: any) => storage.getExposureRecordsForPerson(orgId, p.personId, {}))
  );
  const payload = rows.map((p: any, idx: number) => {
    const exposures = allExposures[idx] || [];
    const lastExposure = exposures.find((e: any) => e.date) || null;
    const lastFlag = exposures.find((e: any) => e.exceedanceFlag || e.nearMissFlag) || null;
    const jobIds = new Set(exposures.map((e: any) => e.jobId).filter(Boolean));
    return {
      ...p,
      stats: {
        lastJobDate: lastExposure?.date ?? null,
        jobCount: jobIds.size,
        sampleCount: exposures.length,
        lastExposureFlag: lastFlag ? (lastFlag.exceedanceFlag ? "exceedance" : "near_miss") : null,
      },
    };
  });

  return c.json(payload);
});

app.post("/api/personnel", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const organizationId = resolveOrgIdForCreate(orgIds, body.organizationId);
  if (!organizationId) return c.json({ message: "No organization access" }, 403);
  const payload = insertPersonnelSchema.parse(body);
  const created = await storage.createPersonnel(organizationId, userId, payload);
  const createdName = `${created.firstName || ""} ${created.lastName || ""}`.trim() || created.personId;
  await audit(c, {
    organizationId,
    action: "personnel.create",
    entityType: "personnel",
    entityId: created.personId,
    summary: `Created personnel ${createdName}`,
    metadata: { entityLabel: createdName },
  });
  return c.json(created, 201);
});

app.get("/api/personnel/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const person = await storage.getPersonnelById(c.req.param("id"));
  if (!person) return c.json({ message: "Not found" }, 404);
  if (!person.organizationId || !orgIds.includes(person.organizationId)) return c.json({ message: "No access" }, 403);
  return c.json(person);
});

app.put("/api/personnel/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getPersonnelById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertPersonnelSchema.partial().parse(body);
  const updated = await storage.updatePersonnel(existing.personId, userId, payload);
  if (!updated) return c.json({ message: "Not found" }, 404);
  const existingName = `${existing.firstName || ""} ${existing.lastName || ""}`.trim() || existing.personId;
  const changes = computeAuditChanges(existing as any, updated as any, Object.keys(payload as any));
  await audit(c, {
    organizationId: existing.organizationId,
    action: "personnel.update",
    entityType: "personnel",
    entityId: existing.personId,
    summary: changes.length ? `Updated personnel ${existingName}: ${changesSummary(changes)}` : `Updated personnel ${existingName}`,
    metadata: { entityLabel: existingName, changes },
  });
  return c.json(updated);
});

app.post("/api/personnel/:id/deactivate", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getPersonnelById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);
  const updated = await storage.deactivatePersonnel(existing.personId, userId);
  const existingName = `${existing.firstName || ""} ${existing.lastName || ""}`.trim() || existing.personId;
  await audit(c, {
    organizationId: existing.organizationId,
    action: "personnel.deactivate",
    entityType: "personnel",
    entityId: existing.personId,
    summary: `Deactivated personnel ${existingName}`,
  });
  return c.json(updated);
});

app.post("/api/personnel/:id/reactivate", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const existing = await storage.getPersonnelById(c.req.param("id"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if (!existing.organizationId || !orgIds.includes(existing.organizationId)) return c.json({ message: "No access" }, 403);
  const updated = await storage.updatePersonnel(existing.personId, userId, { active: true } as any);
  const existingName = `${existing.firstName || ""} ${existing.lastName || ""}`.trim() || existing.personId;
  await audit(c, {
    organizationId: existing.organizationId,
    action: "personnel.reactivate",
    entityType: "personnel",
    entityId: existing.personId,
    summary: `Reactivated personnel ${existingName}`,
  });
  return c.json(updated);
});

app.get("/api/personnel/:id/assignments", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const person = await storage.getPersonnelById(c.req.param("id"));
  if (!person) return c.json({ message: "Not found" }, 404);
  if (!person.organizationId || !orgIds.includes(person.organizationId)) return c.json({ message: "No access" }, 403);
  const assignments = await storage.getPersonnelAssignments(person.organizationId, person.personId);
  const jobs = await storage.getAirMonitoringJobs();
  const jobsById = new Map<string, any>();
  for (const job of jobs || []) {
    if (job && job.id && job.organizationId === person.organizationId) jobsById.set(job.id, job);
  }
  const enriched = assignments.map((a: any) => ({
    ...a,
    job: jobsById.get(a.jobId) || null,
  }));
  return c.json(enriched);
});

app.post("/api/personnel/:id/assignments", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const person = await storage.getPersonnelById(c.req.param("id"));
  if (!person) return c.json({ message: "Not found" }, 404);
  if (!person.organizationId || !orgIds.includes(person.organizationId)) return c.json({ message: "No access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const payload = insertPersonnelAssignmentSchema.parse({ ...body, personId: person.personId });
  // Ensure job belongs to org (defense in depth)
  const job = await storage.getAirMonitoringJob(payload.jobId);
  if (!job || !job.organizationId || job.organizationId !== person.organizationId) {
    return c.json({ message: "Job not found" }, 404);
  }
  const created = await storage.createPersonnelAssignment(person.organizationId, userId, payload);
  await audit(c, {
    organizationId: person.organizationId,
    action: "personnel.assignment.add",
    entityType: "personnel_assignment",
    entityId: created.assignmentId,
    summary: `Assigned ${person.firstName} ${person.lastName} to job ${job.jobNumber || job.id}`,
  });
  return c.json(created, 201);
});

app.get("/api/personnel/:id/exposures", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const person = await storage.getPersonnelById(c.req.param("id"));
  if (!person) return c.json({ message: "Not found" }, 404);
  if (!person.organizationId || !orgIds.includes(person.organizationId)) return c.json({ message: "No access" }, 403);

  const range = (c.req.query("range") || "12mo").toLowerCase();
  const analyte = c.req.query("analyte");
  const now = new Date();
  let from: number | null = null;
  if (range === "ytd") {
    from = Date.UTC(now.getUTCFullYear(), 0, 1);
  } else if (range === "all") {
    from = null;
  } else {
    // 12 months
    from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate());
  }

  const records = await storage.getExposureRecordsForPerson(person.organizationId, person.personId, { from, analyte: analyte || null });

  // Summary by analyte (max/avg TWA, counts)
  const byAnalyte: Record<string, any> = {};
  for (const r of records) {
    const key = (r.analyte || "unknown").toString();
    const twa = parseNumeric((r as any).twa8hr);
    if (!byAnalyte[key]) {
      byAnalyte[key] = { analyte: key, count: 0, maxTwa: null as number | null, sumTwa: 0, sumCount: 0, exceedances: 0, nearMisses: 0 };
    }
    byAnalyte[key].count += 1;
    if (typeof (r as any).exceedanceFlag === "number" ? (r as any).exceedanceFlag : Boolean((r as any).exceedanceFlag)) byAnalyte[key].exceedances += 1;
    if (typeof (r as any).nearMissFlag === "number" ? (r as any).nearMissFlag : Boolean((r as any).nearMissFlag)) byAnalyte[key].nearMisses += 1;
    if (twa !== null) {
      byAnalyte[key].sumTwa += twa;
      byAnalyte[key].sumCount += 1;
      byAnalyte[key].maxTwa = byAnalyte[key].maxTwa === null ? twa : Math.max(byAnalyte[key].maxTwa, twa);
    }
  }

  const summary = Object.values(byAnalyte).map((row: any) => ({
    analyte: row.analyte,
    count: row.count,
    maxTwa: row.maxTwa,
    avgTwa: row.sumCount ? row.sumTwa / row.sumCount : null,
    exceedances: row.exceedances,
    nearMisses: row.nearMisses,
  }));

  return c.json({ records, summary });
});

app.get("/api/exposure-limits", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const requestedOrgId = c.req.query("orgId");
  const orgId = resolveOrgIdForCreate(orgIds, requestedOrgId);
  if (!orgId) return c.json({ message: "No organization access" }, 403);
  const profileKey = c.req.query("profileKey");
  const rows = await storage.getExposureLimits(orgId, profileKey || null);
  return c.json(rows);
});

app.put("/api/exposure-limits", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const organizationId = resolveOrgIdForCreate(orgIds, body.organizationId);
  if (!organizationId) return c.json({ message: "No organization access" }, 403);
  const payload = upsertExposureLimitSchema.parse(body);
  const row = await storage.upsertExposureLimit(organizationId, payload);
  await audit(c, {
    organizationId,
    action: "exposure_limits.upsert",
    entityType: "exposure_limit",
    entityId: (row as any).limitId,
    summary: `Upserted exposure limit ${payload.profileKey}:${payload.analyte}`,
  });
  return c.json(row);
});

app.get("/api/field-tools/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const items = await storage.getFieldToolsEquipment(userId);
  return c.json(items);
});

app.put("/api/field-tools/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody<any[]>(c);
  if (!Array.isArray(body)) return c.json({ message: "Invalid JSON" }, 400);
  const payload = body.map((item) => insertFieldToolsEquipmentSchema.parse({ ...item, userId }));
  const updated = await storage.replaceFieldToolsEquipment(userId, payload);
  return c.json(updated);
});

app.get("/api/air-monitoring-jobs", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const jobs = await storage.getAirMonitoringJobs();
  return c.json(jobs.filter((job) => job.organizationId && orgIds.includes(job.organizationId)));
});

app.post("/api/air-monitoring-jobs", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const organizationId = resolveOrgIdForCreate(orgIds, body.organizationId);
  try {
    if (typeof body.jobNumber !== "string" || !body.jobNumber.trim()) {
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const suffix = crypto.randomUUID().slice(0, 8);
      body.jobNumber = `AM-${ymd}-${suffix}`;
    }
    const payload = insertAirMonitoringJobSchema.parse({ ...body, organizationId });
    const created = await storage.createAirMonitoringJob(payload);
    await audit(c, {
      organizationId,
      action: "air_job.create",
      entityType: "air_monitoring_job",
      entityId: created.id,
      summary: `Created air monitoring job ${created.jobName || created.id}`,
    });
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.put("/api/air-monitoring-jobs/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("id"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = insertAirMonitoringJobSchema.partial().parse(body);
    const updated = await storage.updateAirMonitoringJob(c.req.param("id"), payload);
    if (!updated) return c.json({ message: "Job not found" }, 404);
    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/air-monitoring-jobs/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("id"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const deleted = await storage.deleteAirMonitoringJob(c.req.param("id"));
  if (!deleted) return c.json({ message: "Job not found" }, 404);
  return c.body(null, 204);
});

app.get("/api/air-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgIds = await getUserOrgIds(userId);
  if (!orgIds.length) return c.json({ message: "No organization access" }, 403);
  const jobs = await storage.getAirMonitoringJobs();
  const allowedJobIds = new Set(
    (jobs || []).filter((j: any) => j?.id && j.organizationId && orgIds.includes(j.organizationId)).map((j: any) => j.id)
  );
  const samples = await storage.getAirSamples();
  return c.json(samples.filter((sample: any) => sample?.jobId && allowedJobIds.has(sample.jobId)));
});

app.post("/api/air-samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const bodyRaw = await parseJsonBody(c);
  if (!bodyRaw) return c.json({ message: "Invalid JSON" }, 400);
  const body = normalizeAirSampleBody(bodyRaw);
  const jobId = typeof (body as any).jobId === "string" ? (body as any).jobId : "";
  if (!jobId) return c.json({ message: "jobId is required" }, 400);
  const access = await assertAirJobOrgAccess(userId, jobId);
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const organizationId = (access as any).job?.organizationId || null;
  if (!organizationId) return c.json({ message: "Job is missing organizationId" }, 400);
  try {
    const payload = insertAirSampleSchema.parse(body);
    const linkedPersonId = (payload as any).personId ? String((payload as any).personId) : "";
    if (linkedPersonId) {
      const person = await storage.getPersonnelById(linkedPersonId);
      if (!person || person.organizationId !== organizationId) {
        return c.json({ message: "Selected personnel not found" }, 404);
      }
    }
    const created = await storage.createAirSample(payload);

	  // Auto-generate equipment usage for the selected pump (traceability).
	  try {
	    const orgId = organizationId;
	    const pumpId = (created as any).pumpId ? String((created as any).pumpId) : "";
	    if (orgId && pumpId) {
	      const equip = await storage.getEquipmentById(pumpId);
	      if (equip && equip.organizationId === orgId) {
	        const sampleRunId = created.id;
	        const existingUsage = await storage.getEquipmentUsageBySampleRunId(orgId, sampleRunId);
	        const usedFrom = typeof (created as any).startTime === "number" ? (created as any).startTime : Number((created as any).startTime);
	        const usedToRaw = (created as any).endTime;
	        const usedTo =
	          typeof usedToRaw === "number"
	            ? usedToRaw
	            : usedToRaw
	              ? Number(usedToRaw)
	              : null;
	        const context = `Air Sample ${((created as any).sampleNumber || "").toString().trim() || created.id}`;
	        if (existingUsage) {
	          await storage.updateEquipmentUsage(existingUsage.usageId, {
	            equipmentId: equip.equipmentId,
	            jobId: created.jobId,
	            usedFrom: Number.isFinite(usedFrom as any) ? usedFrom : null,
	            usedTo: Number.isFinite(usedTo as any) ? usedTo : null,
	            context,
	            sampleRunId,
	          } as any);
	        } else {
	          await storage.createEquipmentUsage({
	            organizationId: orgId,
	            equipmentId: equip.equipmentId,
	            jobId: created.jobId,
	            usedFrom: Number.isFinite(usedFrom as any) ? usedFrom : null,
	            usedTo: Number.isFinite(usedTo as any) ? usedTo : null,
	            context,
	            sampleRunId,
	          } as any);
	        }
	      }
	    }
	  } catch {
	    // best-effort
	  }

		  // Exposure snapshot: store raw inputs + computed outputs (auditable) when personnel is linked.
		  try {
	    const personId = (created as any).personId ? String((created as any).personId) : "";
	    if (personId) {
	      const person = await storage.getPersonnelById(personId);
	      if (person && person.organizationId === organizationId) {
	        // Auto-create a personnel assignment if one doesn't exist for this job.
	        const existing = await storage.getPersonnelAssignmentByPersonJob(organizationId, personId, created.jobId);
	        if (!existing) {
	          const dateMs = (created as any).startTime ? Number((created as any).startTime) : null;
	          const shiftDate = Number.isFinite(dateMs as any) ? new Date(dateMs as any).toISOString().slice(0, 10) : null;
	          await storage.createPersonnelAssignment(organizationId, userId, {
	            personId,
	            jobId: created.jobId,
	            shiftDate,
	            roleOnJob: null,
	            supervisorPersonId: null,
	            supervisorName: null,
	            notes: "Auto-assigned from air sample",
	            dateFrom: undefined,
	            dateTo: undefined,
	          } as any);
	        }

	        const durationMinutes =
	          typeof (created as any).samplingDuration === "number"
	            ? (created as any).samplingDuration
	            : parseNumeric((created as any).samplingDuration);
        const concentration = parseNumeric((created as any).result);
        const twa = computeTwa8hr(concentration, typeof durationMinutes === "number" ? durationMinutes : null);
        const profileKey = (body.profileKey || "OSHA").toString();
        const limitRow = await getExposureLimitFor(organizationId, profileKey, (created as any).analyte || "");
        const flags = computeExposureFlags(twa, limitRow, 0.8);
        const dateMs = (created as any).startTime ? Number((created as any).startTime) : null;
        await storage.upsertExposureFromAirSample({
          organizationId,
          userId,
          airSampleId: created.id,
          jobId: created.jobId,
          personId,
          dateMs: Number.isFinite(dateMs as any) ? dateMs : null,
          analyte: (created as any).analyte || "unknown",
          durationMinutes: typeof durationMinutes === "number" ? durationMinutes : null,
          concentration: concentration === null ? null : concentration.toString(),
          units: (created as any).resultUnit || null,
          method: (created as any).analysisMethod || (created as any).samplingMethod || null,
          sampleType: (created as any).sampleType || null,
          taskActivity: (created as any).fieldNotes || null,
          ppeLevel: null,
          profileKey,
          twa8hr: twa === null ? null : twa.toString(),
          limitType: flags.limitType,
          limitValue: flags.limitValue === null ? null : flags.limitValue.toString(),
          percentOfLimit: flags.percentOfLimit === null ? null : flags.percentOfLimit.toString(),
          exceedanceFlag: flags.exceedanceFlag,
          nearMissFlag: flags.nearMissFlag,
          sourceRefs: {
            airSampleId: created.id,
            labReportFilename: (created as any).labReportFilename || null,
          },
        });
      }
    }
  } catch {
    // Exposure snapshots are best-effort; do not block sample creation if limits/schema drift.
  }

    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.put("/api/air-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAirSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Air sample not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, sample.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const bodyRaw = await parseJsonBody(c);
  if (!bodyRaw) return c.json({ message: "Invalid JSON" }, 400);
  const body = normalizeAirSampleBody(bodyRaw);
  try {
    const payload = insertAirSampleSchema.partial().parse(body);
    const orgId = (access as any).job?.organizationId || null;
    if (orgId && (payload as any)?.personId) {
      const linkedPersonId = String((payload as any).personId);
      const person = await storage.getPersonnelById(linkedPersonId);
      if (!person || person.organizationId !== orgId) {
        return c.json({ message: "Selected personnel not found" }, 404);
      }
    }
    const updated = await storage.updateAirSample(c.req.param("id"), payload);

	  // Auto-generate (or remove) equipment usage for the selected pump.
	  try {
	    const orgId = (access as any).job?.organizationId || null;
	    if (orgId) {
	      const sampleRunId = (updated as any).id;
	      const pumpId = (updated as any).pumpId ? String((updated as any).pumpId) : "";
	      const existingUsage = await storage.getEquipmentUsageBySampleRunId(orgId, sampleRunId);
	      if (!pumpId) {
	        if (existingUsage) {
	          await storage.deleteEquipmentUsage(existingUsage.usageId);
	        }
	      } else {
	        const equip = await storage.getEquipmentById(pumpId);
	        if (equip && equip.organizationId === orgId) {
	          const usedFrom = typeof (updated as any).startTime === "number" ? (updated as any).startTime : Number((updated as any).startTime);
	          const usedToRaw = (updated as any).endTime;
	          const usedTo =
	            typeof usedToRaw === "number"
	              ? usedToRaw
	              : usedToRaw
	                ? Number(usedToRaw)
	                : null;
	          const context = `Air Sample ${(((updated as any).sampleNumber || "") as any).toString?.().trim?.() || sampleRunId}`;
	          if (existingUsage) {
	            await storage.updateEquipmentUsage(existingUsage.usageId, {
	              equipmentId: equip.equipmentId,
	              jobId: (updated as any).jobId,
	              usedFrom: Number.isFinite(usedFrom as any) ? usedFrom : null,
	              usedTo: Number.isFinite(usedTo as any) ? usedTo : null,
	              context,
	              sampleRunId,
	            } as any);
	          } else {
	            await storage.createEquipmentUsage({
	              organizationId: orgId,
	              equipmentId: equip.equipmentId,
	              jobId: (updated as any).jobId,
	              usedFrom: Number.isFinite(usedFrom as any) ? usedFrom : null,
	              usedTo: Number.isFinite(usedTo as any) ? usedTo : null,
	              context,
	              sampleRunId,
	            } as any);
	          }
	        }
	      }
	    }
	  } catch {
	    // best-effort
	  }

		  // Update exposure snapshot if still linked to personnel.
		  try {
	    const orgId = (access as any).job?.organizationId || null;
	    const personId = (updated as any)?.personId ? String((updated as any).personId) : "";
	    if (orgId && personId) {
	      const person = await storage.getPersonnelById(personId);
	      if (person && person.organizationId === orgId) {
	        // Auto-create a personnel assignment if one doesn't exist for this job.
	        const existing = await storage.getPersonnelAssignmentByPersonJob(orgId, personId, updated.jobId);
	        if (!existing) {
	          const dateMs = (updated as any).startTime ? Number((updated as any).startTime) : null;
	          const shiftDate = Number.isFinite(dateMs as any) ? new Date(dateMs as any).toISOString().slice(0, 10) : null;
	          await storage.createPersonnelAssignment(orgId, userId, {
	            personId,
	            jobId: updated.jobId,
	            shiftDate,
	            roleOnJob: null,
	            supervisorPersonId: null,
	            supervisorName: null,
	            notes: "Auto-assigned from air sample",
	            dateFrom: undefined,
	            dateTo: undefined,
	          } as any);
	        }

	        const durationMinutes =
	          typeof (updated as any).samplingDuration === "number"
	            ? (updated as any).samplingDuration
	            : parseNumeric((updated as any).samplingDuration);
        const concentration = parseNumeric((updated as any).result);
        const twa = computeTwa8hr(concentration, typeof durationMinutes === "number" ? durationMinutes : null);
        const profileKey = (body.profileKey || "OSHA").toString();
        const limitRow = await getExposureLimitFor(orgId, profileKey, (updated as any).analyte || "");
        const flags = computeExposureFlags(twa, limitRow, 0.8);
        const dateMs = (updated as any).startTime ? Number((updated as any).startTime) : null;
        await storage.upsertExposureFromAirSample({
          organizationId: orgId,
          userId,
          airSampleId: updated.id,
          jobId: updated.jobId,
          personId,
          dateMs: Number.isFinite(dateMs as any) ? dateMs : null,
          analyte: (updated as any).analyte || "unknown",
          durationMinutes: typeof durationMinutes === "number" ? durationMinutes : null,
          concentration: concentration === null ? null : concentration.toString(),
          units: (updated as any).resultUnit || null,
          method: (updated as any).analysisMethod || (updated as any).samplingMethod || null,
          sampleType: (updated as any).sampleType || null,
          taskActivity: (updated as any).fieldNotes || null,
          ppeLevel: null,
          profileKey,
          twa8hr: twa === null ? null : twa.toString(),
          limitType: flags.limitType,
          limitValue: flags.limitValue === null ? null : flags.limitValue.toString(),
          percentOfLimit: flags.percentOfLimit === null ? null : flags.percentOfLimit.toString(),
          exceedanceFlag: flags.exceedanceFlag,
          nearMissFlag: flags.nearMissFlag,
          sourceRefs: {
            airSampleId: updated.id,
            labReportFilename: (updated as any).labReportFilename || null,
          },
        });
      }
    }
  } catch {
    // best-effort
  }

    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/air-samples/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAirSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Air sample not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, sample.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const deleted = await storage.deleteAirSample(c.req.param("id"));
  if (!deleted) return c.json({ message: "Air sample not found" }, 404);
  return c.body(null, 204);
});

app.post("/api/air-samples/:id/lab-report", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const sample = await storage.getAirSample(c.req.param("id"));
  if (!sample) return c.json({ message: "Air sample not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, sample.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const form = await c.req.formData();
  const file = form.get("labReport");
  if (!(file instanceof File)) return c.json({ message: "No file uploaded" }, 400);
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  const updated = await storage.updateAirSample(c.req.param("id"), {
    labReportFilename: stored.key,
    labReportUploadedAt: new Date(),
  });
  if (!updated) return c.json({ message: "Air sample not found" }, 404);
  return c.json({ labReportFilename: updated.labReportFilename, url: stored.url });
});

app.get("/api/air-monitoring-jobs/:jobId/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("jobId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const docs = await storage.getAirMonitoringDocuments(c.req.param("jobId"));
  return c.json(docs.map((doc) => ({ ...doc, url: doc.filename ? `/uploads/${doc.filename}` : null })));
});

app.post("/api/air-monitoring-jobs/:jobId/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("jobId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const form = await c.req.formData();
  const file = form.get("document");
  if (!(file instanceof File)) return c.json({ message: "No file uploaded" }, 400);
  const documentTypeRaw = form.get("documentType");
  const documentType =
    typeof documentTypeRaw === "string"
      ? documentTypeRaw.trim()
      : documentTypeRaw instanceof File
        ? ""
        : (documentTypeRaw as any)?.toString?.()?.trim?.() || "";
  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file);
  try {
    const payload = insertAirMonitoringDocumentSchema.parse({
      jobId: c.req.param("jobId"),
      documentType: documentType || null,
      filename: stored.key,
      originalName: file.name || stored.key,
      mimeType: file.type || "application/octet-stream",
      size: typeof file.size === "number" ? file.size : 0,
      uploadedBy: userId,
    });
    const created = await storage.createAirMonitoringDocument(payload);
    return c.json({ ...created, url: created.filename ? `/uploads/${created.filename}` : null }, 201);
  } catch (error) {
    // Clean up the stored blob if validation fails.
    try {
      await c.env.ABATEIQ_UPLOADS.delete(stored.key);
    } catch {
      // ignore
    }
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/air-monitoring-documents/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const doc = await storage.getAirMonitoringDocument(c.req.param("id"));
  if (!doc) return c.json({ message: "Document not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, doc.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  await storage.deleteAirMonitoringDocument(c.req.param("id"));
  if (doc.filename) await c.env.ABATEIQ_UPLOADS.delete(doc.filename);
  return c.body(null, 204);
});

app.get("/api/air-monitoring/jobs/:jobId/weather-logs", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("jobId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const logs = await storage.getDailyWeatherLogs(c.req.param("jobId"));
  return c.json(logs);
});

app.post("/api/air-monitoring/jobs/:jobId/weather-logs", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("jobId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const bodyRaw = await parseJsonBody(c);
  if (!bodyRaw) return c.json({ message: "Invalid JSON" }, 400);
  const body = normalizeWeatherLogBody(bodyRaw);
  try {
    const payload = insertDailyWeatherLogSchema.parse({ ...body, jobId: c.req.param("jobId") });
    const created = await storage.createDailyWeatherLog(payload);
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.put("/api/air-monitoring/weather-logs/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const log = await storage.getDailyWeatherLog(c.req.param("id"));
  if (!log) return c.json({ message: "Weather log not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, log.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  const bodyRaw = await parseJsonBody(c);
  if (!bodyRaw) return c.json({ message: "Invalid JSON" }, 400);
  const body = normalizeWeatherLogBody(bodyRaw);
  try {
    const patch = insertDailyWeatherLogSchema.partial().parse(body);
    const updated = await storage.updateDailyWeatherLog(c.req.param("id"), patch as any);
    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/air-monitoring-jobs/:jobId/report", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const access = await assertAirJobOrgAccess(userId, c.req.param("jobId"));
  if (!access.allowed) return c.json({ message: access.notFound ? "Job not found" : "No access" }, access.notFound ? 404 : 403);
  const job = access.job!;
  const samples = await storage.getAirMonitoringJobSamples(job.id);
  const weatherLogs = await storage.getDailyWeatherLogs(job.id);
  const documents = await storage.getAirMonitoringDocuments(job.id);
  const baseUrl = new URL(c.req.url).origin;

  const equipment =
    job.organizationId ? await storage.getEquipment(job.organizationId, { includeInactive: true }) : [];
  const pumpSnById = new Map<string, string>();
  for (const e of equipment as any[]) {
    if (e?.equipmentId) pumpSnById.set(String(e.equipmentId), String(e.serialNumber || ""));
  }

  const orgMembers =
    job.organizationId ? await storage.getOrganizationMembersWithUsers(job.organizationId) : [];
  const userLabelById = new Map<string, string>();
  for (const m of orgMembers as any[]) {
    if (!m?.userId) continue;
    userLabelById.set(String(m.userId), String(m.name || m.email || m.userId));
  }
  const pmRaw = String((job as any).projectManager || "");
  const pmLabel = pmRaw ? userLabelById.get(pmRaw) || pmRaw : "";

  const esc = (s: any) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const sampleRows = samples
    .map((s: any) => {
      const start = s.startTime ? new Date(s.startTime).toLocaleString() : "";
      const end = s.endTime ? new Date(s.endTime).toLocaleString() : "";
      const typeLabel =
        s.sampleType === "other" && s.customSampleType ? toTitleCase(s.customSampleType) : toLabel(s.sampleType);
      const analyteLabel =
        s.analyte === "other" && s.customAnalyte ? toTitleCase(s.customAnalyte) : toLabel(s.analyte);
      const statusLabel = toLabel(s.status);
      const pumpSn = s.pumpId ? (pumpSnById.get(String(s.pumpId)) || "") : "";
      const techRaw = String(s.collectedBy || "");
      const techLabel = userLabelById.get(techRaw) || techRaw;
      const exceeds = Boolean(s.exceedsLimit);
      const rowClass = exceeds ? ` class="row-exceed"` : "";
      return `<tr${rowClass}>
        <td>${esc(s.sampleNumber)}</td>
        <td>${esc(typeLabel)}</td>
        <td>${esc(analyteLabel)}</td>
        <td class="col-location">${esc(s.location)}</td>
        <td>${esc(pumpSn)}</td>
        <td>${esc(techLabel)}</td>
        <td>${esc(s.flowRate)}</td>
        <td>${esc(s.samplingDuration)}</td>
        <td>${esc(start)}${end ? ` - ${esc(end)}` : ""}</td>
        <td>${esc(statusLabel)}</td>
        <td>${esc(s.result)} ${esc(s.resultUnit)}</td>
      </tr>`;
    })
    .join("");

  const weatherRows = weatherLogs
    .map((w: any) => {
      const when = w.logTime ? new Date(w.logTime).toLocaleString() : w.logDate || "";
      return `<tr>
        <td>${esc(when)}</td>
        <td>${esc(toTitleCase(w.weatherConditions))}</td>
        <td>${esc(fmtUnit(w.temperature, "°F"))}</td>
        <td>${esc(fmtUnit(w.humidity, "%"))}</td>
        <td>${esc(fmtUnit(w.windSpeed, "mph"))}</td>
        <td>${esc(w.windDirection)}</td>
        <td>${esc(fmtUnit(w.barometricPressure, "inHg"))}</td>
        <td>${esc(w.notes)}</td>
      </tr>`;
    })
    .join("");

  const docRows = documents
    .map((d: any) => {
      const url = d.filename ? `${baseUrl}/uploads/${d.filename}` : "";
      const when = d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "";
      return `<tr>
        <td>${esc(d.documentType)}</td>
        <td>${esc(d.originalName)}</td>
        <td>${esc(d.mimeType)}</td>
        <td>${esc(d.size)}</td>
        <td>${esc(when)}</td>
        <td>${url ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">Open</a>` : "—"}</td>
      </tr>`;
    })
    .join("");

  const title = `${job.jobNumber || job.id} Air Monitoring Report`;
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${esc(title)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;margin:24px;}
        h1{font-size:20px;margin:0 0 8px 0;}
        .muted{color:#6b7280;font-size:12px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin:12px 0 18px 0;}
        .kv{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;}
        .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;}
        .v{font-size:13px;margin-top:4px;word-break:break-word;}
        table{width:100%;border-collapse:collapse;font-size:12px;table-layout:auto;}
        th,td{border:1px solid #e5e7eb;padding:8px;vertical-align:top;}
        th{background:#f9fafb;text-align:left;font-weight:700;}
        .section{margin-top:18px;}
        .t-samples th,.t-samples td{white-space:nowrap;}
        .t-samples th.col-location,.t-samples td.col-location{white-space:normal;width:100%;}
        .row-exceed td{background:#fee2e2;}
        @media print{
          *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          th{background:#f9fafb !important;}
          .row-exceed td{background:#fee2e2 !important;}
        }
      </style>
    </head>
    <body>
      <h1>${esc(title)}</h1>
      <div class="muted">Generated: ${esc(new Date().toLocaleString())}</div>

      <div class="section">
        <div class="grid">
          <div class="kv"><div class="k">Job Name</div><div class="v">${esc(job.jobName)}</div></div>
          <div class="kv"><div class="k">Site</div><div class="v">${esc(job.siteName)}</div></div>
          <div class="kv"><div class="k">Client</div><div class="v">${esc(job.clientName)}</div></div>
          <div class="kv"><div class="k">Project Manager</div><div class="v">${esc(pmLabel)}</div></div>
          <div class="kv"><div class="k">Status</div><div class="v">${esc(job.status)}</div></div>
          <div class="kv"><div class="k">Work Description</div><div class="v">${esc(job.workDescription)}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>Air Samples</h2>
        <table class="t-samples">
          <thead>
            <tr>
              <th>Sample #</th>
              <th>Type</th>
              <th>Analyte</th>
              <th class="col-location">Location</th>
	              <th>Pump #</th>
	              <th>Technician</th>
	              <th>Flow</th>
	              <th>Minutes</th>
	              <th>Time</th>
	              <th>Status</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>${sampleRows || `<tr><td colspan="11">No samples.</td></tr>`}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>Daily Weather Logs</h2>
        <table>
          <thead>
            <tr>
              <th>When</th><th>Conditions</th><th>Temp</th><th>Humidity</th><th>Wind</th><th>Direction</th><th>Pressure</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>${weatherRows || `<tr><td colspan="8">No weather logs.</td></tr>`}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>Documents</h2>
        <table>
          <thead>
            <tr><th>Type</th><th>Name</th><th>MIME</th><th>Size</th><th>Uploaded</th><th>Link</th></tr>
          </thead>
          <tbody>${docRows || `<tr><td colspan="6">No documents.</td></tr>`}</tbody>
        </table>
      </div>
    </body>
  </html>`;

  const filename = sanitizeFilename(`${job.jobNumber || job.id}_Air_Monitoring_Report.html`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
});

app.delete("/api/air-monitoring/weather-logs/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const log = await storage.getDailyWeatherLog(c.req.param("id"));
  if (!log) return c.json({ message: "Weather log not found" }, 404);
  const access = await assertAirJobOrgAccess(userId, log.jobId);
  if (!access.allowed) return c.json({ message: "No access" }, 403);
  await storage.deleteDailyWeatherLog(c.req.param("id"));
  return c.body(null, 204);
});

app.get("/api/air-monitoring/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const equipment = await storage.getAirMonitoringEquipment();
  return c.json(equipment);
});

app.post("/api/air-monitoring/equipment", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const created = await storage.createAirMonitoringEquipment(body);
  return c.json(created, 201);
});

app.put("/api/air-monitoring/equipment/:id", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const updated = await storage.updateAirMonitoringEquipment(c.req.param("id"), body);
  return c.json(updated);
});

app.get("/api/air-monitoring/quality-control", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const checks = await storage.getQualityControlChecks();
  return c.json(checks);
});

app.post("/api/air-monitoring/quality-control", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const created = await storage.createQualityControlCheck(body);
  return c.json(created, 201);
});

app.get("/api/air-monitoring/pel-alerts", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const alerts = await storage.getPELAlerts();
  return c.json(alerts);
});

app.put("/api/air-monitoring/pel-alerts/:id/acknowledge", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const body = await parseJsonBody(c);
  const updated = await storage.acknowledgePELAlert(c.req.param("id"), "Current User", body?.correctiveActions);
  return c.json(updated);
});

app.get("/api/air-samples/pel-analysis", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const samples = await storage.getAirSamplesWithPELAnalysis();
  return c.json(samples);
});

// ---------------------------------------------------------------------------
// Asbestos Inspections (Client -> Building -> Inventory) + Excel exports
// ---------------------------------------------------------------------------

const asbestosCreateClientSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().min(3),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const asbestosCreateBuildingSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const asbestosCreateInspectionSchema = z.object({
  clientId: z.string().min(1),
  buildingId: z.string().min(1),
  inspectionDate: z.preprocess((v) => coerceDate(v), z.date()),
  inspectors: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "in_progress", "final"]).optional().default("draft"),
  recurrenceYears: z
    .preprocess((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      if (typeof v === "string") return Number(v);
      return v;
    }, z.number().int().min(1).max(5).optional()),
  notes: z.string().optional().nullable(),
});

const asbestosUpdateInventoryItemSchema = z.object({
  inspectionId: z.string().min(1),
  reason: z.string().min(1),
  patch: z.object({
    externalItemId: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    acmStatus: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    quantity: z.string().or(z.number()).optional().nullable(),
    uom: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    active: z.boolean().optional(),
  }),
});

const asbestosCreateInspectionSampleSchema = z.object({
  sampleType: z.enum(["acm", "paint_metals"]),
  itemId: z.string().optional().nullable(),
  sampleNumber: z.string().optional().nullable(),
  collectedAt: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : coerceDate(v)), z.date().optional()),
  material: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  lab: z.string().optional().nullable(),
  tat: z.string().optional().nullable(),
  coc: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  resultUnit: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

app.get("/api/asbestos/clients", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const rows = await storage.getClientsByOrg(orgId);
  return c.json(rows);
});

app.post("/api/asbestos/clients", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosCreateClientSchema.parse(body);
    const created = await storage.createClient({
      organizationId: orgId,
      name: payload.name,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone ?? null,
      address: payload.address ?? null,
      portalAccess: false,
    } as any);
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/asbestos/clients/:clientId/buildings", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const client = await storage.getClientById(c.req.param("clientId"));
  if (!client || (client as any).organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const buildings = await storage.getAsbestosBuildings(orgId, client.id);
  return c.json(buildings);
});

app.post("/api/asbestos/clients/:clientId/buildings", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosCreateBuildingSchema.parse({ ...body, clientId: c.req.param("clientId") });
    const client = await storage.getClientById(payload.clientId);
    if (!client || (client as any).organizationId !== orgId) return c.json({ message: "Not found" }, 404);
    const created = await storage.createAsbestosBuilding({
      organizationId: orgId,
      clientId: payload.clientId,
      name: payload.name,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
      active: true,
    } as any);
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/asbestos/buildings/:buildingId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const client = await storage.getClientById(building.clientId);
  return c.json({ building, client });
});

app.get("/api/asbestos/buildings/:buildingId/inventory", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const items = await storage.getAsbestosInventoryItems(orgId, building.buildingId);
  return c.json(items);
});

app.post("/api/asbestos/buildings/:buildingId/inventory", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const body = await parseJsonBody<any>(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  const created = await storage.createAsbestosInventoryItem({
    organizationId: orgId,
    clientId: building.clientId,
    buildingId: building.buildingId,
    externalItemId: (body.externalItemId || "").toString().trim() || null,
    material: (body.material || "").toString().trim() || null,
    location: (body.location || "").toString().trim() || null,
    category: (body.category || "").toString().trim() || null,
    acmStatus: (body.acmStatus || "").toString().trim() || null,
    condition: (body.condition || "").toString().trim() || null,
    quantity: body.quantity ?? null,
    uom: (body.uom || "").toString().trim() || null,
    status: (body.status || "").toString().trim() || null,
    lastUpdatedAt: new Date(),
    active: body.active === false ? false : true,
  } as any);
  return c.json(created, 201);
});

app.get("/api/asbestos/buildings/:buildingId/inspections", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const rows = await storage.getAsbestosInspections(orgId, building.buildingId);
  return c.json(rows);
});

app.get("/api/asbestos/inspections", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const rows = await storage.getAsbestosInspections(orgId, null);
  const buildings = await storage.getAsbestosBuildings(orgId, null);
  const clients = await storage.getClientsByOrg(orgId);
  const bById = new Map(buildings.map((b) => [b.buildingId, b]));
  const cById = new Map(clients.map((cl) => [cl.id, cl]));
  const enriched = rows.map((ins: any) => {
    const building = bById.get(ins.buildingId) || null;
    const client = building ? (cById.get(building.clientId) || null) : null;
    const nextDue = ins.nextDueDate ? new Date(ins.nextDueDate).getTime() : null;
    return {
      ...ins,
      buildingName: building?.name || "",
      clientName: client?.name || "",
      nextDueMs: nextDue,
      overdue: typeof nextDue === "number" ? nextDue < Date.now() : false,
    };
  });
  enriched.sort((a: any, b: any) => {
    const ad = a.inspectionDate ? new Date(a.inspectionDate).getTime() : 0;
    const bd = b.inspectionDate ? new Date(b.inspectionDate).getTime() : 0;
    return bd - ad;
  });
  return c.json(enriched);
});

app.post("/api/asbestos/buildings/:buildingId/inspections", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosCreateInspectionSchema.parse({
      ...body,
      clientId: building.clientId,
      buildingId: building.buildingId,
    });
    const nextDueDate = payload.recurrenceYears ? addYears(payload.inspectionDate, payload.recurrenceYears) : null;
    const created = await storage.createAsbestosInspection({
      organizationId: orgId,
      clientId: payload.clientId,
      buildingId: payload.buildingId,
      inspectionDate: payload.inspectionDate,
      inspectors: payload.inspectors,
      status: payload.status,
      recurrenceYears: payload.recurrenceYears ?? null,
      nextDueDate,
      notes: payload.notes ?? null,
      createdByUserId: userId,
      updatedByUserId: userId,
    } as any);
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/asbestos/inspections/:inspectionId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const building = await storage.getAsbestosBuildingById(inspection.buildingId);
  const client = building ? await storage.getClientById(building.clientId) : null;
  return c.json({ inspection, building, client });
});

app.put("/api/asbestos/inventory-items/:itemId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const item = await storage.getAsbestosInventoryItemById(c.req.param("itemId"));
  if (!item || item.organizationId !== orgId) return c.json({ message: "Not found" }, 404);

  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosUpdateInventoryItemSchema.parse(body);
    const inspection = await storage.getAsbestosInspectionById(payload.inspectionId);
    if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Inspection not found" }, 404);
    if (inspection.buildingId !== item.buildingId) return c.json({ message: "Invalid inspection for item" }, 400);

    const patch: any = { ...payload.patch, lastUpdatedAt: new Date() };
    if (typeof patch.quantity === "string") {
      const n = Number(patch.quantity);
      patch.quantity = Number.isFinite(n) ? n : null;
    }
    const updated = await storage.updateAsbestosInventoryItem(item.itemId, patch);
    if (!updated) return c.json({ message: "Not found" }, 404);

    const keys = Object.keys(payload.patch || {});
    const changes = computeAuditChanges(item as any, updated as any, keys);
    await Promise.all(
      changes.map((ch) =>
        storage.createAsbestosInspectionInventoryChange({
          organizationId: orgId,
          inspectionId: inspection.inspectionId,
          itemId: item.itemId,
          fieldName: ch.field,
          oldValue: ch.from === null ? null : String(ch.from),
          newValue: ch.to === null ? null : String(ch.to),
          reason: payload.reason,
          createdByUserId: userId,
        } as any)
      )
    );

    // Update last-inspected when an inspection updates inventory.
    try {
      await storage.updateAsbestosInventoryItem(item.itemId, { lastInspectedAt: inspection.inspectionDate } as any);
    } catch {
      // ignore
    }

    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/asbestos/inspections/:inspectionId/changes", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const rows = await storage.getAsbestosInspectionInventoryChanges(orgId, inspection.inspectionId);
  return c.json(rows);
});

app.get("/api/asbestos/inspections/:inspectionId/samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const rows = await storage.getAsbestosInspectionSamples(orgId, inspection.inspectionId);
  return c.json(rows);
});

app.post("/api/asbestos/inspections/:inspectionId/samples", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosCreateInspectionSampleSchema.parse(body);
    const created = await storage.createAsbestosInspectionSample({
      organizationId: orgId,
      inspectionId: inspection.inspectionId,
      sampleType: payload.sampleType,
      itemId: payload.itemId ?? null,
      sampleNumber: payload.sampleNumber ?? null,
      collectedAt: payload.collectedAt ?? null,
      material: payload.material ?? null,
      location: payload.location ?? null,
      lab: payload.lab ?? null,
      tat: payload.tat ?? null,
      coc: payload.coc ?? null,
      result: payload.result ?? null,
      resultUnit: payload.resultUnit ?? null,
      notes: payload.notes ?? null,
      createdByUserId: userId,
    } as any);
    return c.json(created, 201);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.get("/api/asbestos/inspections/:inspectionId/samples/export", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const samples = await storage.getAsbestosInspectionSamples(orgId, inspection.inspectionId);

  const separate = c.req.query("separateSheets") === "1";
  const wb = XLSX.utils.book_new();
  if (separate) {
    const acm = samples.filter((s: any) => s.sampleType === "acm").map((s: any) => ({
      sample_id: s.sampleId,
      inspection_id: s.inspectionId,
      sample_type: s.sampleType,
      item_id: s.itemId || "",
      sample_number: s.sampleNumber || "",
      collected_at: s.collectedAt ? new Date(s.collectedAt).toISOString() : "",
      material: s.material || "",
      location: s.location || "",
      lab: s.lab || "",
      tat: s.tat || "",
      coc: s.coc || "",
      result: s.result || "",
      result_unit: s.resultUnit || "",
      notes: s.notes || "",
    }));
    const pm = samples.filter((s: any) => s.sampleType === "paint_metals").map((s: any) => ({
      sample_id: s.sampleId,
      inspection_id: s.inspectionId,
      sample_type: s.sampleType,
      item_id: s.itemId || "",
      sample_number: s.sampleNumber || "",
      collected_at: s.collectedAt ? new Date(s.collectedAt).toISOString() : "",
      material: s.material || "",
      location: s.location || "",
      lab: s.lab || "",
      tat: s.tat || "",
      coc: s.coc || "",
      result: s.result || "",
      result_unit: s.resultUnit || "",
      notes: s.notes || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acm), "ACM");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pm), "Paint_Metals");
  } else {
    const rows = samples.map((s: any) => ({
      sample_id: s.sampleId,
      inspection_id: s.inspectionId,
      sample_type: s.sampleType,
      item_id: s.itemId || "",
      sample_number: s.sampleNumber || "",
      collected_at: s.collectedAt ? new Date(s.collectedAt).toISOString() : "",
      material: s.material || "",
      location: s.location || "",
      lab: s.lab || "",
      tat: s.tat || "",
      coc: s.coc || "",
      result: s.result || "",
      result_unit: s.resultUnit || "",
      notes: s.notes || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Sample Logs");
  }

  return xlsxResponse(wb, `Inspection_${inspection.inspectionId}_Sample_Logs`);
});

app.put("/api/asbestos/inspection-samples/:sampleId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const existing = await storage.getAsbestosInspectionSampleById(c.req.param("sampleId"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if ((existing as any).organizationId !== orgId) return c.json({ message: "No access" }, 403);

  const body = await parseJsonBody(c);
  if (!body) return c.json({ message: "Invalid JSON" }, 400);
  try {
    const payload = asbestosCreateInspectionSampleSchema.partial().parse(body);
    const updated = await storage.updateAsbestosInspectionSample(c.req.param("sampleId"), {
      ...payload,
    } as any);
    if (!updated) return c.json({ message: "Not found" }, 404);
    return c.json(updated);
  } catch (error) {
    const bad = zodBadRequest(c, error);
    if (bad) return bad;
    throw error;
  }
});

app.delete("/api/asbestos/inspection-samples/:sampleId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const existing = await storage.getAsbestosInspectionSampleById(c.req.param("sampleId"));
  if (!existing) return c.json({ message: "Not found" }, 404);
  if ((existing as any).organizationId !== orgId) return c.json({ message: "No access" }, 403);
  const ok = await storage.deleteAsbestosInspectionSample(existing.sampleId);
  return ok ? c.body(null, 204) : c.json({ message: "Not found" }, 404);
});

app.get("/api/asbestos/inspections/:inspectionId/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const docs = await storage.getAsbestosInspectionDocuments(orgId, inspection.inspectionId);
  return c.json(docs.map((d: any) => ({ ...d, url: d.filename ? `/uploads/${d.filename}` : null })));
});

app.post("/api/asbestos/inspections/:inspectionId/documents", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const form = await c.req.formData();
  const file = form.get("document");
  if (!(file instanceof File)) return c.json({ message: "No file uploaded" }, 400);
  const docType = (form.get("docType") || "").toString().trim() || null;

  const stored = await storeUpload(c.env.ABATEIQ_UPLOADS, file, { prefix: `inspections/${inspection.inspectionId}` });
  try {
    const created = await storage.createAsbestosInspectionDocument({
      organizationId: orgId,
      inspectionId: inspection.inspectionId,
      filename: stored.key,
      originalName: file.name || stored.key,
      mimeType: file.type || "application/octet-stream",
      size: typeof file.size === "number" ? file.size : 0,
      docType,
      uploadedByUserId: userId,
    } as any);
    return c.json({ ...created, url: `/uploads/${created.filename}` }, 201);
  } catch (error) {
    try {
      await c.env.ABATEIQ_UPLOADS.delete(stored.key);
    } catch {
      // ignore
    }
    throw error;
  }
});

app.delete("/api/asbestos/inspection-documents/:documentId", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const doc = await storage.getAsbestosInspectionDocumentById(c.req.param("documentId"));
  if (!doc) return c.json({ message: "Not found" }, 404);
  if ((doc as any).organizationId !== orgId) return c.json({ message: "No access" }, 403);
  await storage.deleteAsbestosInspectionDocument(doc.documentId);
  try {
    if (doc.filename) await c.env.ABATEIQ_UPLOADS.delete(doc.filename);
  } catch {
    // ignore
  }
  return c.body(null, 204);
});

app.get("/api/asbestos/inspections/:inspectionId/report-data", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const building = await storage.getAsbestosBuildingById(inspection.buildingId);
  const client = building ? await storage.getClientById(building.clientId) : null;
  const [inventory, changes, samples, docs] = await Promise.all([
    building ? storage.getAsbestosInventoryItems(orgId, building.buildingId) : Promise.resolve([]),
    storage.getAsbestosInspectionInventoryChanges(orgId, inspection.inspectionId),
    storage.getAsbestosInspectionSamples(orgId, inspection.inspectionId),
    storage.getAsbestosInspectionDocuments(orgId, inspection.inspectionId),
  ]);
  return c.json({
    inspection,
    building,
    client,
    inventory,
    changes,
    samples,
    documents: docs.map((d: any) => ({ ...d, url: d.filename ? `/uploads/${d.filename}` : null })),
    generatedAt: new Date().toISOString(),
  });
});

app.get("/api/asbestos/inspections/:inspectionId/export", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const inspection = await storage.getAsbestosInspectionById(c.req.param("inspectionId"));
  if (!inspection || inspection.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const building = await storage.getAsbestosBuildingById(inspection.buildingId);
  const client = building ? await storage.getClientById(building.clientId) : null;
  const [inventory, changes, samples, docs] = await Promise.all([
    building ? storage.getAsbestosInventoryItems(orgId, building.buildingId) : Promise.resolve([]),
    storage.getAsbestosInspectionInventoryChanges(orgId, inspection.inspectionId),
    storage.getAsbestosInspectionSamples(orgId, inspection.inspectionId),
    storage.getAsbestosInspectionDocuments(orgId, inspection.inspectionId),
  ]);

  const wb = XLSX.utils.book_new();

  const summaryRows = [
    {
      inspection_id: inspection.inspectionId,
      client_id: inspection.clientId,
      client_name: client?.name || "",
      building_id: inspection.buildingId,
      building_name: building?.name || "",
      inspection_date: inspection.inspectionDate ? new Date(inspection.inspectionDate).toISOString() : "",
      inspectors: Array.isArray((inspection as any).inspectors) ? (inspection as any).inspectors.join(",") : "",
      status: inspection.status,
      recurrence_years: inspection.recurrenceYears ?? "",
      next_due_date: inspection.nextDueDate ? new Date(inspection.nextDueDate).toISOString() : "",
      generated_at: new Date().toISOString(),
    },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Inspection Summary");

  const invRows = (inventory || []).map((i: any) => ({
    client: client?.name || "",
    building: building?.name || "",
    item_id: i.itemId,
    external_item_id: i.externalItemId || "",
    material: i.material || "",
    location: i.location || "",
    category: i.category || "",
    acm_pacm: i.acmStatus || "",
    condition: i.condition || "",
    quantity: i.quantity ?? "",
    uom: i.uom || "",
    status: i.status || "",
    last_inspected: i.lastInspectedAt ? new Date(i.lastInspectedAt).toISOString() : "",
    last_updated: i.lastUpdatedAt ? new Date(i.lastUpdatedAt).toISOString() : "",
    active: i.active ? "true" : "false",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), "Inventory Snapshot");

  const changeRows = (changes || []).map((ch: any) => ({
    change_id: ch.changeId,
    inspection_id: ch.inspectionId,
    item_id: ch.itemId || "",
    field: ch.fieldName,
    old_value: ch.oldValue ?? "",
    new_value: ch.newValue ?? "",
    reason: ch.reason ?? "",
    user_id: ch.createdByUserId ?? "",
    created_at: ch.createdAt ? new Date(ch.createdAt).toISOString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(changeRows), "Inventory Changes");

  const sampleRows = (samples || []).map((s: any) => ({
    sample_id: s.sampleId,
    inspection_id: s.inspectionId,
    sample_type: s.sampleType,
    item_id: s.itemId || "",
    sample_number: s.sampleNumber || "",
    collected_at: s.collectedAt ? new Date(s.collectedAt).toISOString() : "",
    material: s.material || "",
    location: s.location || "",
    lab: s.lab || "",
    tat: s.tat || "",
    coc: s.coc || "",
    result: s.result || "",
    result_unit: s.resultUnit || "",
    notes: s.notes || "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleRows), "Sample Logs");

  const docRows = (docs || []).map((d: any) => ({
    document_id: d.documentId,
    inspection_id: d.inspectionId,
    doc_type: d.docType || "",
    original_name: d.originalName || "",
    filename: d.filename || "",
    mime_type: d.mimeType || "",
    size: d.size ?? "",
    uploaded_at: d.uploadedAt ? new Date(d.uploadedAt).toISOString() : "",
    url: d.filename ? `/uploads/${d.filename}` : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docRows), "Documents Index");

  const fnameBase = `${(client?.name || "Client").replace(/\s+/g, "_")}_${(building?.name || "Building").replace(/\s+/g, "_")}_Inspection_${inspection.inspectionId}`;
  return xlsxResponse(wb, fnameBase);
});

app.get("/api/asbestos/buildings/:buildingId/inventory/export", async (c) => {
  const userId = c.get("user")?.sub;
  if (!userId) return c.json({ message: "Not authenticated" }, 401);
  const orgId = await getOrgIdForUserOrThrow(userId);
  const building = await storage.getAsbestosBuildingById(c.req.param("buildingId"));
  if (!building || building.organizationId !== orgId) return c.json({ message: "Not found" }, 404);
  const client = await storage.getClientById(building.clientId);
  const items = await storage.getAsbestosInventoryItems(orgId, building.buildingId);

  const wb = XLSX.utils.book_new();
  const rows = (items || []).map((i: any) => ({
    client: client?.name || "",
    building: building.name,
    item_id: i.itemId,
    external_item_id: i.externalItemId || "",
    material: i.material || "",
    location: i.location || "",
    category: i.category || "",
    acm_pacm: i.acmStatus || "",
    condition: i.condition || "",
    quantity: i.quantity ?? "",
    uom: i.uom || "",
    status: i.status || "",
    last_inspected: i.lastInspectedAt ? new Date(i.lastInspectedAt).toISOString() : "",
    last_updated: i.lastUpdatedAt ? new Date(i.lastUpdatedAt).toISOString() : "",
    active: i.active ? "true" : "false",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Inventory");
  const fnameBase = `${(client?.name || "Client").replace(/\s+/g, "_")}_${building.name.replace(/\s+/g, "_")}_Inventory`;
  return xlsxResponse(wb, fnameBase);
});

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.notFound();
  }

  let assetResponse: Response;
  try {
    assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`Internal Server Error (assets): ${message}`, 500);
  }

  const url = new URL(c.req.url);
  const indexRequest = new Request(new URL("/", url), c.req.raw);
  try {
    return await c.env.ASSETS.fetch(indexRequest);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`Internal Server Error (index): ${message}`, 500);
  }
});

const D1_BACKUP_TABLES = [
  "organizations",
  "organization_members",
  "user_profiles",
  "auth_users",
  "auth_sessions",
  "audit_log",
  "surveys",
  "observations",
  "observation_photos",
  "asbestos_samples",
  "asbestos_sample_layers",
  "asbestos_sample_photos",
  "paint_samples",
  "paint_sample_photos",
  "personnel_profiles",
  "personnel",
  "personnel_job_assignments",
  "exposure_limits",
  "exposure_records",
  "air_monitoring_jobs",
  "air_samples",
  "air_monitoring_documents",
  "daily_weather_logs",
  "equipment",
  "equipment_calibration_events",
  "equipment_usage",
  "equipment_notes",
  "equipment_documents",
  "field_tools_equipment",
  // These are used by older routes/features; include them to avoid partial backups.
  "report_templates",
  "clients",
  "messages",
  "notifications",
  "chain_of_custody",
  "compliance_rules",
  "compliance_tracking",
  "collaboration_sessions",
  "collaboration_changes",
] as const;

const backupD1LogicalToR2 = async (env: any) => {
  if (!env?.DB || !env?.ABATEIQ_BACKUPS) return;
  setD1Database(env.DB);

  const now = new Date();
  const ymd = now.toISOString().slice(0, 10);
  const runId = now.toISOString().replace(/[:.]/g, "-");
  const prefix = `d1/logical/${ymd}/${runId}`;
  const pageSize = 500;

  const manifest: any = {
    generatedAt: now.toISOString(),
    scope: "d1_logical",
    pageSize,
    tables: [] as Array<{ table: string; pages: number; rows: number }>,
  };

  for (const table of D1_BACKUP_TABLES) {
    let offset = 0;
    let page = 0;
    let total = 0;
    try {
      for (;;) {
        // Table name is from a fixed whitelist above; safe to interpolate.
        const res = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`)
          .bind(pageSize, offset)
          .all();
        const rows = (res as any)?.results || [];
        if (!rows.length) break;

        const key = `${prefix}/${table}/page_${String(page).padStart(4, "0")}.json`;
        await env.ABATEIQ_BACKUPS.put(
          key,
          JSON.stringify({
            table,
            page,
            offset,
            pageSize,
            generatedAt: now.toISOString(),
            rows,
          }),
          { httpMetadata: { contentType: "application/json" } }
        );

        total += rows.length;
        if (rows.length < pageSize) break;
        offset += pageSize;
        page += 1;
      }
      manifest.tables.push({ table, pages: total ? page + 1 : 0, rows: total });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      manifest.tables.push({ table, pages: 0, rows: 0, error: msg });
      // Continue backing up other tables.
      continue;
    }
  }

  await env.ABATEIQ_BACKUPS.put(`${prefix}/manifest.json`, JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
  });
  await env.ABATEIQ_BACKUPS.put(`d1/logical/${ymd}/latest.json`, JSON.stringify({ prefix, generatedAt: now.toISOString() }), {
    httpMetadata: { contentType: "application/json" },
  });
};

export default {
  fetch: app.fetch,
  scheduled: (event: any, env: any, ctx: any) => {
    // Daily logical backups are best-effort: failures should not break scheduled delivery.
    ctx.waitUntil(
      backupD1LogicalToR2(env).catch((err: any) => {
        // Cloudflare scheduled events surface console errors in logs.
        console.error("backupD1LogicalToR2 failed", event?.cron, err);
      })
    );
  },
};
