import { completeChat } from "@/lib/server/upstream";

export const dynamic = "force-dynamic";

interface TestBody {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export async function POST(req: Request) {
  let body: TestBody;
  try {
    body = (await req.json()) as TestBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { baseUrl, apiKey, model } = body;
  if (!apiKey) {
    return Response.json({ ok: false, error: "No API key provided." }, { status: 400 });
  }

  try {
    const text = await completeChat({
      baseUrl: baseUrl || "https://api.openai.com/v1",
      apiKey,
      model: model || "gpt-4o-mini",
      systemPrompt: "You are a test assistant. Reply with exactly one word.",
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      temperature: 0,
    });
    return Response.json({ ok: true, sample: text.slice(0, 60) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ ok: false, error: message });
  }
}
