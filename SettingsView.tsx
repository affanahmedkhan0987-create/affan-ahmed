"use client";

import { useState } from "react";
import { useNova } from "@/lib/store";
import type { LanguagePref } from "@/lib/types";
import InstallButton from "./InstallButton";

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

export default function SettingsView() {
  const nova = useNova();
  const { settings, setSettings, dbConfigured } = nova;
  const [provider, setProvider] = useState(settings.provider);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [name, setName] = useState(settings.userName);
  const [language, setLanguage] = useState<LanguagePref>(settings.language);
  const [aboutMe, setAboutMe] = useState(settings.aboutMe);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const keyStatus = apiKey ? "Working" : "Missing";

  const save = () => {
    setSettings({
      ...settings,
      provider,
      baseUrl,
      apiKey,
      model,
      userName: name,
      language,
      aboutMe,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const testKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey, model }),
      });
      const data = await res.json();
      setTestResult({
        ok: Boolean(data.ok),
        message: data.ok ? "Working — key accepted by the provider." : data.error || "Failed",
      });
    } catch (e) {
      setTestResult({ ok: false, message: "Could not reach Nova's test endpoint." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="nova-page">
      <h1 className="nova-page-title">Settings</h1>

      <section className="nova-card">
        <h2>API Keys</h2>
        <p className="nova-muted">
          Nova uses your own OpenAI-compatible key. It is stored {dbConfigured ? "in your database" : "in this browser"} and never shown in the page source. Status:{" "}
          <strong className={keyStatus === "Working" ? "ok-text" : "warn-text"}>{keyStatus}</strong>
        </p>

        <label>Provider name</label>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="OpenAI" />

        <label>Base URL</label>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />

        <label>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
        {apiKey && (
          <p className="nova-muted small">Saved as: {maskKey(apiKey)}</p>
        )}

        <label>Model name</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />

        <div className="nova-row-gap">
          <button className="nova-btn-sm primary" onClick={testKey} disabled={testing || !apiKey}>
            {testing ? "Testing…" : "Test Key"}
          </button>
          <button className="nova-btn-sm" onClick={save}>
            Save
          </button>
          {savedFlash && <span className="ok-text">Saved ✓</span>}
        </div>

        {testResult && (
          <div className={`nova-test-result ${testResult.ok ? "ok" : "bad"}`}>
            <strong>{testResult.ok ? "Working" : "Failed"}</strong> — {testResult.message}
          </div>
        )}
      </section>

      <section className="nova-card">
        <h2>Profile</h2>
        <label>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
        <label>Preferred language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value as LanguagePref)}>
          <option value="auto">Auto (match the user)</option>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </select>
        <label>About me</label>
        <textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Anything you'd like Nova to remember about you (optional)."
          rows={3}
        />
        <button className="nova-btn-sm" onClick={save}>
          Save profile
        </button>
      </section>

      <section className="nova-card">
        <h2>Database</h2>
        {dbConfigured ? (
          <p className="ok-text">
            ● Connected — chats, memories and keys are saved in your database and survive redeploys.
          </p>
        ) : (
          <p className="warn-text">
            ● Not configured — Nova is running in local mode (browser storage). Everything works; to
            persist across devices/redeploys, set a <code>DATABASE_URL</code> (e.g. Neon/Supabase) in
            the environment and redeploy.
          </p>
        )}
      </section>

      <section className="nova-card">
        <h2>Appearance</h2>
        <div className="nova-row-gap">
          <button
            className="nova-btn-sm"
            onClick={() => setSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" })}
          >
            Toggle {settings.theme === "dark" ? "Light" : "Dark"} theme
          </button>
        </div>
      </section>

      <section className="nova-card">
        <h2>Install Nova</h2>
        <p className="nova-muted">
          Install Nova on your phone or computer for a full-screen app experience.
        </p>
        <InstallButton />
        <p className="nova-muted small">
          On Android Chrome you'll see “Install app” in the menu. On iPhone, tap Share → “Add to Home
          Screen”.
        </p>
      </section>
    </div>
  );
}
