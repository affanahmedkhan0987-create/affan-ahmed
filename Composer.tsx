"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { isVoiceSupported, startVoice, type VoiceController } from "@/lib/speech";
import { useNova } from "@/lib/store";

interface Props {
  onSend: (text: string, opts?: { images?: string[]; attachments?: Attachment[] }) => void;
  streaming: boolean;
  onStop: () => void;
  disabled?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsText(file);
  });
}

// Best-effort PDF text extraction (pulls readable strings from the PDF stream).
function extractPdfText(raw: string): string {
  const chunks: string[] = [];
  const re = /\(([^\\()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    chunks.push(m[1].replace(/\\([nrt()])/g, " ").replace(/\\/g, ""));
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 8000);
}

export default function Composer({ onSend, streaming, onStop, disabled }: Props) {
  const { settings } = useNova();
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceErr, setVoiceErr] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceSupported(isVoiceSupported());
  }, []);
  const voiceRef = useRef<VoiceController | null>(null);

  const voiceLang = settings.language === "ur" ? "ur-PK" : "en-US";

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      if (file.type.startsWith("image/") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
        const url = await fileToDataUrl(file);
        setImages((prev) => [...prev, url]);
      } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
        const txt = await fileToText(file);
        setAttachments((prev) => [...prev, { name: file.name, text: txt, kind: "text" }]);
      } else if (lower.endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        const txt = extractPdfText(new TextDecoder("latin1").decode(new Uint8Array(buf)));
        setAttachments((prev) => [
          ...prev,
          { name: file.name, text: txt || "(No extractable text found in this PDF.)", kind: "pdf" },
        ]);
      } else {
        const txt = await fileToText(file).catch(() => "");
        setAttachments((prev) => [...prev, { name: file.name, text: txt || "", kind: "text" }]);
      }
    }
  };

  const toggleVoice = () => {
    setVoiceErr("");
    if (recording) {
      voiceRef.current?.stop();
      setRecording(false);
      return;
    }
    const ctrl = startVoice(
      voiceLang,
      (t, isFinal) => {
        setText((prev) => (isFinal ? (prev ? prev + " " : "") + t : t));
      },
      () => setRecording(false),
      (msg) => {
        setVoiceErr(msg);
        setRecording(false);
      },
    );
    if (ctrl) setRecording(true);
  };

  const submit = () => {
    const t = text.trim();
    if (!t || streaming || disabled) return;
    onSend(t, { images: images.length ? images : undefined, attachments: attachments.length ? attachments : undefined });
    setText("");
    setImages([]);
    setAttachments([]);
    setVoiceErr("");
  };

  const removeImage = (i: number) => setImages((p) => p.filter((_, idx) => idx !== i));
  const removeAttach = (i: number) => setAttachments((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="nova-composer-wrap">
      {(images.length > 0 || attachments.length > 0) && (
        <div className="nova-composer-chips">
          {images.map((src, i) => (
            <div key={i} className="nova-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="nova-chip-img" />
              <button onClick={() => removeImage(i)}>×</button>
            </div>
          ))}
          {attachments.map((a, i) => (
            <div key={i} className="nova-chip">
              <span>📎 {a.name}</span>
              <button onClick={() => removeAttach(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="nova-composer">
        <input ref={fileRef} type="file" accept="image/*,.txt,.md,.pdf" multiple hidden onChange={(e) => onPickFiles(e.target.files)} />
        <button className="nova-icon-btn" title="Attach file" onClick={() => fileRef.current?.click()} disabled={disabled}>
          +
        </button>

        <textarea
          className="nova-input"
          placeholder="Message Nova…"
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        {voiceSupported && (
          <button
            className={`nova-icon-btn ${recording ? "recording" : ""}`}
            title="Voice input"
            onClick={toggleVoice}
            disabled={disabled}
          >
            🎤
          </button>
        )}

        {streaming ? (
          <button className="nova-send stop" onClick={onStop} title="Stop">
            ■
          </button>
        ) : (
          <button className="nova-send" onClick={submit} disabled={!text.trim() || disabled} title="Send">
            ➤
          </button>
        )}
      </div>
      {voiceErr && <div className="nova-voice-err">{voiceErr}</div>}
    </div>
  );
}
