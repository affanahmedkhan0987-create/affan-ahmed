import { db, isDbConfigured } from "@/db";
import { chats as chatsTable, messages as messagesTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const deviceId = new URL(req.url).searchParams.get("deviceId") || "";
  if (!deviceId) return Response.json({ dbConfigured: true, chats: [] });
  const chatRows = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.deviceId, deviceId))
    .orderBy(desc(chatsTable.updatedAt));
  const msgRows = await db.select().from(messagesTable).where(eq(messagesTable.deviceId, deviceId));
  const byChat = new Map<string, typeof msgRows>();
  for (const m of msgRows) {
    if (!byChat.has(m.chatId)) byChat.set(m.chatId, []);
    byChat.get(m.chatId)!.push(m);
  }
  const chats = chatRows.map((c) => ({
    ...c,
    messages: (byChat.get(c.id) || []).sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
    ),
  }));
  return Response.json({ dbConfigured: true, chats });
}

export async function POST(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const body = (await req.json().catch(() => ({}))) as {
    deviceId?: string;
    chat?: { id: string; title: string };
    messages?: { id: string; role: string; content: string; createdAt: string }[];
  };
  if (!body.deviceId || !body.chat)
    return Response.json({ dbConfigured: true, error: "deviceId and chat required" }, { status: 400 });

  await db
    .insert(chatsTable)
    .values({
      id: body.chat.id,
      deviceId: body.deviceId,
      title: body.chat.title,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({ target: chatsTable.id, set: { title: body.chat.title, updatedAt: new Date() } });

  if (Array.isArray(body.messages)) {
    await db.delete(messagesTable).where(eq(messagesTable.chatId, body.chat.id));
    if (body.messages.length > 0) {
      await db.insert(messagesTable).values(
        body.messages.map((m) => ({
          id: m.id,
          chatId: body.chat!.id,
          deviceId: body.deviceId!,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.createdAt),
        })),
      );
    }
  }
  return Response.json({ dbConfigured: true, ok: true });
}

export async function DELETE(req: Request) {
  if (!isDbConfigured || !db) return Response.json({ dbConfigured: false });
  const deviceId = new URL(req.url).searchParams.get("deviceId") || "";
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!deviceId || !id)
    return Response.json({ dbConfigured: true, error: "deviceId and id required" }, { status: 400 });
  await db.delete(messagesTable).where(eq(messagesTable.chatId, id));
  await db.delete(chatsTable).where(eq(chatsTable.id, id));
  return Response.json({ dbConfigured: true, ok: true });
}
