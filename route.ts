import { completeChat } from "@/lib/server/upstream";
import {
  BUILD_SYSTEM_PROMPT,
  buildEditSystemPrompt,
  extractBuildOutput,
} from "@/lib/ai";

export const dynamic = "force-dynamic";

interface BuildBody {
  prompt: string;
  existingHtml?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

export async function POST(req: Request) {
  let body: BuildBody;
  try {
    body = (await req.json()) as BuildBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, existingHtml, model, baseUrl, apiKey } = body;

  if (!apiKey) {
    return Response.json(
      { error: "No API key found. Add your key in Settings to build websites." },
      { status: 400 },
    );
  }
  if (!prompt) {
    return Response.json({ error: "A prompt is required" }, { status: 400 });
  }

  const systemPrompt = existingHtml
    ? buildEditSystemPrompt(existingHtml)
    : BUILD_SYSTEM_PROMPT;

  try {
    const raw = await completeChat({
      baseUrl: baseUrl || "https://api.openai.com/v1",
      apiKey,
      model: model || "gpt-4o-mini",
      systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const { files, previewHtml } = extractBuildOutput(raw);
    return Response.json({ files, previewHtml, prompt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build the website.";
    return Response.json({ error: message }, { status: 502 });
  }
}
