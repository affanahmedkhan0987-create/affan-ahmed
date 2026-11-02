"use client";

import { useNova } from "@/lib/store";

export default function ThemeToggle() {
  const { settings, setSettings } = useNova();
  const isDark = settings.theme === "dark";
  return (
    <button
      className="nova-icon-btn"
      title={isDark ? "Switch to light" : "Switch to dark"}
      onClick={() => setSettings({ ...settings, theme: isDark ? "light" : "dark" })}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
