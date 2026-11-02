"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type Attachment,
  type BuildResult,
  type Chat,
  type ChatMessage,
  type Memory,
  type Settings,
} from "./types";
import { storage, getDeviceId } from "./storage";
import {
  buildSystemPrompt,
  isBuildEditRequest,
  isBuildRequest,
} from "./ai";

interface NovaState {
  hydrated: boolean;
  dbConfigured: boolean;
  settings: Settings;
  memories: Memory[];
  chats: Chat[];
  currentChatId: string | null;
  streaming: boolean;
}

interface NovaActions {
  setSettings: (s: Settings) => void;
  resetSettings: () => void;
  addMemory: (content: string) => void;
  deleteMemory: (id: string) => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  sendMessage: (
    text: string,
    opts?: { images?: string[]; attachments?: Attachment[] },
  ) => Promise<void>;
  regenerate: () => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  stopStreaming: () => void;
  currentChat: () => Chat | undefined;
}

type NovaContextValue = NovaState & NovaActions;

const NovaContext = createContext<NovaContextValue | null>(null);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();

export function NovaProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string>("");
  const deviceIdRef = useRef<string>("");
  const [state, setState] = useState<NovaState>({
    hydrated: false,
    dbConfigured: false,
    settings: DEFAULT_SETTINGS,
    memories: [],
    chats: [],
    currentChatId: null,
    streaming: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  // ---- persistence helpers ----
  const persist = useCallback((next: Partial<NovaState>) => {
    setState((prev) => {
      const merged = { ...prev, ...next };
      if (next.settings) storage.setSettings(merged.settings);
      if (next.memories) storage.setMemories(merged.memories);
      if (next.chats) storage.setChats(merged.chats);
      if (next.settings?.theme) storage.setTheme(merged.settings.theme);
      return merged;
    });
  }, []);

  // Best-effort DB sync (only when DATABASE_URL is configured)
  const syncSettings = useCallback(
    (s: Settings) => {
      if (!state.dbConfigured) return;
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceIdRef.current, settings: s }),
      }).catch(() => {});
    },
    [state.dbConfigured],
  );

  const syncMemories = useCallback(() => {
    if (!state.dbConfigured) return;
    fetch(`/api/memories?deviceId=${deviceIdRef.current}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.dbConfigured && Array.isArray(d.memories)) {
          const mapped: Memory[] = d.memories.map((m: { id: number; content: string; createdAt: string }) => ({
            id: String(m.id),
            content: m.content,
            createdAt: new Date(m.createdAt).getTime(),
          }));
          // only adopt server memories we don't already have (avoid dupes on hydrate)
          setState((prev) => {
            const known = new Set(prev.memories.map((x) => x.content));
            const extra = mapped.filter((m) => !known.has(m.content));
            if (extra.length === 0) return prev;
            const merged = [...prev.memories, ...extra].sort((a, b) => a.createdAt - b.createdAt);
            storage.setMemories(merged);
            return { ...prev, memories: merged };
          });
        }
      })
      .catch(() => {});
  }, [state.dbConfigured]);

  const syncChat = useCallback(
    (chat: Chat) => {
      if (!state.dbConfigured) return;
      fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          chat: { id: chat.id, title: chat.title },
          messages: chat.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt).toISOString(),
          })),
        }),
      }).catch(() => {});
    },
    [state.dbConfigured],
  );

  // ---- initial hydration ----
  useEffect(() => {
    const s = storage.getSettings();
    const m = storage.getMemories();
    const c = storage.getChats();
    const theme = storage.getTheme();
    const id = getDeviceId();
    deviceIdRef.current = id;
    setDeviceId(id);
    setState((prev) => ({
      ...prev,
      settings: { ...s, theme: theme || s.theme },
      memories: m,
      chats: c,
      currentChatId: c[0]?.id ?? null,
      hydrated: true,
    }));

    // Determine DB configuration + optionally hydrate from DB
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        const dbConfigured: boolean = Boolean(d?.dbConfigured);
        setState((prev) => ({ ...prev, dbConfigured }));
        if (dbConfigured) {
          Promise.all([
            fetch(`/api/settings?deviceId=${deviceIdRef.current}`).then((r) => r.json()),
            fetch(`/api/chats?deviceId=${deviceIdRef.current}`).then((r) => r.json()),
          ])
            .then(([setRes, chatRes]) => {
              const updates: Partial<NovaState> = {};
              if (setRes?.settings) {
                const sv = setRes.settings;
                updates.settings = {
                  provider: sv.provider || "OpenAI",
                  baseUrl: sv.baseUrl || "https://api.openai.com/v1",
                  apiKey: sv.apiKey || "",
                  model: sv.model || "gpt-4o-mini",
                  userName: sv.user_name || "",
                  language: sv.language || "auto",
                  aboutMe: sv.about_me || "",
                  theme: sv.theme || "dark",
                };
              }
              if (chatRes?.chats?.length) {
                const mapped: Chat[] = chatRes.chats.map((c: any) => ({
                  id: c.id,
                  title: c.title,
                  messages: (c.messages || []).map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    createdAt: new Date(m.createdAt || Date.now()).getTime(),
                  })),
                  builtSite: undefined,
                  createdAt: new Date(c.createdAt || Date.now()).getTime(),
                  updatedAt: new Date(c.updatedAt || Date.now()).getTime(),
                }));
                updates.chats = mapped;
                updates.currentChatId = mapped[0]?.id ?? null;
              }
              if (Object.keys(updates).length) {
                setState((prev) => {
                  const merged = { ...prev, ...updates };
                  if (updates.settings) storage.setSettings(merged.settings);
                  if (updates.chats) storage.setChats(merged.chats);
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // ---- theme application ----
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", state.settings.theme === "dark");
    root.style.colorScheme = state.settings.theme;
  }, [state.settings.theme]);

  // ---- chat helpers ----
  const currentChat = useCallback(
    () => state.chats.find((c) => c.id === state.currentChatId),
    [state.chats, state.currentChatId],
  );

  const ensureChat = useCallback((): Chat => {
    let chat = state.chats.find((c) => c.id === state.currentChatId);
    if (chat) return chat;
    const id = uid();
    const newChat: Chat = { id, title: "New chat", messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setState((prev) => ({
      ...prev,
      chats: [newChat, ...prev.chats],
      currentChatId: id,
    }));
    return newChat;
  }, [state.chats, state.currentChatId]);

  const updateChat = useCallback((chatId: string, updater: (c: Chat) => Chat) => {
    setState((prev) => {
      const chats = prev.chats.map((c) => (c.id === chatId ? updater(c) : c));
      storage.setChats(chats);
      return { ...prev, chats };
    });
  }, []);

  const pushMessage = useCallback(
    (chatId: string, msg: ChatMessage) => {
      updateChat(chatId, (c) => ({
        ...c,
        messages: [...c.messages, msg],
        title: c.messages.length === 0 ? msg.content.slice(0, 40).trim() || "New chat" : c.title,
        updatedAt: Date.now(),
      }));
    },
    [updateChat],
  );

  const patchMessage = useCallback(
    (chatId: string, msgId: string, patch: Partial<ChatMessage>) => {
      updateChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
        updatedAt: Date.now(),
      }));
    },
    [updateChat],
  );

  // ---- send message ----
  const sendMessage: NovaActions["sendMessage"] = useCallback(
    async (text, opts = {}) => {
      const trimmed = text.trim();
      if (!trimmed || state.streaming) return;

      const chat = ensureChat();
      const chatId = chat.id;
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        images: opts.images,
        attachments: opts.attachments,
        createdAt: Date.now(),
      };
      pushMessage(chatId, userMsg);

      const assistantId = uid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      pushMessage(chatId, assistantMsg);

      const hasSite = Boolean(chat.builtSite);
      const wantBuild = isBuildRequest(trimmed) || isBuildEditRequest(trimmed, hasSite);

      setState((prev) => ({ ...prev, streaming: true }));
      const controller = new AbortController();
      abortRef.current = controller;
      let full = "";

      try {
        if (wantBuild) {
          const res = await fetch("/api/build", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: trimmed,
              existingHtml: hasSite ? chat.builtSite!.previewHtml : undefined,
              model: state.settings.model,
              baseUrl: state.settings.baseUrl,
              apiKey: state.settings.apiKey,
            }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            patchMessage(chatId, assistantId, {
              content: data?.error || "I couldn't build that right now. Please try again.",
              error: true,
            });
          } else {
            const build: BuildResult = {
              files: data.files || [],
              previewHtml: data.previewHtml || "",
              prompt: trimmed,
              createdAt: Date.now(),
            };
            patchMessage(chatId, assistantId, {
              content: "Here is your website. You can preview it below and download it.",
              build,
            });
            updateChat(chatId, (c) => ({ ...c, builtSite: build }));
          }
        } else {
          // Build OpenAI messages
          const systemPrompt = buildSystemPrompt(state.settings, state.memories);
          const history = chat.messages; // user message already included
          const messages: { role: string; content: unknown }[] = history.map((m) => {
            if (m.role === "user") {
              const parts: unknown[] = [];
              let textContent = m.content;
              if (m.attachments?.length) {
                textContent +=
                  "\n\n" +
                  m.attachments
                    .map((a) => `--- Attached file: ${a.name} ---\n${a.text}`)
                    .join("\n\n");
              }
              if (textContent) parts.push({ type: "text", text: textContent });
              for (const img of m.images || []) {
                parts.push({ type: "image_url", image_url: { url: img } });
              }
              return { role: "user", content: parts.length === 1 ? parts[0] : parts };
            }
            return { role: m.role, content: m.content };
          });

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemPrompt,
              messages,
              model: state.settings.model,
              baseUrl: state.settings.baseUrl,
              apiKey: state.settings.apiKey,
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const errText = await res.text().catch(() => "");
            patchMessage(chatId, assistantId, {
              content: errText || "I couldn't reach the server. Please try again.",
              error: true,
            });
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                if (json.type === "delta") {
                  full += json.text;
                  patchMessage(chatId, assistantId, { content: full });
                } else if (json.type === "error") {
                  patchMessage(chatId, assistantId, { content: json.message, error: true });
                }
              } catch {
                /* ignore */
              }
            }
          }
          if (!full) {
            patchMessage(chatId, assistantId, {
              content: "I didn't get a response. Please try again.",
              error: true,
            });
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          patchMessage(chatId, assistantId, { content: full || "_(stopped)_" });
        } else {
          patchMessage(chatId, assistantId, {
            content: "Something went wrong while generating a response.",
            error: true,
          });
        }
      } finally {
        const finalChat = state.chats.find((c) => c.id === chatId);
        if (finalChat) syncChat(finalChat);
        setState((prev) => ({ ...prev, streaming: false }));
        abortRef.current = null;
      }
    },
    [state.settings, state.memories, state.chats, state.streaming, ensureChat, pushMessage, patchMessage, updateChat, syncChat],
  );

  const regenerate = useCallback(async () => {
    const chat = currentChat();
    if (!chat || state.streaming) return;
    // remove last assistant message, then re-send the previous user message
    const lastUser = [...chat.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Drop trailing assistant messages, then re-send the last user message.
    updateChat(chat.id, (c) => {
      const idx = c.messages.map((m) => m.role).lastIndexOf("assistant");
      return { ...c, messages: idx >= 0 ? c.messages.slice(0, idx) : c.messages };
    });
    await sendMessage(lastUser.content, {
      images: lastUser.images,
      attachments: lastUser.attachments,
    });
  }, [currentChat, state.streaming, updateChat, sendMessage]);

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      const chat = currentChat();
      if (!chat) return;
      const idx = chat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      // keep messages up to and including this user message, drop the rest
      updateChat(chat.id, (c) => ({ ...c, messages: c.messages.slice(0, idx + 1) }));
      await sendMessage(text, { images: chat.messages[idx].images, attachments: chat.messages[idx].attachments });
    },
    [currentChat, updateChat, sendMessage],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ---- settings / memories / chat list actions ----
  const setSettings = useCallback(
    (s: Settings) => {
      persist({ settings: s });
      syncSettings(s);
    },
    [persist, syncSettings],
  );

  const resetSettings = useCallback(() => {
    persist({ settings: DEFAULT_SETTINGS });
    syncSettings(DEFAULT_SETTINGS);
  }, [persist, syncSettings]);

  const addMemory = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const mem: Memory = { id: uid(), content: trimmed, createdAt: Date.now() };
      setState((prev) => {
        const memories = [...prev.memories, mem];
        storage.setMemories(memories);
        if (prev.dbConfigured) {
          fetch("/api/memories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: deviceIdRef.current, content: trimmed }),
          }).catch(() => {});
        }
        return { ...prev, memories };
      });
    },
    [],
  );

  const deleteMemory = useCallback((id: string) => {
    setState((prev) => {
      const memories = prev.memories.filter((m) => m.id !== id);
      storage.setMemories(memories);
      if (prev.dbConfigured) {
        fetch(`/api/memories?deviceId=${deviceIdRef.current}&id=${id}`, { method: "DELETE" }).catch(() => {});
      }
      return { ...prev, memories };
    });
  }, []);

  const newChat = useCallback(() => {
    setState((prev) => ({ ...prev, currentChatId: null }));
  }, []);

  const selectChat = useCallback((id: string) => {
    setState((prev) => ({ ...prev, currentChatId: id }));
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setState((prev) => {
        const chats = prev.chats.filter((c) => c.id !== id);
        storage.setChats(chats);
        const currentChatId = prev.currentChatId === id ? (chats[0]?.id ?? null) : prev.currentChatId;
        if (prev.dbConfigured) {
          fetch(`/api/chats?deviceId=${deviceIdRef.current}&id=${id}`, { method: "DELETE" }).catch(() => {});
        }
        return { ...prev, chats, currentChatId };
      });
    },
    [],
  );

  const renameChat = useCallback(
    (id: string, title: string) => {
      updateChat(id, (c) => ({ ...c, title: title.trim() || c.title }));
      const chat = state.chats.find((c) => c.id === id);
      if (chat) syncChat(chat);
    },
    [updateChat, state.chats, syncChat],
  );

  // sync memories from server once db is known
  useEffect(() => {
    if (state.dbConfigured) syncMemories();
  }, [state.dbConfigured, syncMemories]);

  const value: NovaContextValue = {
    ...state,
    setSettings,
    resetSettings,
    addMemory,
    deleteMemory,
    newChat,
    selectChat,
    deleteChat,
    renameChat,
    sendMessage,
    regenerate,
    editMessage,
    stopStreaming,
    currentChat,
  };

  return <NovaContext.Provider value={value}>{children}</NovaContext.Provider>;
}

export function useNova(): NovaContextValue {
  const ctx = useContext(NovaContext);
  if (!ctx) throw new Error("useNova must be used within NovaProvider");
  return ctx;
}
