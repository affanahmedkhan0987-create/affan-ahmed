"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import Markdown from "./Markdown";
import BuildCard from "./BuildCard";
import { isRTL, detectLanguage } from "@/lib/ai";
import { speak, stopSpeaking } from "@/lib/speech";

interface Props {
  message: ChatMessage;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
  canRegenerate?: boolean;
}

function SparkLogo() {
  return (
    <span className="nova-avatar" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
      </svg>
    </span>
  );
}

export default function MessageItem({ message, onRegenerate, onEdit, canRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const rtl = isRTL(message.content);
  const lang = detectLanguage(message.content);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const readAloud = () => {
    if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
      stopSpeaking();
    } else {
      speak(message.content, lang);
    }
  };

  if (isUser) {
    return (
      <div className="nova-row user">
        <div className={`nova-bubble user ${rtl ? "rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
          <span className="nova-text">{message.content}</span>
          {message.images?.length ? (
            <div className="nova-imgs">
              {message.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="attachment" className="nova-img-thumb" />
              ))}
            </div>
          ) : null}
          {message.attachments?.length ? (
            <div className="nova-attach-chip">
              📎 {message.attachments.map((a) => a.name).join(", ")}
            </div>
          ) : null}
          {onEdit ? (
            <button className="nova-msg-action" onClick={() => onEdit(message.content)} title="Edit & resend">
              ✏️ Edit
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="nova-row assistant">
      <SparkLogo />
      <div className="nova-assistant-content">
        {message.build ? (
          <BuildCard build={message.build} />
        ) : message.content ? (
          <div className={`nova-bubble assistant ${message.error ? "error" : ""}`}>
            <Markdown content={message.content} rtl={rtl} />
          </div>
        ) : (
          <div className="nova-bubble assistant typing">
            <span className="nova-dot" />
            <span className="nova-dot" />
            <span className="nova-dot" />
          </div>
        )}

        {message.content && !message.build ? (
          <div className="nova-msg-actions">
            <button className="nova-msg-action" onClick={copy}>
              {copied ? "Copied!" : "📋 Copy"}
            </button>
            <button className="nova-msg-action" onClick={readAloud}>
              🔊 Read aloud
            </button>
            {canRegenerate && onRegenerate ? (
              <button className="nova-msg-action" onClick={onRegenerate}>
                ↻ Regenerate
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
