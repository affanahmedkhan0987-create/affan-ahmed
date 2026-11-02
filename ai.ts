import type { Settings, Memory } from "./types";

/** Detect whether a string is predominantly Arabic/Urdu script (RTL). */
export function isRTL(text: string): boolean {
  if (!text) return false;
  const rtl = (text.match(/[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return rtl > latin;
}

/** Heuristically decide the language to reply in. */
export function detectLanguage(text: string): "ur" | "en" {
  return isRTL(text) ? "ur" : "en";
}

/** Decide if a prompt is asking Nova to build a website / web app. */
export function isBuildRequest(text: string): boolean {
  const t = text.toLowerCase();
  const signals = [
    "build",
    "create a website",
    "create a web app",
    "landing page",
    "make a website",
    "make a web",
    "html page",
    "web page",
    "web app",
    "website for",
    "site for",
    "webpage",
    "single page",
  ];
  return signals.some((s) => t.includes(s));
}

/** Decide if a prompt is an edit to an existing built site. */
export function isBuildEditRequest(text: string, hasSite: boolean): boolean {
  if (!hasSite) return false;
  const t = text.toLowerCase();
  const signals = [
    "change",
    "make the",
    "update",
    "edit",
    "add a",
    "remove",
    "color",
    "colour",
    "bigger",
    "smaller",
    "move",
    "style",
    "font",
    "background",
    "button",
    "heading",
    "red",
    "blue",
    "green",
  ];
  return signals.some((s) => t.includes(s));
}

/** Build the system prompt with profile + language + memories. */
export function buildSystemPrompt(settings: Settings, memories: Memory[]): string {
  const lang =
    settings.language === "ur"
      ? "Urdu"
      : settings.language === "en"
        ? "English"
        : "the same language and script the user writes in (Urdu script for Urdu, Roman Urdu for Roman Urdu, English for English)";

  const nameLine = settings.userName ? `The user's name is ${settings.userName}.` : "";
  const aboutLine = settings.aboutMe ? `About the user: ${settings.aboutMe}` : "";
  const memoryLines =
    memories.length > 0
      ? `\n\nThings you remember about the user (use them when relevant):\n- ${memories
          .map((m) => m.content)
          .join("\n- ")}`
      : "";

  return `You are Nova, a friendly, concise personal AI assistant.
Always reply in ${lang}.
${nameLine}${aboutLine}${memoryLines}
When the user asks you to remember something, briefly confirm and note it. Otherwise just answer.
Use clear Markdown: headings, lists, tables, and fenced code blocks when helpful.`;
}

/** Extract HTML / files from a model response that may contain code fences. */
export function extractBuildOutput(raw: string): {
  files: { name: string; content: string; language?: string }[];
  previewHtml: string;
} {
  const files: { name: string; content: string; language?: string }[] = [];

  // Match fenced code blocks, optionally with a filename like ```html:index.html
  const fenceRe = /```([a-zA-Z0-9#+_-]*)\s*(?:[:|]\s*([^\n]+))?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(raw)) !== null) {
    const lang = (match[1] || "").toLowerCase();
    const filenameHint = (match[2] || "").trim();
    const content = match[3].replace(/\n$/, "");
    if (lang === "html" || lang === "" || /\.html?$/.test(filenameHint) || !lang) {
      const name = filenameHint || (files.length === 0 ? "index.html" : `file-${files.length + 1}.html`);
      files.push({ name, content, language: "html" });
    }
  }

  // Fallback: if nothing matched but there's <html>, treat the whole thing as HTML.
  if (files.length === 0) {
    const htmlMatch = raw.match(/<(!DOCTYPE|html)[\s\S]*<\/html>/i);
    if (htmlMatch) {
      files.push({ name: "index.html", content: htmlMatch[0], language: "html" });
    }
  }

  const previewHtml =
    files.find((f) => f.name === "index.html")?.content ||
    files[0]?.content ||
    "<html><body><p>No HTML was generated.</p></body></html>";

  return { files, previewHtml };
}

export const BUILD_SYSTEM_PROMPT = `You are Nova's web-building mode. The user wants a website or web app.
Return a single, complete, self-contained HTML file inside one fenced code block marked \`\`\`html.
The HTML must include inline <style> and any needed <script>. Make it modern, responsive, and good-looking.
Do not explain the code outside the code block. Only output the code block.`;

export function buildEditSystemPrompt(existingHtml: string): string {
  return `You are editing an existing HTML website. Here is the current full HTML:

\`\`\`html
${existingHtml}
\`\`\`

Apply the user's requested change and return the COMPLETE updated HTML file inside one fenced code block marked \`\`\`html.
Do not explain. Only output the code block.`;
}
