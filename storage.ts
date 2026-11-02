import { DEFAULT_SETTINGS, type Settings } from "./types";

const PREFIX = "nova:";

export function getDeviceId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "";
  let id = localStorage.getItem(PREFIX + "deviceId");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "dev-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(PREFIX + "deviceId", id);
  }
  return id;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export const storage = {
  getSettings: () => read<Settings>("settings", DEFAULT_SETTINGS),
  setSettings: (s: Settings) => write("settings", s),
  getChats: () => read<import("./types").Chat[]>("chats", []),
  setChats: (c: import("./types").Chat[]) => write("chats", c),
  getMemories: () => read<import("./types").Memory[]>("memories", []),
  setMemories: (m: import("./types").Memory[]) => write("memories", m),
  getTheme: () => read<"dark" | "light">("theme", "dark"),
  setTheme: (t: "dark" | "light") => write("theme", t),
};
