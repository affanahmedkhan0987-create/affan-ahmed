export interface ChatCallArgs {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: { role: string; content: unknown }[];
  temperature?: number;
}

function completionsUrl(baseUrl: string): string {
  return `${String(baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
}

export function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/** Turn an upstream HTTP error into a friendly, non-crashing message. */
export function friendlyUpstreamError(status: number, text: string): string {
  const lower = text.toLowerCase();
  if (status === 401)
    return "Your API key was rejected (401 Unauthorized). Please check it in Settings.";
  if (status === 403)
    return "Access forbidden (403). Your API key may not have permission for this model.";
  if (status === 404)
    return "Model not found (404). Check the model name in Settings.";
  if (status === 429)
    return "Rate limited (429). Please wait a moment and try again.";
  if (lower.includes("image") || lower.includes("vision"))
    return "This model can't read images. Switch to a vision-capable model (e.g. gpt-4o) in Settings to chat about photos.";
  if (status >= 400)
    return `The API returned an error (${status}). ${text.slice(0, 300)}`;
  return "Something went wrong talking to the model.";
}

/** Stream a chat completion, emitting our own SSE: data: {type:"delta"|"done"|"error", ...} */
export async function streamChat(args: ChatCallArgs): Promise<Response> {
  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  let upstream: Response;
  try {
    upstream = await fetch(completionsUrl(args.baseUrl), {
      method: "POST",
      headers: authHeaders(args.apiKey),
      body: JSON.stringify({
        model: args.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: args.systemPrompt || "You are Nova, a helpful assistant." },
          ...args.messages,
        ],
        stream: true,
        temperature: args.temperature ?? 0.7,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown network error";
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(send({ type: "error", message: `Could not reach the API: ${msg}` }));
          c.enqueue(send({ type: "done" }));
          c.close();
        },
      }),
      { headers: sseHeaders() },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    const message = friendlyUpstreamError(upstream.status, text);
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(send({ type: "error", message }));
          c.enqueue(send({ type: "done" }));
          c.close();
        },
      }),
      { headers: sseHeaders() },
    );
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta: string = json.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(send({ type: "delta", text: delta }));
            } catch {
              /* ignore keep-alive / non-JSON lines */
            }
          }
        }
        controller.enqueue(send({ type: "done" }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream interrupted";
        controller.enqueue(send({ type: "error", message: `Stream interrupted: ${msg}` }));
        controller.enqueue(send({ type: "done" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: sseHeaders() });
}

/** One-shot (non-streaming) completion, returns the full text. */
export async function completeChat(args: ChatCallArgs): Promise<string> {
  const res = await fetch(completionsUrl(args.baseUrl), {
    method: "POST",
    headers: authHeaders(args.apiKey),
    body: JSON.stringify({
      model: args.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: args.systemPrompt || "You are Nova, a helpful assistant." },
        ...args.messages,
      ],
      stream: false,
      temperature: args.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(friendlyUpstreamError(res.status, text));
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

/** Read a streaming SSE response from our own /api/chat and collect the text. */
export async function consumeStream(
  res: Response,
  onDelta: (text: string) => void,
): Promise<{ text: string; error?: string }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  let error: string | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        if (json.type === "delta") {
          full += json.text;
          onDelta(json.text);
        } else if (json.type === "error") {
          error = json.message;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { text: full, error };
}
