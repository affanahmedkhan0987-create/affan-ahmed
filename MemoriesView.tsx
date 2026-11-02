"use client";

import { useState } from "react";
import { useNova } from "@/lib/store";

export default function MemoriesView() {
  const { memories, addMemory, deleteMemory } = useNova();
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    addMemory(text);
    setText("");
  };

  return (
    <div className="nova-page">
      <h1 className="nova-page-title">Memories</h1>
      <p className="nova-muted">
        Nova uses these facts as context in every new chat. Ask Nova to “remember” something, or add
        it here manually.
      </p>

      <section className="nova-card">
        <div className="nova-add-memory">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. My shop is in Karachi and I sell handmade candles."
            rows={2}
          />
          <button className="nova-btn-sm primary" onClick={add}>
            Add memory
          </button>
        </div>
      </section>

      <section className="nova-card">
        <h2>What Nova remembers ({memories.length})</h2>
        {memories.length === 0 ? (
          <p className="nova-muted">No memories yet. Anything you add will appear here.</p>
        ) : (
          <ul className="nova-memory-list">
            {memories.map((m) => (
              <li key={m.id} className="nova-memory">
                <span>{m.content}</span>
                <button title="Delete" onClick={() => deleteMemory(m.id)}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
