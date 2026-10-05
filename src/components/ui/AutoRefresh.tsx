"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-render the current server component every `ms` while `enabled` (used while AI work is pending). */
export function AutoRefresh({ enabled, ms = 2000 }: { enabled: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [enabled, ms, router]);
  return null;
}
