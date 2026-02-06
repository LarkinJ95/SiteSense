import { drizzle } from "drizzle-orm/d1";
import * as schema from "@shared/schema";

type D1Database = any;

let cachedDb: ReturnType<typeof drizzle> | null = null;

const getD1 = () => (globalThis as { D1_DATABASE?: D1Database }).D1_DATABASE;

export const setD1Database = (db: D1Database) => {
  (globalThis as { D1_DATABASE?: D1Database }).D1_DATABASE = db;
  cachedDb = null;
};

export const getDb = () => {
  if (cachedDb) return cachedDb;
  const d1 = getD1();
  if (!d1) {
    throw new Error("D1 database is not configured. Did you bind it in wrangler.toml?");
  }
  cachedDb = drizzle(d1, { schema });
  return cachedDb;
};
