import { streamChat } from "@/lib/server/upstream";

export const dynamic = "force-dynamic";

interface ChatBody {
  systemPrompt?: string;
  messages: { role: string; content: unknown }[];
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { systemPrompt, messages, model, baseUrl, apiKey } = body;

  if (!apiKey) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message:
                "No API key found. Add your own key in Settings (⚙) to start chatting with Nova.",
            })}\n\n`,
          ),
        );
        c.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        c.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages are required" }, { status: 400 });
  }

  return streamChat({
    baseUrl: baseUrl || "https://api.openai.com/v1",
    apiKey,
    model: model || "gpt-4o-mini",
    systemPrompt: systemPrompt || "You are Nova, a helpful assistant.",
    messages,
  });
}
