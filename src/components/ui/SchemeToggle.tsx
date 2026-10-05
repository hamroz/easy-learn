"use client";

import { useEffect, useState } from "react";

type Scheme = "auto" | "light" | "dark";
const NEXT: Record<Scheme, Scheme> = { auto: "light", light: "dark", dark: "auto" };
const LABEL: Record<Scheme, string> = { auto: "Theme: follow system", light: "Theme: light", dark: "Theme: dark" };

/** Cycles Auto → Light → Dark. Stored per browser; applied to <html data-scheme>. */
export function SchemeToggle({ className = "" }: { className?: string }) {
  const [scheme, setScheme] = useState<Scheme>("auto");

  useEffect(() => {
    const s = document.documentElement.dataset.scheme;
    setScheme(s === "light" || s === "dark" ? s : "auto");
  }, []);

  const toggle = () => {
    const next = NEXT[scheme];
    setScheme(next);
    if (next === "auto") delete document.documentElement.dataset.scheme;
    else document.documentElement.dataset.scheme = next;
    try {
      if (next === "auto") localStorage.removeItem("el-scheme");
      else localStorage.setItem("el-scheme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={LABEL[scheme]}
      aria-label={LABEL[scheme]}
      className={`grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-border/50 hover:text-text ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
        {scheme === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : scheme === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
