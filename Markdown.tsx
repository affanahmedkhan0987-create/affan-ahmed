"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { isRTL } from "@/lib/ai";

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="nova-code">
      <div className="nova-code-bar">
        <span className="nova-code-lang">{language || "code"}</span>
        <button type="button" onClick={copy} className="nova-code-copy">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre>
        <code className={language ? `language-${language}` : ""}>{value}</code>
      </pre>
    </div>
  );
}

export default function Markdown({ content, rtl }: { content: string; rtl?: boolean }) {
  const autoRtl = rtl ?? isRTL(content);
  const components = useMemo(
    () => ({
      code(props: any) {
        const { className, children, node, ...rest } = props;
        const match = /language-(\w+)/.exec(className || "");
        const text = String(children).replace(/\n$/, "");
        const isBlock = text.includes("\n") || (className && match);
        if (isBlock) {
          return <CodeBlock language={match?.[1] || ""} value={text} />;
        }
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        );
      },
    }),
    [],
  );

  return (
    <div className={`nova-prose ${autoRtl ? "rtl" : ""}`} dir={autoRtl ? "rtl" : "ltr"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Small hook-free helper to detect RTL for non-markdown text. */
export function useRtl(text: string): boolean {
  const [rtl, setRtl] = useState(false);
  useEffect(() => setRtl(isRTL(text)), [text]);
  return rtl;
}
