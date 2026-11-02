export type Role = "user" | "assistant" | "system";

export interface Attachment {
  name: string;
  text: string;
  kind: "text" | "pdf" | "image";
}

export interface BuildFile {
  name: string;
  content: string;
  language?: string;
}

export interface BuildResult {
  files: BuildFile[];
  previewHtml: string;
  prompt: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  images?: string[]; // data URLs (base64)
  attachments?: Attachment[];
  build?: BuildResult;
  error?: boolean;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  builtSite?: BuildResult;
  createdAt: number;
  updatedAt: number;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: number;
}

export type LanguagePref = "auto" | "en" | "ur";

export interface Settings {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  userName: string;
  language: LanguagePref;
  aboutMe: string;
  theme: "dark" | "light";
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  userName: "",
  language: "auto",
  aboutMe: "",
  theme: "dark",
};
