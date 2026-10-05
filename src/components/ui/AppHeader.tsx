"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { Logo } from "./Logo";
import { SchemeToggle } from "./SchemeToggle";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const [leaving, setLeaving] = useState(false);
  const signOut = async () => {
    setLeaving(true);
    await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
    window.location.href = "/login";
  };
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <Logo />
        {children}
      </div>
      <nav className="flex items-center gap-1 font-ui text-[13px]">
        <Link href="/settings" className="rounded-full px-3 py-2 text-muted transition hover:bg-border/50 hover:text-text">
          Settings
        </Link>
        <button onClick={signOut} disabled={leaving} className="rounded-full px-3 py-2 text-muted transition hover:bg-border/50 hover:text-text">
          Sign out
        </button>
        <SchemeToggle />
      </nav>
    </header>
  );
}
