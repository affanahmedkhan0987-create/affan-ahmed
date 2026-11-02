"use client";

// Minimal speech utilities. Uses the Web Speech API where available.

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function isVoiceSupported(): boolean {
  return Boolean(getRecognitionCtor());
}

export interface VoiceController {
  stop: () => void;
}

/** Start speech recognition. Calls onTranscript with interim/final text. */
export function startVoice(
  lang: "ur-PK" | "en-US",
  onTranscript: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
  onError?: (msg: string) => void,
): VoiceController | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError?.("Speech recognition is not supported in this browser.");
    return null;
  }
  const rec = new Ctor() as RecognitionLike;
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;

  rec.onresult = (e: any) => {
    let interim = "";
    let final = "";
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) final += res[0].transcript;
      else interim += res[0].transcript;
    }
    if (final) onTranscript(final, true);
    else onTranscript(interim, false);
  };
  rec.onerror = (e: any) => {
    onError?.(e?.error || "voice-error");
  };
  rec.onend = () => onEnd();

  try {
    rec.start();
  } catch {
    onError?.("Could not start microphone.");
    return null;
  }
  return { stop: () => rec.stop() };
}

export function speak(text: string, lang: "ur" | "en"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/[#*`>_~\[\]()]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang === "ur" ? "ur-PK" : "en-US";
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang?.toLowerCase().startsWith(lang === "ur" ? "ur" : "en")) ||
    voices.find((v) => v.lang?.toLowerCase().includes(lang === "ur" ? "ur" : "en"));
  if (preferred) u.voice = preferred;
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
