"use client";

import { useEffect, useState, type ReactNode } from "react";
import { NovaProvider, useNova } from "@/lib/store";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import InstallButton from "./InstallButton";
import Link from "next/link";

function ShellInner({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { dbConfigured, settings } = useNova();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return (
    <div className="nova-app">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="nova-main">
        <header className="nova-topbar">
          <button className="nova-icon-btn menu" onClick={() => setMenuOpen(true)} title="Menu">
            ☰
          </button>
          <Link href="/" className="nova-topbar-brand">
            Nova AI
          </Link>
          <div className="nova-topbar-right">
            {dbConfigured ? (
              <span className="nova-db-pill ok" title="Database connected">
                ● DB
              </span>
            ) : (
              <span className="nova-db-pill local" title="Using local browser storage">
                ● Local
              </span>
            )}
            <InstallButton />
            <ThemeToggle />
          </div>
        </header>
        <main className="nova-content">{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <NovaProvider>
      <ShellInner>{children}</ShellInner>
    </NovaProvider>
  );
}
