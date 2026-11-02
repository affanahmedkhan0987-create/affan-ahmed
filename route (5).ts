import { db, isDbConfigured } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isDbConfigured || !db) {
    return Response.json({ dbConfigured: false });
  }
  const deviceId = new URL(req.url).searchParams.get("deviceId") || "";
  if (!deviceId) return Response.json({ dbConfigured: true, settings: null });
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.deviceId, deviceId));
  return Response.json({ dbConfigured: true, settings: rows[0] ?? null });
}

export async function POST(req: Request) {
  if (!isDbConfigured || !db) {
    return Response.json({ dbConfigured: false });
  }
  const body = (await req.json().catch(() => ({}))) as {
    deviceId?: string;
    settings?: Record<string, unknown>;
  };
  const deviceId = body.deviceId || "";
  if (!deviceId) return Response.json({ dbConfigured: true, error: "deviceId required" }, { status: 400 });

  const payload = {
    deviceId,
    provider: String(body.settings?.provider ?? "OpenAI"),
    baseUrl: String(body.settings?.baseUrl ?? "https://api.openai.com/v1"),
    apiKey: body.settings?.apiKey ? String(body.settings.apiKey) : null,
    model: String(body.settings?.model ?? "gpt-4o-mini"),
    userName: body.settings?.userName ? String(body.settings.userName) : null,
    language: String(body.settings?.language ?? "auto"),
    aboutMe: body.settings?.aboutMe ? String(body.settings.aboutMe) : null,
    theme: String(body.settings?.theme ?? "dark"),
    updatedAt: new Date(),
  };

  await db
    .insert(settingsTable)
    .values(payload)
    .onConflictDoUpdate({ target: settingsTable.deviceId, set: payload });

  return Response.json({ dbConfigured: true, ok: true });
}
