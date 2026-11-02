"use client";

import Link from "next/link";

export default function HelpView() {
  return (
    <div className="nova-page">
      <h1 className="nova-page-title">Help &amp; About</h1>

      <section className="nova-card">
        <h2>What is Nova AI?</h2>
        <p>
          Nova is your personal AI assistant. Chat with it, attach photos and documents, talk by
          voice, have it remember things about you, and even build small websites with a live
          preview.
        </p>
      </section>

      <section className="nova-card">
        <h2>How do I add my API key?</h2>
        <ol className="nova-steps">
          <li>
            Open <Link href="/settings">Settings → API Keys</Link>.
          </li>
          <li>Paste your OpenAI-compatible key (e.g. from OpenAI, Together, Groq, etc.).</li>
          <li>Keep the Base URL as <code>https://api.openai.com/v1</code> or change it for other providers.</li>
          <li>Set a model (default <code>gpt-4o-mini</code>).</li>
          <li>Click <strong>Test Key</strong> to confirm it works, then <strong>Save</strong>.</li>
        </ol>
        <p className="nova-muted">
          Your key is stored {` `}
          locally and sent only to Nova's own server route, which forwards it to the provider — it is
          never embedded in the page source.
        </p>
      </section>

      <section className="nova-card">
        <h2>How do I install Nova?</h2>
        <ul className="nova-steps">
          <li>Android Chrome: open the menu (⋮) → “Install app”.</li>
          <li>iPhone Safari: tap Share → “Add to Home Screen”.</li>
          <li>Desktop Chrome/Edge: click the install icon in the address bar.</li>
        </ul>
      </section>

      <section className="nova-card">
        <h2>Tips</h2>
        <ul className="nova-steps">
          <li>Say “Remember that my name is Alex” — it shows up on the Memories page.</li>
          <li>Ask “Build a landing page for a bakery” to get a live website preview.</li>
          <li>Follow up with “make the heading red” to edit the same site.</li>
          <li>Write in Urdu script and Nova replies in Urdu, right-to-left.</li>
        </ul>
      </section>
    </div>
  );
}
