import { db, isDbConfigured } from "@/db";
import { memories as memoriesTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const deviceId = new URL(req.url).searchParams.get("deviceId") || "";
  if (!deviceId) return Response.json({ dbConfigured: true, memories: [] });
  const rows = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.deviceId, deviceId))
    .orderBy(desc(memoriesTable.createdAt));
  return Response.json({ dbConfigured: true, memories: rows });
}

export async function POST(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const body = (await req.json().catch(() => ({}))) as {
    deviceId?: string;
    content?: string;
  };
  if (!body.deviceId || !body.content)
    return Response.json({ dbConfigured: true, error: "deviceId and content required" }, { status: 400 });
  const [row] = await db
    .insert(memoriesTable)
    .values({ deviceId: body.deviceId, content: body.content })
    .returning();
  return Response.json({ dbConfigured: true, memory: row });
}

export async function DELETE(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const deviceId = new URL(req.url).searchParams.get("deviceId") || "";
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!deviceId || !id)
    return Response.json({ dbConfigured: true, error: "deviceId and id required" }, { status: 400 });
  await db.delete(memoriesTable).where(eq(memoriesTable.id, Number(id)));
  return Response.json({ dbConfigured: true, ok: true });
}
