"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useNova } from "@/lib/store";
import MessageItem from "./MessageItem";
import Composer from "./Composer";

const STARTERS = [
  { label: "Write a poem in Urdu", icon: "🪶" },
  { label: "Explain this photo", icon: "🖼️" },
  { label: "Build me a landing page", icon: "⚡" },
  { label: "Remember that my name is Alex", icon: "🧠" },
  { label: "What can you do?", icon: "✨" },
  { label: "Help me plan my week", icon: "🗓️" },
];

export default function ChatView() {
  const nova = useNova();
  const chat = nova.currentChat();
  const messages = chat?.messages ?? [];
  const endRef = useRef<HTMLDivElement>(null);
  const hasKey = Boolean(nova.settings.apiKey);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, nova.streaming]);

  return (
    <div className="nova-chat">
      <div className="nova-chat-header">
        <div className="nova-chat-title">{chat?.title || "New chat"}</div>
      </div>

      {!hasKey && (
        <div className="nova-notice">
          <div>
            <strong>Add your API key to start chatting.</strong>
            <p>
              Nova runs on your own OpenAI-compatible key. Paste it once in Settings and it stays
              saved.
            </p>
          </div>
          <Link href="/settings" className="nova-btn-sm primary">
            Go to Settings
          </Link>
        </div>
      )}

      <div className="nova-messages">
        {messages.length === 0 ? (
          <div className="nova-empty">
            <div className="nova-empty-logo">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
              </svg>
            </div>
            <h1>How can I help you today?</h1>
            <p className="nova-empty-sub">Your personal AI assistant. Chat, remember things, build websites.</p>
            <div className="nova-starters">
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  className="nova-starter"
                  disabled={!hasKey}
                  onClick={() => nova.sendMessage(s.label)}
                >
                  <span className="nova-starter-icon">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageItem
              key={m.id}
              message={m}
              canRegenerate={!nova.streaming && i === messages.length - 1}
              onRegenerate={nova.regenerate}
              onEdit={(t) => nova.editMessage(m.id, t)}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <Composer
        streaming={nova.streaming}
        onStop={nova.stopStreaming}
        onSend={(text, opts) => {
          nova.sendMessage(text, opts);
        }}
        disabled={!hasKey}
      />
    </div>
  );
}
