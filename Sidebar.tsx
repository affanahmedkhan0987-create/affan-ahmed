"use client";

import { useState } from "react";
import Link from "next/link";
import { useNova } from "@/lib/store";

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nova = useNova();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = nova.chats.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  const startRename = (id: string, title: string) => {
    setRenaming(id);
    setDraft(title);
  };

  const commitRename = (id: string) => {
    nova.renameChat(id, draft);
    setRenaming(null);
  };

  return (
    <>
      {open && <div className="nova-backdrop" onClick={onClose} />}
      <aside className={`nova-sidebar ${open ? "open" : ""}`}>
        <div className="nova-sidebar-head">
          <Link href="/" className="nova-brand" onClick={onClose}>
            <span className="nova-brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
              </svg>
            </span>
            <span className="nova-brand-name">Nova AI</span>
          </Link>
        </div>

        <button className="nova-newchat" onClick={() => { nova.newChat(); onClose(); }}>
          + New chat
        </button>

        <input
          className="nova-search"
          placeholder="Search chats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <nav className="nova-chat-list">
          {filtered.length === 0 && <div className="nova-chat-empty">No chats yet.</div>}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`nova-chat-item ${c.id === nova.currentChatId ? "active" : ""}`}
              onClick={() => { nova.selectChat(c.id); onClose(); }}
            >
              {renaming === c.id ? (
                <input
                  autoFocus
                  className="nova-rename"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(c.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="nova-chat-title">{c.title || "New chat"}</span>
              )}
              <div className="nova-chat-item-actions" onClick={(e) => e.stopPropagation()}>
                <button title="Rename" onClick={() => startRename(c.id, c.title)}>
                  ✏️
                </button>
                <button title="Delete" onClick={() => nova.deleteChat(c.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </nav>

        <div className="nova-sidebar-nav">
          <Link href="/memories" className="nova-navlink" onClick={onClose}>
            🧠 Memories
          </Link>
          <Link href="/settings" className="nova-navlink" onClick={onClose}>
            ⚙️ Settings
          </Link>
          <Link href="/help" className="nova-navlink" onClick={onClose}>
            ❔ Help
          </Link>
        </div>
      </aside>
    </>
  );
}
