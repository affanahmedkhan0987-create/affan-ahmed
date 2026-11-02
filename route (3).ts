import { db, isDbConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "Not configured";
  let key = "Local";

  if (isDbConfigured && db) {
    try {
      await db.execute(sql`select 1`);
      database = "Connected";
      try {
        const rows = (await db.execute(
          sql`select count(*)::int as c from settings where api_key is not null and api_key <> ''`,
        )) as unknown as { rows: { c: number }[] };
        key = rows.rows?.[0]?.c > 0 ? "Configured" : "Missing";
      } catch {
        // settings table may not exist yet
        key = "Unknown";
      }
    } catch {
      database = "Error";
    }
  }

  return Response.json({
    status: "ok",
    app: "Nova AI",
    database,
    key,
    dbConfigured: isDbConfigured,
    timestamp: new Date().toISOString(),
  });
}
