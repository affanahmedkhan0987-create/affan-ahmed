import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Zero-config rule: the app MUST build and run with NO environment variables.
// If DATABASE_URL is not provided we run in "local mode" (browser storage).
export const isDbConfigured = Boolean(process.env.DATABASE_URL);

const globalForDb = globalThis as typeof globalThis & {
  __novaPool?: Pool;
};

let pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

if (isDbConfigured) {
  pool =
    globalForDb.__novaPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__novaPool = pool;
  }

  _db = drizzle(pool);
}

export const db = _db;
