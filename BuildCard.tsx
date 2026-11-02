"use client";

import { useState } from "react";
import type { BuildResult } from "@/lib/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BuildCard({ build }: { build: BuildResult }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const download = async () => {
    const { files } = build;
    if (files.length === 1) {
      const file = files[0];
      downloadBlob(new Blob([file.content], { type: "text/html" }), file.name || "index.html");
      return;
    }
    // Multiple files -> zip
    const JSZipMod = await import("jszip");
    const zip = new JSZipMod.default();
    for (const f of files) zip.file(f.name, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "nova-site.zip");
  };

  const copyAll = async () => {
    const text = build.files.map((f) => `<!-- ${f.name} -->\n${f.content}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="nova-build">
      <div className="nova-build-head">
        <span className="nova-build-badge">⚡ Nova build</span>
        <div className="nova-build-actions">
          <button className={view === "preview" ? "seg active" : "seg"} onClick={() => setView("preview")}>
            Preview
          </button>
          <button className={view === "code" ? "seg active" : "seg"} onClick={() => setView("code")}>
            Code
          </button>
          <button className="nova-btn-sm" onClick={copyAll}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="nova-btn-sm primary" onClick={download}>
            ⬇ Download
          </button>
        </div>
      </div>

      {view === "preview" ? (
        <iframe
          className="nova-preview"
          title="Website preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          srcDoc={build.previewHtml}
        />
      ) : (
        <div className="nova-build-code">
          {build.files.map((f) => (
            <div key={f.name} className="nova-build-file">
              <div className="nova-build-file-name">{f.name}</div>
              <pre>
                <code>{f.content}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
