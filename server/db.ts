import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";

neonConfig.fetchConnectionCache = true;

let cachedDb: ReturnType<typeof drizzle> | null = null;

const getDatabaseUrl = () => {
  const globalUrl = (globalThis as { DATABASE_URL?: string }).DATABASE_URL;
  if (globalUrl) return globalUrl;
  if (typeof process !== "undefined") {
    return process.env?.DATABASE_URL;
  }
  return undefined;
};

export const getDb = () => {
  if (cachedDb) return cachedDb;
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
};
